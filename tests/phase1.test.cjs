const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function load(files=['Core.gs','Provider.gs'],extra={}) {
  const c=vm.createContext({...extra,console,Date,JSON,Math});
  for(const file of files) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
  return c;
}
function input(extra={}) {return {address:'123 Example St, Boulder, CO',category:'restaurant',count:50,radius:3000,zips:'80301, 80302',...extra};}
function censusResponse(){return {result:{addressMatches:[{matchedAddress:'123 EXAMPLE ST, BOULDER, CO, 80301',coordinates:{x:-105,y:40}}]}};}
test('free Census geocoder rejects uncertain responses and never uses a Google key',()=>{
 let response=censusResponse(),calls=[],reserved=[];const c=load(undefined,{UrlFetchApp:{fetch:(url)=>{calls.push(url);return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(response)};}}});
 const center=c.censusGeocode('123 Example St, Boulder, CO',kind=>reserved.push(kind));assert.equal(center.latitude,40);assert.equal(center.longitude,-105);assert.ok(calls[0].startsWith('https://geocoding.geo.census.gov/'));assert.ok(!calls[0].includes('key='));assert.deepEqual(reserved,['geocode']);
 for(const matches of [[],[{},{}],[{coordinates:{x:'-105',y:40}}],[{coordinates:{x:-105,y:100}}]]){response={result:{addressMatches:matches}};assert.throws(()=>c.censusGeocode('Address',()=>{}));}
});
function place(n,extra={}) {return {id:'id'+n,displayName:{text:'Business '+n},formattedAddress:n+' Example St, Boulder, CO 80301',addressComponents:[{types:['postal_code'],shortText:'80301'}],nationalPhoneNumber:n%2?'(303) 555-0100':undefined,...extra};}
test('validation rejects invalid counts/radii/address/category/ZIP without coercion surprises',()=>{
  const c=load();
  for(const bad of [{count:0},{count:61},{count:1.5},{radius:NaN},{radius:50001},{address:''},{category:'arbitrary'},{zips:'803'}]) assert.throws(()=>c.validateRequest(input(bad)));
  assert.equal(c.validateRequest(input()).count,50);
});
test('CSV handles BOM, quotes, multiline fields and rejects ambiguous/malformed records',()=>{
 const c=load();
 const rows=c.parseExclusions('\ufeffname,address,reason\r\n"Coffee, Inc","123 Main St","Customer\nactive"');
 assert.equal(rows[0].name,'Coffee, Inc'); assert.equal(rows[0].reason,'Customer\nactive');
 for(const csv of ['name,address\nOnly a name,','name,address\n"broken,street','name,address\na,b,extra']) assert.throws(()=>c.parseExclusions(csv));
 assert.equal(c.parseExclusions('place_id,reason\nid1,current_customer')[0].place_id,'id1');
});
test('bounded paging is 20+20+10; no details, retries or oversampling',()=>{
 const c=load(); const calls=[]; let n=0;
 const out=c.acquireCandidates(c.validateRequest(input()),{geocode:()=>({latitude:40,longitude:-105}),search:b=>{
   calls.push(b); const places=Array.from({length:b.pageSize},()=>place(++n)); return {places,nextPageToken:'p'+calls.length};
 }});
 assert.deepEqual(calls.map(b=>b.pageSize),[20,20,10]);assert.equal(out.rawCount,50);assert.equal(out.searchRequests,3);assert.equal(out.estimatedGrossUsd,.11);
 assert.equal(calls[0].rankPreference,'DISTANCE');assert.equal(calls[0].includePureServiceAreaBusinesses,false);
 assert.equal(calls[1].pageToken,'p1');
});
test('sparse results and repeated tokens stop; hotels do not claim distance ranking',()=>{
 const c=load();let calls=0;
 const deps={geocode:()=>({latitude:40,longitude:-105}),search:()=>{calls++;return {places:[place(calls)],nextPageToken:'same'};}};
 const out=c.acquireCandidates(c.validateRequest(input({category:'hotel'})),deps);
 assert.equal(calls,2);assert.equal(out.ranking,'relevance');assert.equal(out.rawCount,2);
 let hotelBody; c.acquireCandidates(c.validateRequest(input({category:'hotel'})),{geocode:deps.geocode,search:b=>{hotelBody=b;return {places:[]};}});
 assert.equal(hotelBody.rankPreference,undefined);
});
test('filtering keeps missing phones, handles duplicates, ZIPs and exact branch exclusion',()=>{
 const c=load();const ps=[place(1),place(2),place(2),place(3),place(4,{addressComponents:[]})];
 const out=c.filterCandidates(ps,[{name:'Business 1',address:'1 Example St, Boulder, CO 80301'},{name:'Business 3',address:'other address'}],['80301']);
 assert.equal(out.eligible.length,2);assert.equal(out.eligible[0].id,'id2');assert.equal(out.excluded,1);assert.equal(out.duplicates,1);assert.equal(out.filtered,1);
});
test('formula strings stay literal and invalid calendar dates fail',()=>{
 const c=load();assert.equal(c.literalCell('=IMPORTXML("evil")'),'\'=IMPORTXML("evil")');
 for(const date of ['2026-02-30','bad']) assert.throws(()=>c.dateValue(date));
 assert.equal(c.dateValue('2026-10-02'),'2026-10-02');
});
test('Google adapter uses Enterprise-only allowlist and sanitized provider errors',()=>{
 let fetched=[];const c=load(undefined,{UrlFetchApp:{fetch:(url,options)=>{fetched.push({url,options});return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({places:[]})};}}});
 const d=c.googleDependencies('secret',()=>{});d.search({textQuery:'restaurants'});
 const mask=fetched[0].options.headers['X-Goog-FieldMask'];assert.ok(mask.includes('places.nationalPhoneNumber'));assert.ok(mask.includes('places.regularOpeningHours'));assert.ok(!mask.includes('reviews'));assert.ok(!mask.includes('*'));
 const e=load(undefined,{UrlFetchApp:{fetch:()=>({getResponseCode:()=>403,getContentText:()=>'{"key":"secret"}'})}});
 assert.throws(()=>e.googleDependencies('secret',()=>{}).search({}),err=>!err.message.includes('secret')&&err.message.includes('403'));
});
test('industry inclusion and priority fill raw cap without topping up after exclusions',()=>{
 const c=load();const calls=[];
 const out=c.acquireCandidates(c.validateRequest(input({industries:['car_repair','restaurant'],count:25})),{geocode:()=>({latitude:40,longitude:-105}),search:b=>{
 calls.push(b);return {places:Array.from({length:b.includedType==='car_repair'?5:b.pageSize},(_,i)=>place(calls.length*100+i))};}});
 assert.deepEqual(calls.map(b=>b.includedType),['car_repair','restaurant']);assert.deepEqual(calls.map(b=>b.pageSize),[20,20]);assert.equal(out.rawCount,25);
 assert.throws(()=>c.validateRequest(input({industries:[]})));assert.throws(()=>c.validateRequest(input({industries:['restaurant','restaurant']})));
});
function services(email='rep@example.com') {
 const sheets={},props={ALLOWED_EMAILS:'rep@example.com',SPREADSHEET_ID:'sheet',GOOGLE_MAPS_API_KEY:'secret',PRIVACY_URL:'https://example.com/privacy',TERMS_URL:'https://example.com/terms'};let locked=false,fetchCount=0,flushedUnderLock=false;
 const spreadsheet={getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]={rows:[],maxRows:1000,maxColumns:26,getMaxRows(){return this.maxRows;},getMaxColumns(){return this.maxColumns;},insertRowsAfter(after,count){this.maxRows+=count;},insertColumnsAfter(after,count){this.maxColumns+=count;},getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));},getLastRow(){return this.rows.length;},getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},getRange(r,col,nr,nc){const s=this;if(r+nr-1>s.maxRows||col+nc-1>s.maxColumns)throw new Error('Range exceeds grid limits');return {getValues(){return Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>s.rows[r-1+i]?.[col-1+j]??''));},setNumberFormat(){return this;},setValues(values){values.forEach((v,i)=>{s.rows[r-1+i]=v.map(x=>typeof x==='string'&&x[0]==="'"?x.slice(1):x);});return this;},clearContent(){for(let i=r-1;i<r-1+nr;i++)s.rows[i]=Array(nc).fill('');return this;}};},setFrozenRows(){}}};
 const propertyStore={getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=String(v);},getProperties:()=>({...props})};
 const extra={PropertiesService:{getScriptProperties:()=>propertyStore},Session:{getActiveUser:()=>({getEmail:()=>email})},SpreadsheetApp:{openById:()=>spreadsheet,flush:()=>{flushedUnderLock=locked;}},Utilities:{getUuid:()=>require('node:crypto').randomUUID(),formatDate:()=> '2026-10-02'},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},UrlFetchApp:{fetch:url=>{fetchCount++;return {getResponseCode:()=>200,getContentText:()=>url.includes('geocoding.geo.census.gov')?JSON.stringify(censusResponse()):url.includes('geocode')?JSON.stringify({status:'OK',results:[{geometry:{location:{lat:40,lng:-105}}}]}):JSON.stringify({places:[place(1)]})};}}};
 const c=load(['Core.gs','Provider.gs','Catalog.gs','Code.gs'],extra);
 if(fs.existsSync(path.join(root,'Apify.gs')))vm.runInContext(fs.readFileSync(path.join(root,'Apify.gs'),'utf8'),c);
 const cache={};c.CacheService={getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})};
 return {c,sheets,props,get locked(){return locked;},get fetchCount(){return fetchCount;},get flushedUnderLock(){return flushedUnderLock;}};
}
function apifyTransport(s,batches){
 s.props.APIFY_TOKEN='private-token';s.props.DAILY_APIFY_RUN_LIMIT='20';let starts=0,reads=0;const requests=[];
 s.c.UrlFetchApp.fetch=(url,options={})=>{requests.push({url,options});let data;
 if(url.includes('geocoding.geo.census.gov'))data=censusResponse();
 else if(url.includes('geocode'))data={status:'OK',results:[{geometry:{location:{lat:40,lng:-105}}}]};
 else if(url.includes('/actors/')){starts++;data={data:{id:'run'+starts}};}
 else if(url.includes('/actor-runs/'))data={data:{id:'run'+starts,status:'SUCCEEDED',defaultDatasetId:'dataset'+starts}};
 else{reads++;data=batches[starts-1]||[];}
 return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(data)};};
 return {requests,get starts(){return starts;},get reads(){return reads;}};
}
function apifyItem(n){return {placeId:'ChIJfixture'+n,title:'Fixture '+n,address:n+' Example St, Boulder, CO 80301',postalCode:'80301',countryCode:'US',phoneUnformatted:'+13035550100',location:{lat:40,lng:-105}};}
test('ambiguous Apify start failure shows fallback and blocks a second paid start until operator recovery',()=>{
 const s=services();s.props.APIFY_TOKEN='private-token';let starts=0;const original=s.c.UrlFetchApp.fetch;s.c.UrlFetchApp.fetch=(url,o)=>{if(url.includes('/actors/')){starts++;throw new Error('private-token');}return original(url,o);};
 const out=s.c.startApifySearch(input({count:1}));assert.equal(out.startUncertain,true);assert.ok(!out.fallbackReason.includes('private-token'));assert.equal(starts,1);assert.throws(()=>s.c.startApifySearch(input({count:1})),/unknown outcome/i);assert.equal(starts,1);
});
test('failed actor retains its usable paid partial dataset and stops instead of starting another industry',()=>{
 const s=services(),t=apifyTransport(s,[[apifyItem(1)]]),pending=s.c.startApifySearch(input({count:3,industries:['restaurant','car_repair']})),original=s.c.UrlFetchApp.fetch;
 s.c.UrlFetchApp.fetch=(url,o)=>url.includes('/actor-runs/')?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({data:{status:'FAILED',defaultDatasetId:'dataset1'}})}:original(url,o);
 const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.eligible.length,1);assert.equal(out.provider,'apify');assert.equal(s.c.records_('ApifyBusinesses').length,1);assert.equal(t.starts,1);assert.match(out.fallbackReason,/FAILED/);
});
test('cached Apify search checks the latest local Overture backup for a missing phone without another scrape',()=>{
 const s=services(),t=apifyTransport(s,[[{...apifyItem(1),phoneUnformatted:''}]]),pending=s.c.startApifySearch(input({count:1}));assert.equal(s.c.pollApifySearch(pending.jobId).eligible[0].nationalPhoneNumber,'');
 const p={id:'overture:phone-backup',name:'Fixture 1',address:'1 Example St, Boulder, CO 80301',phone:'+13035550199',website:'',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 s.c.importCatalog(JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:[p]}));s.props.DAILY_APIFY_RUN_LIMIT='0';const cached=s.c.startApifySearch(input({count:1}));assert.equal(cached.cacheHit,true);assert.equal(cached.eligible[0].nationalPhoneNumber,p.phone);assert.equal(cached.eligible[0].phoneSource,p.id);assert.equal(t.starts,1);
});
test('resuming an ingested-run checkpoint starts the next industry without reading the previous dataset again',()=>{
 const s=services(),t=apifyTransport(s,[[apifyItem(1)],[apifyItem(2)]]),pending=s.c.startApifySearch(input({count:3,industries:['car_repair','restaurant']}));
 const state=JSON.parse(s.props.APIFY_SEARCH);s.c.writeRecords_('ApifyBusinesses',[s.c.normalizeApifyPlace_(apifyItem(1),'car_repair',[])]);state.index=1;state.rawCount=1;state.ids=['apify:ChIJfixture1'];state.stage='advance';s.props.APIFY_SEARCH=JSON.stringify(state);
 const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.pending,true);assert.equal(t.starts,2);assert.equal(t.reads,0);assert.equal(JSON.parse(s.props.APIFY_SEARCH).rawCount,1);
});
test('Apify is asynchronous, preserves excluded candidates, reuses stored results and repeated polls do not restart runs',()=>{
 const s=services(),t=apifyTransport(s,[[apifyItem(1),apifyItem(2)]]);s.c.importExclusions('place_id,name,address\nChIJfixture1,,');
 const pending=s.c.startApifySearch(input({count:2}));assert.equal(pending.pending,true);assert.equal(t.starts,1);
 assert.equal(s.c.startApifySearch(input({count:2})).jobId,pending.jobId);assert.equal(t.starts,1);
 const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.eligible.length,1);assert.equal(out.excluded,1);assert.equal(s.c.records_('ApifyBusinesses').length,2);
 s.c.pollApifySearch(pending.jobId);assert.equal(t.starts,1);assert.equal(t.reads,1);
 const reused=s.c.startApifySearch(input({count:2}));assert.equal(reused.cacheHit,true);assert.equal(t.starts,1);
 const p=s.c.records_('ApifyBusinesses')[0];assert.equal(p.license,'rights-unverified');assert.equal(p.phone_source,'apify');
});
test('sparse Apify industries request remaining raw count, divide the batch budget and never top up exclusions',()=>{
 const s=services(),t=apifyTransport(s,[[apifyItem(1)],[apifyItem(2),apifyItem(3)]]);
 const pending=s.c.startApifySearch(input({count:3,industries:['car_repair','restaurant']}));const mid=s.c.pollApifySearch(pending.jobId);assert.equal(mid.pending,true);assert.equal(t.starts,2);
 const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.rawCount,3);assert.equal(out.searchRequests,2);assert.equal(out.costCeilingUsd,.75);
 const starts=t.requests.filter(x=>x.url.includes('/actors/'));assert.deepEqual(starts.map(x=>JSON.parse(x.options.payload).maxCrawledPlacesPerSearch),[3,2]);assert.ok(starts.every(x=>x.url.includes('maxTotalChargeUsd=0.375')));
});
test('Apify failure returns local licensed fallback with no paid retry; zero daily quota and unauthorized calls make no requests',()=>{
 const s=services(),t=apifyTransport(s,[]);const p={id:'overture:fallback',name:'Licensed fixture',address:'1 Example St, Boulder, CO 80301',phone:'+13035550100',website:'',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 s.c.importCatalog(JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:[p]}));const pending=s.c.startApifySearch(input({count:1}));const original=s.c.UrlFetchApp.fetch;s.c.UrlFetchApp.fetch=(url,o)=>url.includes('/actor-runs/')?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({data:{status:'FAILED'}})}:original(url,o);
 const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.provider,'overture');assert.ok(out.fallbackReason);assert.equal(t.starts,1);
 const z=services();z.props.APIFY_TOKEN='token';z.props.DAILY_APIFY_RUN_LIMIT='0';assert.throws(()=>z.c.startApifySearch(input()),/daily/i);assert.equal(z.fetchCount,0);
 const a=services('intruder@example.com');assert.throws(()=>a.c.startApifySearch(input()),/denied/i);assert.throws(()=>a.c.pollApifySearch('x'),/denied/i);assert.equal(a.fetchCount,0);
});
test('unauthorized service access makes no network requests or writes',()=>{
 const s=services('intruder@example.com');assert.throws(()=>s.c.generateLeads(input()));assert.throws(()=>s.c.getCRM());assert.throws(()=>s.c.saveLead({business_name:'X'}));assert.equal(s.fetchCount,0);assert.equal(Object.keys(s.sheets).length,0);
});
test('Apify and Overture address searches need no Google credential or policy URLs, and failed geocoding starts no paid actor',()=>{
 const s=services();s.props.GOOGLE_MAPS_API_KEY='';s.props.PRIVACY_URL='';s.props.TERMS_URL='';const t=apifyTransport(s,[[apifyItem(1)]]);const pending=s.c.startApifySearch(input({count:1,industries:['restaurant']}));const out=s.c.pollApifySearch(pending.jobId);assert.equal(out.eligible.length,1);assert.equal(out.costCeilingUsd,.75);assert.ok(t.requests.every(r=>!r.url.includes('googleapis.com')));
 const a=services();a.props.APIFY_TOKEN='token';let paid=0;a.c.UrlFetchApp.fetch=url=>{if(url.includes('api.apify.com'))paid++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({result:{addressMatches:[]}})};};assert.throws(()=>a.c.startApifySearch(input({count:1})),/clear U.S./);assert.equal(paid,0);
 const c=services();c.props.GOOGLE_MAPS_API_KEY='';c.props.PRIVACY_URL='';c.props.TERMS_URL='';const p={id:'overture:free',name:'Free lookup fixture',address:'123 Example St, Boulder, CO 80301',phone:'+13035550100',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};c.c.importCatalog(JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:[p]}));assert.equal(c.c.generateCatalogLeads(input({count:1})).estimatedGrossUsd,0);
});
test('editor setup entry point rejects unauthorized callers before creating properties or tables',()=>{
 const s=services('intruder@example.com');s.c.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=> 'sheet'});const before=JSON.stringify(s.props);assert.throws(()=>s.c.setupCRM(),/denied/i);assert.equal(JSON.stringify(s.props),before);assert.equal(Object.keys(s.sheets).length,0);
 const a=services();a.c.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=> 'sheet'});a.c.setupCRM();assert.equal(Object.keys(a.sheets).length,5);assert.equal(a.fetchCount,0);
});
test('editor property initialization adds blank credential names and safe pilot defaults without replacing existing settings',()=>{
 const s=services();s.c.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=> 'sheet'});delete s.props.ALLOWED_EMAILS;delete s.props.GOOGLE_MAPS_API_KEY;
 s.c.initializeProperties_();assert.equal(s.props.ALLOWED_EMAILS,'rep@example.com');assert.equal(s.props.APIFY_TOKEN,'');assert.equal(s.props.GOOGLE_MAPS_API_KEY,'');assert.equal(s.props.DAILY_APIFY_RUN_LIMIT,'1');assert.equal(s.props.DAILY_SEARCH_LIMIT,'0');assert.equal(s.props.DAILY_GEOCODE_LIMIT,'3');
 s.props.APIFY_TOKEN='existing-private-token';s.props.DAILY_APIFY_RUN_LIMIT='4';s.props.ALLOWED_EMAILS='';s.c.initializeProperties_();assert.equal(s.props.APIFY_TOKEN,'existing-private-token');assert.equal(s.props.DAILY_APIFY_RUN_LIMIT,'4');assert.equal(s.props.ALLOWED_EMAILS,'');
 assert.ok(!JSON.stringify(s.c.initializeProperties_()).includes('existing-private-token'));assert.equal(s.fetchCount,0);
});
test('property initialization requires a signed-in bound Sheet context before writing anything',()=>{
 const s=services();s.c.SpreadsheetApp.getActiveSpreadsheet=()=>null;const before=JSON.stringify(s.props);assert.throws(()=>s.c.initializeProperties_(),/Sheet/i);assert.equal(JSON.stringify(s.props),before);
 const a=services('');a.c.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=> 'sheet'});const other=JSON.stringify(a.props);assert.throws(()=>a.c.initializeProperties_(),/sign/i);assert.equal(JSON.stringify(a.props),other);
});
test('UI credential placeholders are never considered configured and are cleared by editor initialization',()=>{
 const s=services();s.props.APIFY_TOKEN='NOT_CONFIGURED';s.props.GOOGLE_MAPS_API_KEY='NOT_CONFIGURED';assert.equal(s.c.getBootstrap().configured,false);assert.equal(s.c.getBootstrap().apifyConfigured,false);
 assert.throws(()=>s.c.startApifySearch(input()),/APIFY_TOKEN/);assert.throws(()=>s.c.generateLeads(input()),/key/i);assert.equal(s.fetchCount,0);
 s.c.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=> 'sheet'});s.c.initializeProperties_();assert.equal(s.props.APIFY_TOKEN,'');assert.equal(s.props.GOOGLE_MAPS_API_KEY,'');
});
test('CRM saves only rep-entered fields and preserves activity history on archive/restore',()=>{
 const s=services();const lead=s.c.saveLead({business_name:'My own label',place_id:'id1',status:'prospect',follow_up:'2026-10-02',displayName:{text:'Forbidden'},nationalPhoneNumber:'Forbidden'});
 const a={lead_id:lead.id,type:'OSV',date:'2026-10-01',notes:'Card left; owner away',request_id:'token-1'};
 s.c.logActivity(a);s.c.logActivity(a);assert.equal(s.c.getCRM().activities.length,1);
 const archived=s.c.saveLead({...lead,status:'archived',expected_updated_at:lead.updated_at});assert.equal(s.c.getCRM().leads[0].due_bucket,'none');
 const r=s.c.generateLeads(input({count:1}));assert.equal(r.excluded,1);assert.equal(r.eligible.length,0);
 s.c.saveLead({...archived,status:'prospect',expected_updated_at:archived.updated_at});assert.equal(s.c.getCRM().leads[0].due_bucket,'today');assert.equal(s.c.getCRM().activities.length,1);
 assert.ok(!JSON.stringify(s.sheets).includes('Forbidden'));
 assert.throws(()=>s.c.saveLead({...lead,id:'unknown'}));assert.throws(()=>s.c.logActivity({...a,lead_id:'unknown'}));
});
test('invalid import keeps old data; duplicate imports merge and strings are literal',()=>{
 const s=services();s.c.importExclusions('place_id,name,address,reason\nid1,=evil,,customer');s.c.importExclusions('place_id,name,address,reason\nid1,=evil,,customer');
 assert.equal(s.sheets.Exclusions.rows.length,2);assert.throws(()=>s.c.importExclusions('name,address\nmissing,'));assert.equal(s.sheets.Exclusions.rows.length,2);
 const p=s.c.saveLead({business_name:'=IMPORTXML("evil")'});assert.equal(p.business_name,'=IMPORTXML("evil")');
});
test('quota exhaustion and provider errors release locks; no secret disclosure',()=>{
 const s=services();s.props.DAILY_SEARCH_LIMIT='0';assert.throws(()=>s.c.generateLeads(input()),/daily/i);assert.equal(s.fetchCount,0);assert.equal(s.locked,false);
 const f=services();f.c.UrlFetchApp.fetch=()=>{throw new Error('secret provider detail');};assert.throws(()=>f.c.generateLeads(input()),e=>!e.message.includes('secret'));assert.equal(f.locked,false);
});
test('industry preferences persist ordered inclusion and reject unknown or duplicate IDs',()=>{
 const s=services();const order=[{id:'car_repair',included:true},...s.c.INDUSTRIES.filter(x=>x.id!=='car_repair').map(x=>({id:x.id,included:false}))];
 s.c.saveIndustryPreferences(order);assert.equal(s.c.getBootstrap().industries[0].id,'car_repair');assert.equal(s.c.getBootstrap().industries[1].included,false);
 assert.throws(()=>s.c.saveIndustryPreferences([{id:'bogus',included:true}]));
});
test('responsive UI has industry reorder and CRM interfaces without unsafe persistence/rendering',()=>{
 const html=fs.readFileSync(path.join(root,'Index.html'),'utf8');
 for(const name of ['generateLeads','saveIndustryPreferences','saveLead','logActivity','getCRM','importExclusions'])assert.ok(html.includes(name),name);
 assert.ok(html.includes('pointerdown'));assert.ok(html.includes('viewport'));assert.ok(html.includes('textContent'));
 assert.ok(!/localStorage|sessionStorage|\.innerHTML\s*=/.test(html));
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];scripts.forEach(x=>new vm.Script(x[1]));
});
test('Sheet mutations flush while locked; flush failure still releases lock',()=>{
 const s=services();s.c.saveLead({business_name:'X'});assert.equal(s.flushedUnderLock,true);assert.equal(s.locked,false);
 s.c.SpreadsheetApp.flush=()=>{throw new Error('flush failed');};assert.throws(()=>s.c.saveLead({business_name:'Y'}));assert.equal(s.locked,false);
});
test('duplicate place IDs cannot fragment CRM history; missing public policy setup blocks lookup',()=>{
 const s=services();s.c.saveLead({business_name:'First',place_id:'id1'});assert.throws(()=>s.c.saveLead({business_name:'Second',place_id:'id1'}),/already/);assert.equal(s.c.getCRM().leads.length,1);
 delete s.props.PRIVACY_URL;assert.throws(()=>s.c.generateLeads(input()),/policy/i);assert.equal(s.fetchCount,0);
});

