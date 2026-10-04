const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');

const html=fs.readFileSync(require('node:path').join(__dirname,'../Index.html'),'utf8');

function fn(name){const start=html.indexOf('function '+name+'(');assert.notEqual(start,-1,'Missing '+name);let i=html.indexOf('{',start),depth=1,j=i+1;for(;depth&&j<html.length;j++){if(html[j]==='{')depth++;if(html[j]==='}')depth--;}return html.slice(start,j);}

test('follow-up options validate days and preserve disabled second reminder',()=>{const ctx={};vm.createContext(ctx);vm.runInContext(fn('normalizeFollowUps'),ctx);assert.equal(ctx.normalizeFollowUps({primaryDays:3,secondaryEnabled:false,secondaryDays:7}).primaryDays,3);assert.throws(()=>ctx.normalizeFollowUps({primaryDays:0,secondaryDays:7}),/1.*365/);assert.throws(()=>ctx.normalizeFollowUps({primaryDays:7,secondaryEnabled:true,secondaryDays:3}),/after/);});

test('call saves explicit outcome, optimistic version and stable request id',()=>{const fields={callLeadId:{value:'lead-1'},callVersion:{value:'v1'},callOutcome:{value:'no_answer'},callNotes:{value:'Try owner'},callDate:{value:'2026-10-04'},callMode:{value:'custom'},callPrimaryDays:{value:'4'},callSecondaryEnabled:{checked:true},callSecondaryDays:{value:'9'}};const ctx={$:id=>fields[id],callToken:'retry-id'};vm.createContext(ctx);vm.runInContext(fn('normalizeFollowUps')+'\n'+fn('callInput'),ctx);const out=ctx.callInput();assert.equal(out.expected_updated_at,'v1');assert.equal(out.request_id,'retry-id');assert.equal(out.outcome,'no_answer');assert.equal(out.secondaryDays,9);});

test('result merging updates lead and replaces its pending reminders while preserving other leads',()=>{const ctx={crm:{leads:[{id:'a'},{id:'b'}],activities:[],reminders:[{id:'old',lead_id:'a'},{id:'keep',lead_id:'b'}]},renderCRM:()=>{}};vm.createContext(ctx);vm.runInContext(fn('acceptCallResult'),ctx);ctx.acceptCallResult({lead:{id:'a',updated_at:'v2'},activity:{id:'activity',lead_id:'a'},reminders:[{id:'new',lead_id:'a'}]});assert.equal(ctx.crm.leads[0].updated_at,'v2');assert.equal(ctx.crm.reminders.map(x=>x.id).join(','),'keep,new');ctx.acceptCallResult({lead:{id:'a'},activity:{id:'activity'},reminders:[]});assert.equal(ctx.crm.activities.length,1);});

