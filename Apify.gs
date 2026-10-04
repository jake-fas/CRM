// Minimal durable business facts; source rights are not implied by technical storage.
var APIFY_HEADERS = ['id','name','address','phone','latitude','longitude','industry','zip','source','license','retrieved_at','phone_source','phone_observed_at','operating_status'];
function publicPhone_(value){var p=String(value||'').trim();return /^[+()\d .-]{7,40}$/.test(p)&&p.replace(/\D/g,'').length>=7?p:'';}
function normalizeApifyPlace_(p,industry,overture){
 if(!p||p.permanentlyClosed||p.countryCode&&p.countryCode!=='US')return null;
 var loc=p.location||{},zip=String(p.postalCode||'').trim().slice(0,5),id=String(p.placeId||'');
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(id)||!p.title||!p.address||!/^\d{5}$/.test(zip)||typeof loc.lat!=='number'||typeof loc.lng!=='number'||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)||Math.abs(loc.lat)>90||Math.abs(loc.lng)>180)return null;
 var now=new Date().toISOString(),x={id:'apify:'+id,name:String(p.title).trim().slice(0,500),address:String(p.address).trim().slice(0,500),phone:publicPhone_(p.phoneUnformatted)||publicPhone_(p.phone),latitude:loc.lat,longitude:loc.lng,industry:industry,zip:zip,source:'apify',license:'rights-unverified',retrieved_at:now,phone_source:'apify',phone_observed_at:now,operating_status:p.temporarilyClosed?'temporarily_closed':'open'};
 if(!x.name||!x.address)return null;
 fillOverturePhone_(x,overture);return x;
}
function fillOverturePhone_(x,overture){
 if(!x.phone){
  var matches=overture.filter(function(o){return o.operating_status!=='permanently_closed'&&normalized(o.name)===normalized(x.name)&&normalized(o.address)===normalized(x.address)&&o.zip===x.zip&&publicPhone_(o.phone)&&distanceMeters_(x,{latitude:Number(o.latitude),longitude:Number(o.longitude)})<=50;});
  if(matches.length===1){x.phone=publicPhone_(matches[0].phone);x.phone_source=matches[0].id;x.phone_observed_at=matches[0].retrieved_at||'';}
 }
 if(!x.phone){x.phone_source='';x.phone_observed_at='';}return x;
}
function apifyActorInput_(settings,center,index,remaining){
 return {searchStringsArray:[INDUSTRIES.find(function(x){return x.id===settings.industries[index];}).label],customGeolocation:{type:'Point',coordinates:[center.longitude,center.latitude],radiusKm:settings.radius/1000},maxCrawledPlacesPerSearch:remaining,language:'en',scrapePlaceDetailPage:false,scrapeContacts:false,maxReviews:0,maxImages:0,maxQuestions:0};
}
function apifyRequest_(token,path,method,body){
 var response;try{response=UrlFetchApp.fetch('https://api.apify.com/v2/'+path,{method:method||'get',headers:{Authorization:'Bearer '+token},contentType:'application/json',payload:body===undefined?undefined:JSON.stringify(body),muteHttpExceptions:true});}catch(e){throw new Error('Apify network request failed. No automatic retry was sent.');}
 var status=response.getResponseCode();if(status<200||status>=300){var error=new Error('Apify request failed (HTTP '+status+'). Check account credits and actor access.');error.apifyRejected=status>=400&&status<500&&status!==408;throw error;}
 try{return JSON.parse(response.getContentText());}catch(e){throw new Error('Apify returned an invalid response.');}
}
function apifyBudget_(reserve){
 var props=PropertiesService.getScriptProperties(),day=today_(),usage=JSON.parse(props.getProperty('APIFY_DAILY_USAGE')||'{}'),limit=Number(props.getProperty('DAILY_APIFY_RUN_LIMIT')===null?6:props.getProperty('DAILY_APIFY_RUN_LIMIT'));
 if(!Number.isInteger(limit)||limit<0||limit>60)throw new Error('Invalid DAILY_APIFY_RUN_LIMIT (0–60).');
 if(usage.day!==day)usage={day:day,runs:0};if(usage.runs>=limit)throw new Error('Daily Apify run limit reached. No new scrape was sent.');
 if(reserve){usage.runs++;props.setProperty('APIFY_DAILY_USAGE',JSON.stringify(usage));}return limit-usage.runs;
}
function apifyState_(){var raw=PropertiesService.getScriptProperties().getProperty('APIFY_SEARCH');return raw?JSON.parse(raw):null;}
function saveApifyState_(state){PropertiesService.getScriptProperties().setProperty('APIFY_SEARCH',JSON.stringify(state));}
function apifyPending_(state){var industry=INDUSTRIES.find(function(x){return x.id===state.settings.industries[state.index];});return {pending:true,jobId:state.id,industry:industry?industry.label:'finishing results',rawCount:state.rawCount};}
function beginApifyRun_(state,center,token){
 apifyBudget_(true);state.stage='starting';state.runId='';state.runsStarted++;saveApifyState_(state);
 // Persist the reservation first. A lost start response is ambiguous, not permission to retry.
 var run=apifyRequest_(token,'actors/compass~crawler-google-places/runs?timeout=300&restartOnError=false&maxTotalChargeUsd='+state.perRunCap,'post',apifyActorInput_(state.settings,center,state.index,state.settings.count-state.rawCount)).data;
 if(!run||!/^[A-Za-z0-9_-]+$/.test(run.id||''))throw new Error('Apify did not return a run ID. Check Apify Console before resetting the search.');
 state.runId=run.id;state.stage='running';saveApifyState_(state);return apifyPending_(state);
}
function apifyResult_(rows,state,center,cacheHit,reason){
 var out=selectCatalogCandidates(rows,state.settings,center);
 if(rows.length&&rows[0].source==='apify'){
  out.provider='apify';out.ranking='apify_priority_distance';var overture=records_('Catalog');out.places.forEach(function(p){var r=Object.assign({},rows.find(function(x){return x.id===p.id;}));fillOverturePhone_(r,overture);p.nationalPhoneNumber=r.phone;p.source='apify';p.retentionAllowed=false;p.crmPrefill=true;p.sourceRelease='';p.sourceLicense='rights-unverified';p.phoneSource=r.phone_source;p.phoneObservedAt=r.phone_observed_at;p.attributions=[{provider:'Apify / Google Maps · storage rights unverified',providerUri:'https://apify.com/compass/crawler-google-places'}];});
 }
 var exclusions=records_('Exclusions');records_('CRM').filter(function(x){return BLOCKED_STATUSES.indexOf(x.status)>=0;}).forEach(function(x){exclusions.push({place_id:x.place_id,name:x.business_name,address:x.address,reason:x.status});});
 var filtered=filterCandidates(out.places,exclusions,state.settings.zips);delete out.places;
 return Object.assign(out,filtered,{rawCount:out.provider==='overture'||state.rawCount===undefined?out.rawCount:state.rawCount,requested:state.settings.count,searchRequests:cacheHit?0:state.runsStarted,estimatedGrossUsd:0,costCeilingUsd:cacheHit?0:state.runsStarted*state.perRunCap,costIsCeiling:true,cacheHit:!!cacheHit,fallbackReason:reason||'',generatedAt:new Date().toISOString(),demo:false});
}
function finishApify_(state,center,reason){
 var rows=records_('ApifyBusinesses').filter(function(x){return state.ids.indexOf(x.id)>=0;});
 if(!rows.length){rows=records_('Catalog');reason=reason||'No usable Apify candidates; showing the saved Overture catalog.';}
 var out=apifyResult_(rows,state,center,false,reason);state.stage='complete';saveApifyState_(state);CacheService.getScriptCache().put('apify-result-'+state.id,JSON.stringify(out),3600);return out;
}
function startApifySearch(input){
 var props=authorize_(),settings=validateRequest(input),token=configuredProperty_(props,'APIFY_TOKEN');
 if(!token)throw new Error('Set APIFY_TOKEN in Apps Script Properties.');
 return locked_(function(){
  var lookup=businessLookupState_();if(lookup&&lookup.stage!=='complete')throw new Error('Finish the current business lookup before starting nearby collection.');
  var active=apifyState_();if(active&&active.stage!=='complete'){if(['running','advance'].indexOf(active.stage)>=0)return apifyPending_(active);throw new Error('A previous Apify start has an unknown outcome. Check Apify Console, then run resetApifySearch_ from the editor.');}
  var all=records_('ApifyBusinesses'),overture=records_('Catalog'),fresh=all.filter(function(x){return Date.now()-Date.parse(x.retrieved_at)<30*86400000;});
  if(fresh.length<settings.count)apifyBudget_(false);checkRequestBudget_('geocode',false);
  var center=censusGeocode(settings.address,reserveRequest_),state={id:Utilities.getUuid(),settings:settings,index:0,rawCount:0,ids:[],runsStarted:0,perRunCap:0,maxRuns:0};
  // Snapshot facts are local. Missing-phone matching consults this same catalog at completion.
  var cached=selectCatalogCandidates(fresh,settings,center);
  if(cached.rawCount>=settings.count){delete state.rawCount;return apifyResult_(fresh,state,center,true);}
  state.maxRuns=Math.min(settings.industries.length,6,apifyBudget_(false));state.perRunCap=Math.floor(.75/state.maxRuns*10000)/10000;
  if(all.length+settings.count>4000)throw new Error('Apify storage limit: 4,000 businesses. Export and manage old source rows before scraping. CRM history is separate.');
  CacheService.getScriptCache().put('apify-center-'+state.id,JSON.stringify(center),3600);
  try{return beginApifyRun_(state,center,token);}catch(e){if(state.stage==='starting'&&!e.apifyRejected){var fallback=apifyResult_(overture,state,center,false,e.message+' Start outcome is unknown; check Apify Console before resetting.');fallback.startUncertain=true;return fallback;}return finishApify_(state,center,e.message);}
 });
}
function pollApifySearch(jobId){
 var props=authorize_();return locked_(function(){
  var state=apifyState_();if(!state||state.id!==jobId)throw new Error('Unknown search. Start or resume the current search.');
  var cache=CacheService.getScriptCache();if(state.stage==='complete'){var complete=cache.get('apify-result-'+state.id);if(complete)return JSON.parse(complete);throw new Error('Finished search expired. Search the stored businesses again.');}
  if(['running','advance'].indexOf(state.stage)<0)throw new Error('Search start outcome is unknown. Check Apify Console before resetting.');
  var rawCenter=cache.get('apify-center-'+state.id);if(!rawCenter)throw new Error('Search location expired from temporary cache. Check the run in Apify Console, then resetApifySearch_ and start again.');
  var center=JSON.parse(rawCenter),run;
  if(state.stage==='advance'){if(state.failure||state.rawCount>=state.settings.count||state.index>=state.settings.industries.length)return finishApify_(state,center,state.failure||'');return advanceApify_(state,center,configuredProperty_(props,'APIFY_TOKEN'));}
  try{run=apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'actor-runs/'+encodeURIComponent(state.runId)).data;}catch(e){throw e;}
  if(!run||['READY','RUNNING','TIMING-OUT','ABORTING'].indexOf(run.status)>=0)return apifyPending_(state);
  var failure=run.status!=='SUCCEEDED'?'Apify '+String(run.status||'failed')+'. No paid retry was sent.':'';
  if(failure&&!run.defaultDatasetId)return finishApify_(state,center,failure);
  if(!/^[A-Za-z0-9_-]+$/.test(run.defaultDatasetId||''))throw new Error('Invalid Apify dataset ID.');
  var remaining=state.settings.count-state.rawCount,items=apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'datasets/'+run.defaultDatasetId+'/items?format=json&clean=true&limit='+remaining);
  if(!Array.isArray(items))throw new Error('Apify dataset must be a list.');items=items.slice(0,remaining);retainApifyItems_(state.runId,items);
  var rows=records_('ApifyBusinesses'),map={};rows.forEach(function(x){map[x.id]=x;});var overture=records_('Catalog');
  items.forEach(function(p){var x=normalizeApifyPlace_(p,state.settings.industries[state.index],overture);if(!x)return;var old=map[x.id];if(old&&!x.phone){x.phone=old.phone;x.phone_source=old.phone_source;x.phone_observed_at=old.phone_observed_at;}map[x.id]=x;if(state.ids.indexOf(x.id)<0)state.ids.push(x.id);});
  var merged=Object.keys(map).map(function(k){return map[k];});if(merged.length>4000)throw new Error('Apify storage limit exceeded. Export/manage source rows; pending dataset remains available in Apify.');
  writeRecords_('ApifyBusinesses',merged);SpreadsheetApp.flush();state.rawCount+=items.length;state.index++;state.stage='advance';state.failure=failure;saveApifyState_(state);
  if(failure||state.rawCount>=state.settings.count||state.index>=state.settings.industries.length)return finishApify_(state,center,failure);
  return advanceApify_(state,center,configuredProperty_(props,'APIFY_TOKEN'));
 });
}
function advanceApify_(state,center,token){if(state.runsStarted>=(state.maxRuns||6))return finishApify_(state,center,'Batch run limit reached. Saved partial results; remaining industries were not queried.');try{return beginApifyRun_(state,center,token);}catch(e){if(state.stage==='starting'&&!e.apifyRejected){var rows=records_('ApifyBusinesses').filter(function(x){return state.ids.indexOf(x.id)>=0;});if(!rows.length)rows=records_('Catalog');var partial=apifyResult_(rows,state,center,false,e.message+' Start outcome is unknown; check Apify Console before resetting.');partial.startUncertain=true;return partial;}return finishApify_(state,center,e.message);}}
// Editor-only recovery: verify/abort the known remote run first; never silently retry starts.
function resetApifySearch_(){var props=authorize_();return locked_(function(){var state=apifyState_();if(state&&state.stage==='running'&&state.runId)apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'actor-runs/'+encodeURIComponent(state.runId)+'/abort','post',{});props.setProperty('APIFY_SEARCH','');return true;});}