test('licensed catalog import persists provenance and search uses only one geocode, no Places lookup',()=>{
 const s=services();const p={id:'overture:fixture',name:'Fictional Coffee',address:'1 Example St, Boulder, CO, 80301',phone:'+13035550100',website:'https://example.com',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 const pack=JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:[p]});
 s.c.importCatalog(pack);s.props.DAILY_SEARCH_LIMIT='0';
 const out=s.c.generateCatalogLeads(input({count:1}));assert.equal(out.eligible[0].id,p.id);assert.equal(out.eligible[0].nationalPhoneNumber,p.phone);assert.equal(out.searchRequests,0);assert.equal(s.fetchCount,1);
 assert.ok(JSON.stringify(s.sheets.Catalog).includes('CDLA-Permissive-2.0'));
 s.c.saveLead({business_name:p.name,place_id:p.id,phone:p.phone});s.c.importCatalog(pack);assert.equal(s.c.getCRM().leads[0].phone,p.phone);
 assert.throws(()=>s.c.importCatalog(pack.replace('overture','google')));assert.equal(s.c.getCRM().leads.length,1);
});

test('catalog imports expand the real Sheet grid and smaller refreshes remove trailing candidates',()=>{
 const s=services();const p={id:'overture:fixture',name:'Fictional Coffee',address:'1 Example St, Boulder, CO, 80301',phone:'+13035550100',website:'',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 const pack=ps=>JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:ps});
 s.c.importCatalog(pack(Array.from({length:1200},(_,i)=>({...p,id:'overture:fixture-'+i}))));assert.equal(s.c.records_('Catalog').length,1200);assert.ok(s.sheets.Catalog.maxRows>=1201);
 s.c.importCatalog(pack([p]));assert.equal(s.c.records_('Catalog').length,1);
 const saved=s.c.saveLead({business_name:'Own business'});s.c.importCatalog(pack([p]));assert.equal(s.c.getCRM().leads[0].id,saved.id);
});
test('activity append expands a full Sheet grid before writing the next history record',()=>{
 const s=services();const lead=s.c.saveLead({business_name:'Own business'});const sheet=s.c.sheet_('Activities');sheet.maxRows=1;
 s.c.logActivity({lead_id:lead.id,type:'call',date:'2026-10-02',notes:'Called',request_id:'grid-test'});assert.equal(s.c.getCRM().activities.length,1);assert.equal(sheet.maxRows,2);
});
test('stale whole-record saves cannot overwrite a newer phone or status',()=>{
 const s=services();const lead=s.c.saveLead({business_name:'First',phone:'1111111111'});
 const updated=s.c.saveLead({...lead,phone:'2222222222',status:'archived',expected_updated_at:lead.updated_at});
 assert.throws(()=>s.c.saveLead({...lead,next_plan:'Stale desktop plan',expected_updated_at:lead.updated_at}),/changed|refresh/i);
 assert.throws(()=>s.c.saveLead({...updated,next_plan:'Missing version'}),/changed|refresh/i);
 const stored=s.c.getCRM().leads[0];assert.equal(stored.phone,'2222222222');assert.equal(stored.status,'archived');
});
test('every accepted save advances the version even when the clock stays still',()=>{
 const s=services();const RealDate=Date;s.c.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-02T12:00:00.000Z']));}};
 const lead=s.c.saveLead({business_name:'Clock test'});
 const next=s.c.saveLead({...lead,expected_updated_at:lead.updated_at});
 assert.ok(next.updated_at>lead.updated_at);
 const third=s.c.saveLead({...next,expected_updated_at:next.updated_at});assert.ok(third.updated_at>next.updated_at);
});
test('editing a place ID cannot merge separate CRM histories',()=>{
 const s=services();s.c.saveLead({business_name:'First',place_id:'id1'});const second=s.c.saveLead({business_name:'Second',place_id:'id2'});
 assert.throws(()=>s.c.saveLead({...second,place_id:'id1',expected_updated_at:second.updated_at}),/already/);
 assert.equal(s.c.getCRM().leads.find(x=>x.id===second.id).place_id,'id2');
});
test('last daily search request returns its paid partial page without another call',()=>{
 const s=services();s.props.DAILY_SEARCH_LIMIT='1';
 s.c.UrlFetchApp.fetch=url=>({getResponseCode:()=>200,getContentText:()=>url.includes('geocoding.geo.census.gov')?JSON.stringify(censusResponse()):url.includes('geocode')?JSON.stringify({status:'OK',results:[{geometry:{location:{lat:40,lng:-105}}}]}):JSON.stringify({places:[place(1)],nextPageToken:'more'})});
 const out=s.c.generateLeads(input({count:50}));assert.equal(out.rawCount,1);assert.equal(out.eligible.length,1);assert.equal(out.searchRequests,1);assert.equal(out.budgetCapReached,true);
 assert.equal(JSON.parse(s.props.DAILY_USAGE).search,1);
});