test('lookup is explicit and every id in the UI is unique',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);assert.ok(html.includes("rpc('lookupBusiness'"));assert.ok(html.includes("rpc('startBusinessLookup'"));assert.ok(!/lookupQuery'\)\.oninput/.test(html));assert.ok(!html.includes('tel:'));assert.ok(html.includes("'Mark called'"));});

test('only explicit prewrite rejection allows a submission reset',()=>{const ctx={};vm.createContext(ctx);vm.runInContext(fn('rpcError'),ctx);assert.equal(ctx.rpcError({message:'Network failed'}).safeToReset,false);assert.equal(ctx.rpcError({message:'This business changed'}).safeToReset,false);const rejected=ctx.rpcError({message:JSON.stringify({code:'PREWRITE_REJECTED',safeToReset:true,message:'Refresh first'})});assert.equal(rejected.safeToReset,true);assert.equal(rejected.message,'Refresh first');assert.equal(ctx.rpcError({message:'[PREWRITE_REJECTED] Refresh first'}).safeToReset,true);for(const prefix of ['Error: ','Exception: ','Error: Exception: '])assert.equal(ctx.rpcError({message:prefix+'[PREWRITE_REJECTED] Refresh first'}).safeToReset,true);assert.equal(ctx.rpcError({message:'Remote error mentions [PREWRITE_REJECTED] later'}).safeToReset,false);});

if(process.env.CRM_UI_BROWSER==='1')test('desktop and mobile: fast call, defaults, reminder done, explicit lookup and list scheduling',async()=>{

 const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});

 try{for(const viewport of [{width:1365,height:900},{width:390,height:844}]){

  const page=await browser.newPage({viewport}),errors=[],requests=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));

  const lead={id:'a',business_name:'Acme Auto',address:'1 Main St',phone:'3035550100',status:'prospect',updated_at:'v1',due_bucket:'none',follow_up:''};

  let version=1,state={today:'2026-10-04',leads:[lead],activities:[],reminders:[]},settings={primaryDays:3,secondaryEnabled:false,secondaryDays:7},failCall=true,lookupPolls=0,rejectSchedule=true,recoveryPending=true;

  await page.route('http://localhost:4199/api/**',async route=>{const method=route.request().url().split('/').pop(),args=route.request().postDataJSON(),input=args[0];requests.push({method,input});let out;

   if(method==='pollBusinessLookup'){lookupPolls++;if(lookupPolls===1)out={pending:true,jobId:'restored-lookup'};else if(lookupPolls===2){await route.fulfill({status:400,json:{error:'Transient lookup failure'}});return;}else out={matches:[{name:'Resumed Business',address:'3 Stored St',phone:'3035550111',id:'apify:resume',source:'apify'}]};}

   else if(method==='resumeFollowUpWorkflow'){recoveryPending=false;out={lead:state.leads[0],activity:{id:'recovered',lead_id:'a',type:'call',date:state.today,created_at:'yesterday',notes:'Original server-side notes'},reminders:state.reminders};}

   else if(method==='getCRM')out=state;

   else if(method==='saveFollowUpSettings'){settings=input;out=settings;}

   else if(method==='completeCall'||method==='scheduleFollowUps'){

    if(method==='scheduleFollowUps'&&rejectSchedule){rejectSchedule=false;await route.fulfill({status:400,json:{error:JSON.stringify({code:'PREWRITE_REJECTED',safeToReset:true,message:'Business changed before save'})}});return;}

    if(method==='completeCall'&&failCall){failCall=false;await route.fulfill({status:400,json:{error:'Temporary failure. Retry Save call.'}});return;}

    const next={...lead,updated_at:'v'+(++version),follow_up:'2026-10-07'};state.leads=[next];state.reminders=input.followUpMode==='none'?[]:[{id:'r'+version,lead_id:'a',due_date:'2026-10-07',status:'pending'}];out={lead:next,reminders:state.reminders};if(method==='completeCall'){out.activity={id:'activity',lead_id:'a',type:'call',date:input.date,created_at:'now',notes:input.notes};state.activities.push(out.activity);}

   }else if(method==='completeReminder'){state.reminders=[];out={lead:{...state.leads[0],follow_up:'',updated_at:'v'+(++version)},reminder:{id:input,status:'completed'},reminders:[]};state.leads=[out.lead];}

   else if(method==='lookupBusiness')out={matches:[{name:'Local Business',address:'2 Example St',phone:'3035550123',id:'catalog:1',source:'catalog'}]};

   else if(method==='getLeadActivities')out=state.activities;

   else throw new Error('Unexpected '+method);

   await route.fulfill({json:out});

  });

  const bridge=`<script>window.google={script:{run:new Proxy({}, {get(_,name){return handler=>{let success=handler;return {withFailureHandler(failure){return new Proxy({}, {get(_,method){return (...args)=>fetch('http://localhost:4199/api/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}).then(async r=>{const out=await r.json();if(!r.ok)throw new Error(out.error);success(out);}).catch(failure);}});}};};}})}};</script>`;

  const initial={boot:{demo:true,pendingCallWorkflows:[{request_id:'server-held-id',lead_id:'a',isCall:true}],pendingBusinessLookup:{id:'restored-lookup',query:'Resumed Business'},today:state.today,industries:[{id:'car_repair',label:'Auto repair shops',group:'Automotive',included:true},{id:'restaurant',label:'Restaurants',group:'Food',included:false}],statuses:['prospect'],activityTypes:['call','OSV'],followUpSettings:settings},crm:state};

  await page.route('http://localhost:4199/',route=>route.fulfill({contentType:'text/html',body:html.replace('"__FIELDBOOK_INITIAL_STATE__"',JSON.stringify({...initial,boot:{...initial.boot,pendingCallWorkflows:recoveryPending?initial.boot.pendingCallWorkflows:[],pendingBusinessLookup:lookupPolls>=3?null:initial.boot.pendingBusinessLookup},crm:state})).replace('<!-- DEMO_BRIDGE -->',bridge)}));await page.goto('http://localhost:4199/');await page.getByText('Demo ready.',{exact:false}).waitFor();await page.waitForFunction(()=>!busy);await page.locator('#resumeBusinessLookup').click();await page.locator('#notice').filter({hasText:'Transient lookup failure Use Resume business lookup to retry.'}).waitFor();await page.locator('#resumeBusinessLookup').click();await page.getByText('Business lookup finished for Resumed Business. Saved details are ready to review.',{exact:true}).waitFor();assert.equal(lookupPolls,3);assert.equal(requests.filter(x=>x.method==='startBusinessLookup').length,0);await page.reload();await page.getByText('Demo ready.',{exact:false}).waitFor();await page.getByRole('button',{name:'Finish call · Acme Auto',exact:true}).click();await page.getByText('Interrupted save completed. The original call and follow-ups were recovered.',{exact:true}).waitFor();assert.deepEqual(requests.find(x=>x.method==='resumeFollowUpWorkflow').input,{request_id:'server-held-id',lead_id:'a'});assert.equal(await page.locator('#workflowRecovery').isVisible(),false);

  await page.locator('#industrySearch').fill('auto');assert.equal(await page.locator('.industry').count(),1);await page.getByRole('button',{name:'Include all',exact:true}).click();assert.match(await page.locator('#industrySelection').textContent(),/2 of 2 included/);await page.getByRole('button',{name:'Clear all',exact:true}).click();assert.match(await page.locator('#industrySelection').textContent(),/0 of 2/);

  await page.getByRole('button',{name:'My CRM',exact:true}).click();await page.getByRole('button',{name:'Mark called',exact:true}).click();await page.locator('#callNotes').fill('Owner away');await page.locator('#callOutcome').selectOption('voicemail');await page.locator('#saveCall').click();await page.locator('#callFeedback').filter({hasText:'Temporary failure'}).waitFor();assert.equal(await page.locator('#callNotes').isDisabled(),true);await page.locator('#callNotes').evaluate(x=>x.value='Changed after failed save');await page.locator('#saveCall').click();await page.getByText('Call recorded. Follow-ups updated.',{exact:true}).waitFor();const calls=requests.filter(x=>x.method==='completeCall');assert.equal(calls.length,2);assert.equal(calls[0].input.request_id,calls[1].input.request_id);assert.equal(calls[1].input.expected_updated_at,'v1');assert.equal(calls[1].input.outcome,'voicemail');assert.equal(calls[1].input.notes,'Owner away');

  await page.getByRole('button',{name:'Edit / history',exact:true}).click();assert.equal(await page.locator('#followUp').evaluate(x=>x.readOnly),true);assert.equal(await page.locator('#scheduledFollowUpNote').isVisible(),true);await page.getByRole('button',{name:'Close business editor'}).click();await page.getByRole('button',{name:'Complete follow-up 2026-10-07 for Acme Auto'}).click();await page.getByText('Follow-up completed.',{exact:true}).waitFor();assert.equal(await page.locator('.reminder').count(),0);

  await page.getByText('Follow-up defaults ·',{exact:false}).click();await page.locator('#defaultPrimaryDays').fill('4');await page.locator('#defaultSecondaryEnabled').check();await page.locator('#defaultSecondaryDays').fill('9');await page.getByRole('button',{name:'Save defaults',exact:true}).click();await page.getByText('Follow-up defaults saved for future calls.',{exact:true}).waitFor();assert.equal(settings.secondaryDays,9);

  await page.getByRole('button',{name:'Select visible businesses',exact:true}).click();await page.getByRole('button',{name:'Set follow-ups for selected',exact:true}).click();await page.locator('#saveCall').click();await page.locator('#callFeedback').filter({hasText:'Your fields are unlocked'}).waitFor();assert.equal(await page.locator('#callMode').isDisabled(),false);await page.locator('#callMode').selectOption('custom');await page.locator('#callPrimaryDays').fill('5');await page.locator('#saveCall').click();await page.getByText('Follow-ups updated.',{exact:true}).waitFor();assert.equal(requests.filter(x=>x.method==='scheduleFollowUps').length,2);

  await page.getByRole('button',{name:'Add business',exact:true}).click();await page.getByText('Find business details · optional',{exact:true}).click();await page.locator('#businessName').fill('My known label');await page.locator('#lookupQuery').fill('3035550123');assert.equal(requests.filter(x=>x.method==='lookupBusiness').length,0);await page.getByRole('button',{name:'Find saved matches',exact:true}).click();await page.getByRole('button',{name:'Fill empty fields',exact:true}).click();assert.equal(await page.locator('#businessName').inputValue(),'My known label');assert.equal(await page.locator('#contactPhone').inputValue(),'3035550123');assert.equal(requests.filter(x=>x.method==='saveLead').length,0);await page.getByRole('button',{name:'Close business editor'}).click();

  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');assert.deepEqual(errors,[]);await page.close();

 }}finally{await browser.close();}

});