// Every acquired item is retained before eligibility/normalization, automatically.
// Chunking preserves fields without hitting Sheets' per-cell character limit.
function retainApifyItems_(runId,items){
 var existing=records_('ApifyPulls'),known={};existing.forEach(function(x){known[x.id]=true;});
 var pending=[],now=new Date().toISOString();items.forEach(function(item,index){var json=JSON.stringify(item);for(var offset=0,part=0;offset<json.length;part++){var end=Math.min(offset+32000,json.length);if(end<json.length&&/[\uD800-\uDBFF]/.test(json.charAt(end-1))&&/[\uDC00-\uDFFF]/.test(json.charAt(end)))end--;var id=runId+':'+index+':'+part;if(!known[id])pending.push({id:id,run_id:runId,item_index:index,part:part,json:json.slice(offset,end),retrieved_at:now});offset=end;}});
 if(!pending.length)return;if(existing.length+pending.length>10000)throw new Error('Apify pull archive is full. Export/manage old pulls before collecting more; the remote dataset is still available.');
 var sheet=sheet_('ApifyPulls'),first=sheet.getLastRow()+1;ensureGrid_(sheet,first+pending.length-1,TABLES_.ApifyPulls.length);
 sheet.getRange(first,1,pending.length,TABLES_.ApifyPulls.length).setNumberFormat('@').setValues(pending.map(function(x){return TABLES_.ApifyPulls.map(function(key){return literalCell(x[key]);});}));
}
function businessLookupQuery_(input){var query=textValue(input&&input.query,300).trim();if(query.length<3)throw new Error('Enter a business name, address, or phone number (at least 3 characters).');return query;}
function lookupMatches_(query){
 var q=normalized(query),digits=query.replace(/\D/g,''),phoneQuery=/^[+()\d .-]+$/.test(query)&&digits.length>=7,seen={},matches=[];
 var crm=records_('CRM').map(function(x){return {id:x.place_id||x.id,crmId:x.id,name:x.business_name,address:x.address,phone:x.phone,source:'crm'};});
 var listings=records_('ApifyBusinesses').concat(records_('Catalog')).map(function(x){return {id:x.id,crmId:'',name:x.name,address:x.address,phone:x.phone,source:x.source};});
 crm.concat(listings).forEach(function(x){var key=normalized(x.name)+'|'+normalized(x.address),pd=String(x.phone||'').replace(/\D/g,'');var match=phoneQuery?pd&&pd.slice(-10)===digits.slice(-10):normalized(x.name).indexOf(q)>=0||normalized(x.address).indexOf(q)>=0||normalized(x.name+' '+x.address).indexOf(q)>=0;if(match&&!seen[key]&&matches.length<20){seen[key]=true;matches.push(x);}});return matches;
}
function lookupBusiness(input){authorize_();var query=businessLookupQuery_(input);return locked_(function(){return {matches:lookupMatches_(query),pending:false,cacheHit:true,costCeilingUsd:0};},true);}
function businessLookupState_(){var raw=PropertiesService.getScriptProperties().getProperty('APIFY_LOOKUP');return raw?JSON.parse(raw):null;}
function saveBusinessLookupState_(state){PropertiesService.getScriptProperties().setProperty('APIFY_LOOKUP',JSON.stringify(state));}
function startBusinessLookup(input){
 var props=authorize_(),query=businessLookupQuery_(input),token=configuredProperty_(props,'APIFY_TOKEN');
 return locked_(function(){
  var local=lookupMatches_(query);if(local.length)return {matches:local,pending:false,cacheHit:true,costCeilingUsd:0};
  var active=businessLookupState_();if(active&&active.stage!=='complete'){if(active.query!==query||active.stage==='starting')throw new Error('A business lookup is already running or its start outcome is unknown. Finish it before starting another.');return {pending:true,jobId:active.id,costCeilingUsd:.1};}
  var nearby=apifyState_();if(nearby&&nearby.stage!=='complete')throw new Error('Finish the nearby collection before starting a business lookup.');
  if(!token)throw new Error('Apify lookup is unavailable until the existing token is configured.');
  if(records_('ApifyBusinesses').length+3>4000)throw new Error('Apify business storage is full. Manage old source rows before looking up more.');
  apifyBudget_(true);var state={id:Utilities.getUuid(),query:query,runId:'',stage:'starting'};saveBusinessLookupState_(state);
  try{var run=apifyRequest_(token,'actors/compass~crawler-google-places/runs?timeout=300&restartOnError=false&maxTotalChargeUsd=0.1','post',{searchStringsArray:[query],countryCode:'us',maxCrawledPlacesPerSearch:3,language:'en',scrapePlaceDetailPage:false,scrapeContacts:false,maxReviews:0,maxImages:0,maxQuestions:0}).data;
   if(!run||!/^[A-Za-z0-9_-]+$/.test(run.id||''))throw new Error('Apify did not return a lookup run ID.');state.runId=run.id;state.stage='running';saveBusinessLookupState_(state);return {pending:true,jobId:state.id,costCeilingUsd:.1};
  }catch(e){if(e.apifyRejected){state.stage='complete';state.failure=e.message;saveBusinessLookupState_(state);}throw new Error(e.message+(e.apifyRejected?'':' Start outcome is unknown; check Apify Console before using editor recovery.'));}
 });
}
function pollBusinessLookup(jobId){
 var props=authorize_();return locked_(function(){
  var state=businessLookupState_();if(!state||state.id!==jobId)throw new Error('Unknown business lookup.');
  if(state.stage==='starting')throw new Error('Lookup start outcome is unknown. Check Apify Console before editor recovery.');
  if(state.stage==='complete')return businessLookupResult_(state);
  var run=apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'actor-runs/'+encodeURIComponent(state.runId)).data;
  if(!run||['READY','RUNNING','TIMING-OUT','ABORTING'].indexOf(run.status)>=0)return {pending:true,jobId:state.id,costCeilingUsd:.1};
  var failure=run.status==='SUCCEEDED'?'':'Apify '+String(run.status||'failed')+'. No paid retry was started.';
  if(run.defaultDatasetId){if(!/^[A-Za-z0-9_-]+$/.test(run.defaultDatasetId))throw new Error('Invalid lookup dataset ID.');var items=apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'datasets/'+run.defaultDatasetId+'/items?format=json&clean=true&limit=3');if(!Array.isArray(items))throw new Error('Lookup dataset must be a list.');items=items.slice(0,3);retainApifyItems_(state.runId,items);
   var rows=records_('ApifyBusinesses'),map={},catalog=records_('Catalog');rows.forEach(function(x){map[x.id]=x;});state.ids=[];
   items.forEach(function(p){var category=normalized(p.categoryName||''),industry=INDUSTRIES.find(function(i){return normalized(i.label)===category;});var x=normalizeApifyPlace_(p,industry?industry.id:'unknown',catalog);if(!x)return;var old=map[x.id];if(old&&!x.phone){x.phone=old.phone;x.phone_source=old.phone_source;x.phone_observed_at=old.phone_observed_at;}map[x.id]=x;state.ids.push(x.id);});
   writeRecords_('ApifyBusinesses',Object.keys(map).map(function(id){return map[id];}));SpreadsheetApp.flush();
  }else state.ids=[];
  state.stage='complete';state.failure=failure;saveBusinessLookupState_(state);return businessLookupResult_(state);
 });
}
function businessLookupResult_(state){var ids=state.ids||[],crm=records_('CRM');return {pending:false,jobId:state.id,costCeilingUsd:.1,fallbackReason:state.failure||'',matches:records_('ApifyBusinesses').filter(function(x){return ids.indexOf(x.id)>=0;}).map(function(x){var existing=crm.find(function(c){return c.place_id===x.id||c.place_id===x.id.replace(/^apify:/,'')||normalized(c.business_name)===normalized(x.name)&&normalized(c.address)===normalized(x.address);});return {id:x.id,name:x.name,address:x.address,phone:x.phone,source:'apify',crmId:existing?existing.id:''};})};}
// Editor-only unknown-start recovery, never retries or starts a second paid run.
function resetBusinessLookup_(){var props=authorize_();return locked_(function(){var state=businessLookupState_();if(state&&state.stage==='running'&&state.runId)apifyRequest_(configuredProperty_(props,'APIFY_TOKEN'),'actor-runs/'+encodeURIComponent(state.runId)+'/abort','post',{});props.setProperty('APIFY_LOOKUP','');return true;});}