test('initial state skips activity history and authorizes before reading private data',()=>{
 const s=services();s.c.getBootstrap();let historyReads=0;const original=s.sheets.Activities?.getDataRange;
 if(!s.sheets.Activities)s.c.sheet_('Activities');
 s.sheets.Activities.getDataRange=()=>{historyReads++;return {getValues:()=>s.sheets.Activities.rows};};
 const out=s.c.getInitialState();assert.equal(out.crm.activities.length,0);assert.equal(historyReads,0);assert.ok(out.boot.industries.length);assert.ok(!JSON.stringify(out).includes('secret'));
 const denied=services('intruder@example.com');assert.throws(()=>denied.c.getInitialState(),/denied/i);assert.equal(Object.keys(denied.sheets).length,0);
});
test('embedded startup JSON cannot break out of its script element and retains literal replacement tokens',()=>{
 const s=services();const value={name:'</script><script>alert(1)</script> & $&',separator:'\u2028'};
 const encoded=s.c.initialJSON_(value);assert.ok(!encoded.includes('<'));assert.ok(!encoded.includes('&'));assert.deepEqual(JSON.parse(encoded),value);
});
test('lazy history returns only the selected business and fresh writes',()=>{
 const s=services();const a=s.c.saveLead({business_name:'A',status:'prospect'}),b=s.c.saveLead({business_name:'B',status:'prospect'});
 s.c.logActivity({lead_id:a.id,type:'call',date:'2026-10-02',notes:'Called A',request_id:'a'});
 s.c.logActivity({lead_id:b.id,type:'call',date:'2026-10-02',notes:'Called B',request_id:'b'});
 assert.equal(s.c.getCRM(false).activities.length,0);assert.equal(s.c.getCRM().activities.length,2);
 assert.equal(s.c.getLeadActivities(a.id).length,1);assert.equal(s.c.getLeadActivities(a.id)[0].notes,'Called A');
 assert.throws(()=>s.c.getLeadActivities('missing'),/existing/i);
});

