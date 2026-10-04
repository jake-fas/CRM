// Local-only demo: actual service/core code, fictional Google transport, memory-only Sheet.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),sheets={},props={ALLOWED_EMAILS:'demo@example.com',SPREADSHEET_ID:'demo',GOOGLE_MAPS_API_KEY:'fictional',PRIVACY_URL:'https://example.com/privacy',TERMS_URL:'https://example.com/terms',DAILY_SEARCH_LIMIT:'10000',DAILY_GEOCODE_LIMIT:'10000'};
const spreadsheet={getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]={rows:[],getMaxRows(){return 100000;},getMaxColumns(){return 26;},getLastRow(){return this.rows.length;},getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},getRange(r,c,nr,nc){const s=this;return {setNumberFormat(){return this;},setValues(rows){rows.forEach((row,i)=>s.rows[r-1+i]=row.map(x=>typeof x==='string'&&x[0]==="'"?x.slice(1):x));return this;}};},setFrozenRows(){}}};
const propertyStore={getProperty:k=>props[k]??null,setProperty:(k,v)=>props[k]=String(v)};
props.APIFY_TOKEN='fictional-token';props.DAILY_APIFY_RUN_LIMIT='60';const cache={},apifyRuns={};let demoRunCounter=0;
const context=vm.createContext({Date,JSON,Math,console,Session:{getActiveUser:()=>({getEmail:()=> 'demo@example.com'})},PropertiesService:{getScriptProperties:()=>propertyStore},SpreadsheetApp:{openById:()=>spreadsheet,flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},UrlFetchApp:{fetch:(url,options)=>{
 let data;if(url.includes('geocoding.geo.census.gov'))data={result:{addressMatches:[{coordinates:{x:-105,y:40}}]}};else if(url.includes('geocode'))data={status:'OK',results:[{geometry:{location:{lat:40,lng:-105}}}]};else if(url.includes('api.apify.com')){
  if(url.includes('/actors/')){const b=JSON.parse(options.payload),id='run'+(++demoRunCounter);apifyRuns[id]={body:b,polls:0};data={data:{id}};}
  else if(url.includes('/actor-runs/')){const id=url.split('/actor-runs/')[1].split('/')[0],r=apifyRuns[id];data={data:{id,status:++r.polls<2?'RUNNING':'SUCCEEDED',defaultDatasetId:id}};}
  else{const id=url.split('/datasets/')[1].split('/')[0],b=apifyRuns[id].body;data=Array.from({length:b.maxCrawledPlacesPerSearch},(_,i)=>({placeId:'ChIJdemo'+normalizedTerm(b.searchStringsArray[0])+i,title:'Fictional '+b.searchStringsArray[0]+' '+(i+1),address:(i+1)+' Example Lane, Boulder, CO 80301',postalCode:'80301',countryCode:'US',phoneUnformatted:'+13035550100',location:{lat:40+i*.0001,lng:-105}}));}
 }else{
  const b=JSON.parse(options.payload),offset=Number(b.pageToken||0),size=Math.min(b.pageSize,60-offset);
  data={places:Array.from({length:size},(_,i)=>({id:'demo_'+b.includedType+'_'+(offset+i+1),displayName:{text:'Fictional '+b.textQuery+' '+(offset+i+1)},formattedAddress:(offset+i+1)+' Example Lane, Boulder, CO 80301',addressComponents:[{types:['postal_code'],shortText:'80301'}],nationalPhoneNumber:'(303) 555-01'+String(i%100).padStart(2,'0'),primaryTypeDisplayName:{text:b.textQuery},websiteUri:'https://example.com',googleMapsUri:'https://example.com',regularOpeningHours:{weekdayDescriptions:['Demonstration hours only']}})),nextPageToken:offset+size<60?String(offset+size):undefined};
 }return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(data)};
}}});
function normalizedTerm(s){return s.toLowerCase().replace(/[^a-z]/g,'');}
context.CacheService={getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})};
['Core.gs','Provider.gs','Catalog.gs','Apify.gs','Code.gs'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));
const allowed=['getInitialState','getLeadActivities','getBootstrap','generateLeads','generateCatalogLeads','startApifySearch','pollApifySearch','importCatalog','saveIndustryPreferences','getCRM','saveLead','logActivity','importExclusions'];
const bridge=`<script>window.google={script:{run:new Proxy({}, {get(_,method){if(method==='withSuccessHandler'||method==='withFailureHandler')return handler=>chain(method,handler);}})}};function chain(first,fn){let success=()=>{},failure=()=>{};if(first==='withSuccessHandler')success=fn;else failure=fn;const p=new Proxy({}, {get(_,name){if(name==='withSuccessHandler')return f=>{success=f;return p;};if(name==='withFailureHandler')return f=>{failure=f;return p;};return (...args)=>fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);success(data);}).catch(failure);}});return p;}</script>`;
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');const initial=context.getInitialState();initial.boot.demo=true;res.end(fs.readFileSync(path.join(root,'Index.html'),'utf8').replace('<!-- DEMO_BRIDGE -->',bridge).replace('<!-- INITIAL_STATE -->',()=>'<script id="initialState" type="application/json">'+context.initialJSON_(initial)+'</script>'));return;}
 const method=req.url?.replace('/api/','');if(req.method!=='POST'||!allowed.includes(method)){res.writeHead(404);res.end();return;}
 let body='';req.on('data',chunk=>{body+=chunk;if(body.length>1100000)req.destroy();});req.on('end',()=>{res.setHeader('Content-Type','application/json');try{
 const args=JSON.parse(body),out=context[method](...args);if(['getBootstrap','generateLeads','generateCatalogLeads','startApifySearch','pollApifySearch'].includes(method))out.demo=true;res.end(JSON.stringify(out));
 }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e.message}));}});
});
const port=Number(process.env.DEMO_PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log('Fictional demo: http://127.0.0.1:'+port+' · Ctrl+C to stop'));
