const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function service(){
 const sheets={},props={ALLOWED_EMAILS:'rep@example.com',SPREADSHEET_ID:'sheet'};let sequence=0,failName='',failCount=0,locked=false;
 const ss={getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]={rows:[],getLastColumn(){return this.rows[0]?.length||0;},getLastRow(){return this.rows.length;},getMaxRows:()=>10000,getMaxColumns:()=>30,setFrozenRows(){},getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},getRange(r,col,nr,nc){const s=this;return {getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>s.rows[r-1+i]?.[col-1+j]??'')),setNumberFormat(){return this;},setValues(values){if(n===failName&&r>1&&failCount-->0)throw Error('Injected Sheet write failure');values.forEach((v,i)=>s.rows[r-1+i]=v.map(x=>typeof x==='string'&&x[0]==="'"?x.slice(1):x));return this;}};}}};
 const c=vm.createContext({console,Date,Math,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,getProperties:()=>({...props}),setProperty:(k,v)=>props[k]=String(v),deleteProperty:k=>delete props[k]})},Session:{getActiveUser:()=>({getEmail:()=> 'rep@example.com'})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(algorithm,input)=>Array.from(require('node:crypto').createHash(algorithm).update(input).digest()),getUuid:()=> 'uuid-'+(++sequence),formatDate:()=> '2026-10-04'},SpreadsheetApp:{openById:()=>ss,flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>{assert.equal(locked,false);locked=true;return true;},releaseLock:()=>locked=false})}});
 for(const f of ['Core.gs','Code.gs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);
 const lead=c.saveLead({business_name:'Local shop',request_id:'lead-1'});
 return {c,props,sheets,lead,fail(n,count=1){failName=n;failCount=count;}};
}
function call(s,extra={}){return {lead_id:s.lead.id,expected_updated_at:s.lead.updated_at,outcome:'attempting_contact',date:'2026-10-04',notes:'Asked for manager',request_id:'call-1',followUpMode:'default',...extra};}
const plain=x=>JSON.parse(JSON.stringify(x));
test('call saves outcome, preserves CRM schema, records history and schedules default day three',()=>{
 const s=service(),headers=s.sheets.CRM.rows[0].slice(),out=s.c.completeCall(call(s));
 assert.equal(out.lead.status,'attempting_contact');assert.equal(out.lead.follow_up,'2026-10-07');assert.equal(out.activity.type,'call');assert.equal(out.activity.notes,'Attempting contact \u2014 Asked for manager');assert.deepEqual(plain(out.reminders.map(x=>x.due_date)),['2026-10-07']);assert.deepEqual(s.sheets.CRM.rows[0],headers);
 assert.equal(s.c.getCRM(false).reminders[0].due_bucket,'upcoming');assert.equal(s.c.getCRM(false).activities.length,0);
});
test('editable defaults and business overrides anchor both offsets to the activity date and complete reminders advances next due',()=>{
 const s=service();assert.deepEqual(plain(s.c.getFollowUpSettings()),{primaryDays:3,secondaryDays:7,secondaryEnabled:false});
 s.c.saveFollowUpSettings({primaryDays:4,secondaryDays:7,secondaryEnabled:true});
 const out=s.c.completeCall(call(s));assert.deepEqual(plain(out.reminders.map(x=>x.due_date)),['2026-10-08','2026-10-11']);
 const done=s.c.completeReminder(out.reminders[0].id);assert.equal(done.lead.follow_up,'2026-10-11');assert.equal(done.reminder.status,'completed');assert.equal(s.c.completeReminder(out.reminders[0].id).lead.follow_up,'2026-10-11');
 const custom=s.c.scheduleFollowUps({lead_id:s.lead.id,expected_updated_at:done.lead.updated_at,date:'2026-12-30',request_id:'schedule-1',followUpMode:'custom',primaryDays:2,secondaryEnabled:true,secondaryDays:7});
 assert.deepEqual(plain(custom.reminders.filter(x=>x.status==='pending').map(x=>x.due_date)),['2027-01-01','2027-01-06']);
});
test('call retries recover partial reminder writes without duplicate activity or cancelling prior reminders prematurely',()=>{
 const s=service(),old=s.c.completeCall(call(s));s.lead=old.lead;
 s.fail('Reminders');const input=call(s,{request_id:'call-2',date:'2026-10-05'});assert.throws(()=>s.c.completeCall(input),/Injected/);
 assert.equal(s.c.records_('Reminders').find(x=>x.id===old.reminders[0].id).status,'pending');
 const recovered=s.c.completeCall(input);s.c.completeCall(input);
 assert.equal(s.c.records_('Activities').length,2);assert.equal(recovered.reminders.filter(x=>x.status==='pending').length,1);assert.equal(recovered.lead.follow_up,'2026-10-08');
 assert.throws(()=>s.c.completeCall({...input,lead_id:'other'}),/conflict/i);
});
test('stale updates and invalid settings cannot alter history, and blocked outcomes cancel pending followups',()=>{
 const s=service(),first=s.c.completeCall(call(s));assert.throws(()=>s.c.completeCall(call(s,{request_id:'stale'})),/changed/);assert.equal(s.c.records_('Activities').length,1);
 for(const primaryDays of [0,-1,1.5,367,''])assert.throws(()=>s.c.saveFollowUpSettings({primaryDays,secondaryEnabled:false,secondaryDays:7}));
 s.lead=first.lead;const blocked=s.c.completeCall(call(s,{request_id:'blocked',outcome:'do_not_contact'}));assert.equal(blocked.lead.follow_up,'');assert.equal(blocked.reminders.filter(x=>x.status==='pending').length,0);assert.equal(s.c.records_('Activities').length,2);
 assert.equal(s.c.getInitialState().boot.followUpSettings.primaryDays,3);
});
test('manual business save to a blocked status cancels reminders while preserving activity history',()=>{
 const s=service(),first=s.c.completeCall(call(s));const saved=s.c.saveLead({...plain(first.lead),status:'current_customer',expected_updated_at:first.lead.updated_at});
 assert.equal(saved.follow_up,first.lead.follow_up);assert.equal(saved.due_bucket,'none');assert.equal(s.c.getCRM(false).reminders.filter(x=>x.status==='pending').length,0);assert.equal(s.c.getLeadActivities(saved.id).length,1);
});
test('retries accept the same request with different JSON field ordering and blocked reminders are cancelled',()=>{
 const s=service(),input=call(s),first=s.c.completeCall(input),reordered=Object.fromEntries(Object.entries(input).reverse());
 assert.equal(s.c.completeCall(reordered).activity.id,first.activity.id);
 s.lead=first.lead;const stopped=s.c.completeCall(call(s,{request_id:'stop',outcome:'current_customer'}));
 assert.equal(stopped.reminders[0].status,'cancelled');
});
test('manual calling outcomes save the matching status and retain the detailed result in history',()=>{
 for(const [outcome,status,label] of [['no_answer','attempting_contact','No answer'],['voicemail','attempting_contact','Voicemail'],['gatekeeper','attempting_contact','Gatekeeper'],['connected','prospect','Connected'],['wrong_number','prospect','Wrong number']]){
  const s=service(),out=s.c.completeCall(call(s,{outcome}));assert.equal(out.lead.status,status);assert.equal(out.activity.notes,label+' — Asked for manager');
 }
});
test('completed calls persist their retry identity without accumulating Script Properties journals',()=>{
 const s=service(),input=call(s),out=s.c.completeCall(input);
 assert.equal(s.c.records_('WorkflowRequests').length,1);
 assert.equal(Object.keys(s.props).filter(x=>x.startsWith('FOLLOW_UP_REQUEST_')).length,0);
 assert.equal(s.c.completeCall(input).activity.id,out.activity.id);
});
test('manual follow-up date changes cannot disagree with active scheduled reminders',()=>{
 const s=service(),first=s.c.completeCall(call(s));
 assert.throws(()=>s.c.saveLead({...plain(first.lead),follow_up:'2026-10-20',expected_updated_at:first.lead.updated_at}),/Use Follow-ups to change scheduled reminders/);
 assert.equal(s.c.getCRM(false).leads[0].follow_up,'2026-10-07');
 const edited=s.c.saveLead({...plain(first.lead),contact_name:'Manager',expected_updated_at:first.lead.updated_at});assert.equal(edited.contact_name,'Manager');
});
test('an interrupted call blocks competing lead mutations until its original submission recovers',()=>{
 const s=service(),first=s.c.completeCall(call(s));s.lead=first.lead;
 const retry=call(s,{request_id:'interrupted',date:'2026-10-05'});s.fail('Reminders');assert.throws(()=>s.c.completeCall(retry),/Injected/);
 const current=s.c.getCRM(false).leads[0],snapshot=JSON.stringify([s.c.records_('CRM'),s.c.records_('Activities'),s.c.records_('Reminders')]);
 for(const mutate of [()=>s.c.completeReminder(first.reminders[0].id),()=>s.c.saveLead({...plain(current),contact_name:'New name',expected_updated_at:current.updated_at}),()=>s.c.completeCall({...retry,request_id:'different-call',expected_updated_at:current.updated_at}),()=>s.c.scheduleFollowUps({...retry,request_id:'different-schedule',expected_updated_at:current.updated_at})]){
  assert.throws(mutate,/unfinished|pending|retry/i);assert.equal(JSON.stringify([s.c.records_('CRM'),s.c.records_('Activities'),s.c.records_('Reminders')]),snapshot);
 }
 const recovered=s.c.completeCall(retry);assert.equal(recovered.reminders.filter(x=>x.status==='pending').length,1);
 const reminder=recovered.reminders.find(x=>x.status==='pending');assert.equal(s.c.completeReminder(reminder.id).reminder.status,'completed');
});
test('pending call recovery survives a page reload using only server-side immutable submission data',()=>{
 const s=service(),first=s.c.completeCall(call(s));s.lead=first.lead;
 const input=call(s,{request_id:'recover-on-reload',outcome:'voicemail',notes:'Original private note'});s.fail('Reminders');assert.throws(()=>s.c.completeCall(input),/Injected/);
 const expected=[{request_id:'recover-on-reload',lead_id:s.lead.id,isCall:true}];
 assert.deepEqual(plain(s.c.getPendingCallWorkflows(s.lead.id)),expected);assert.deepEqual(plain(s.c.getInitialState().boot.pendingCallWorkflows),expected);
 input.notes='Edited browser draft';input.outcome='not_interested';
 const recovered=s.c.resumeFollowUpWorkflow({request_id:'recover-on-reload',lead_id:s.lead.id});
 assert.equal(recovered.activity.notes,'Voicemail — Original private note');assert.equal(recovered.lead.status,'attempting_contact');
 assert.deepEqual(plain(s.c.getPendingCallWorkflows()),[]);assert.equal(s.c.resumeFollowUpWorkflow({request_id:'recover-on-reload',lead_id:s.lead.id}).activity.id,recovered.activity.id);
});
test('pre-write validation and stale saves have no pending workflow and schedules can recover without logging a call',()=>{
 const s=service();assert.throws(()=>s.c.completeCall(call(s,{request_id:'bad',outcome:'invalid'})),/\[PREWRITE_REJECTED\].*valid call outcome/);assert.deepEqual(plain(s.c.getPendingCallWorkflows()),[]);
 assert.throws(()=>s.c.completeCall(call(s,{request_id:'stale',expected_updated_at:'old-version'})),/\[PREWRITE_REJECTED\].*changed/);assert.deepEqual(plain(s.c.getPendingCallWorkflows()),[]);
 s.fail('Reminders');assert.throws(()=>s.c.scheduleFollowUps({lead_id:s.lead.id,expected_updated_at:s.lead.updated_at,request_id:'recover-schedule',date:'2026-10-04',followUpMode:'default'}),/Injected/);
 assert.equal(s.c.getPendingCallWorkflows()[0].isCall,false);
 assert.throws(()=>s.c.resumeFollowUpWorkflow({lead_id:'someone-else',request_id:'recover-schedule'}),/conflict|business/i);
 const out=s.c.resumeFollowUpWorkflow({lead_id:s.lead.id,request_id:'recover-schedule'});assert.equal(out.lead.follow_up,'2026-10-07');assert.equal(s.c.records_('Activities').length,0);
});
test('a failed durability flush retains the recovery journal until a successful receipt flush',()=>{
 const s=service();let failures=1;s.c.SpreadsheetApp.flush=()=>{if(failures-->0)throw Error('Injected durability flush failure');};
 const input=call(s,{request_id:'flush-recovery'});assert.throws(()=>s.c.completeCall(input),/durability flush failure/);
 assert.equal(s.c.getPendingCallWorkflows()[0].request_id,'flush-recovery');
 failures=1;assert.throws(()=>s.c.resumeFollowUpWorkflow({lead_id:s.lead.id,request_id:'flush-recovery'}),/durability flush failure/);
 assert.equal(s.c.getPendingCallWorkflows().length,1);
 const recovered=s.c.resumeFollowUpWorkflow({lead_id:s.lead.id,request_id:'flush-recovery'});
 assert.equal(recovered.activity.type,'call');assert.deepEqual(plain(s.c.getPendingCallWorkflows()),[]);assert.equal(s.c.records_('Activities').length,1);
});