test('startup opens its Sheet once, reads CRM once and uses bounded count ranges and never flushes read-only requests',()=>{
 const s=services();s.c.getInitialState();s.c.spreadsheetBinding_=undefined;let opens=0,flushes=0;const original=s.c.SpreadsheetApp.openById;s.c.SpreadsheetApp.openById=id=>{opens++;return original(id);};s.c.SpreadsheetApp.flush=()=>flushes++;
 const reads={};for(const name of ['CRM','Catalog','Exclusions']){const sheet=s.sheets[name];sheet.getDataRange=()=>{reads[name]=(reads[name]||0)+1;return {getValues:()=>sheet.rows.map(r=>r.slice())};};}
 s.c.getInitialState();assert.equal(opens,1);assert.equal(flushes,0);assert.deepEqual(reads,{CRM:1});
 s.sheets.CRM.rows[0][0]='changed';assert.throws(()=>s.c.getInitialState(),/headers/i);
});
test('page embeds private startup only after authorization and preserves literal dollar sequences',()=>{
 const s=services();s.props.PRIVACY_URL='https://example.com/$&';let content='';s.c.HtmlService={createHtmlOutputFromFile:()=>({getContent:()=>'<script>var fieldbookInitialState="__FIELDBOOK_INITIAL_STATE__";</script>'}),createHtmlOutput:html=>{content=html;return {setTitle(){return this;},addMetaTag(){return this;}};}};
 s.c.doGet();const serialized=content.match(/var fieldbookInitialState=(.*?);<\/script>/)[1];assert.equal(JSON.parse(serialized).boot.privacyUrl,'https://example.com/$&');assert.ok(!content.includes('__FIELDBOOK_INITIAL_STATE__'));
 const denied=services('intruder@example.com');denied.c.HtmlService=s.c.HtmlService;assert.throws(()=>denied.c.doGet(),/denied/i);
});

test('saving one business writes one physical row and preserves blank rows and other businesses',()=>{
 const s=services(),a=s.c.saveLead({business_name:'A'}),b=s.c.saveLead({business_name:'B'}),sheet=s.sheets.CRM;
 sheet.rows.splice(2,0,Array(s.c.TABLES_.CRM.length).fill(''));const before=sheet.rows.map(r=>r.slice()),writes=[],original=sheet.getRange;
 sheet.getRange=function(r,c,nr,nc){const range=original.call(this,r,c,nr,nc),set=range.setValues;range.setValues=function(rows){writes.push({row:r,count:nr});return set.call(this,rows);};return range;};
 const saved=s.c.saveLead({...b,phone:'303-555-0100',follow_up:'2026-10-02',expected_updated_at:b.updated_at});
 assert.deepEqual(writes,[{row:4,count:1}]);assert.deepEqual(sheet.rows[1],before[1]);assert.deepEqual(sheet.rows[2],before[2]);assert.equal(sheet.rows[3][0],b.id);assert.equal(saved.due_bucket,'today');
 const created=s.c.saveLead({business_name:'C',request_id:'one-create',status:'prospect',follow_up:'2026-10-01'});assert.equal(s.c.saveLead({business_name:'C',request_id:'one-create'}).due_bucket,'overdue');assert.equal(s.c.records_('CRM').length,3);assert.equal(created.due_bucket,'overdue');
});
test('saving reads the full CRM once; header validation stays bounded and detects extra columns',()=>{
 const s=services(),a=s.c.saveLead({business_name:'A'}),sheet=s.sheets.CRM;let fullReads=0;const original=sheet.getDataRange;sheet.getDataRange=function(){fullReads++;return original.call(this);};
 s.c.saveLead({...a,phone:'303-555-0101',expected_updated_at:a.updated_at});assert.equal(fullReads,1);
 sheet.rows[0].push('unexpected');assert.throws(()=>s.c.sheet_('CRM'),/headers/i);
});

test('bootstrap counts valid catalog IDs and exclusion rows with narrow reads, including gaps',()=>{
 const s=services();s.c.getBootstrap();const catalog=s.sheets.Catalog,excluded=s.sheets.Exclusions;
 catalog.rows.push(['overture:one',...Array(15).fill('')],Array(16).fill(''),['overture:two',...Array(15).fill('')]);excluded.rows.push(['','A','1 Main',''],Array(4).fill(''),['id','','','']);
 catalog.getDataRange=excluded.getDataRange=()=>{throw new Error('Full count read');};const out=s.c.getBootstrap();assert.equal(out.catalogCount,2);assert.equal(out.exclusionCount,2);
});
