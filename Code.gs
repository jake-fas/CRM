var TABLES_ = {
 CRM:['id','place_id','business_name','address','phone','contact_name','contact_role','competitor','status','next_plan','follow_up','created_at','updated_at','request_id'],
 Activities:['id','lead_id','type','date','notes','created_at','request_id'],
 Exclusions:['place_id','name','address','reason'],
 Catalog:['id','name','address','phone','website','latitude','longitude','industry','zip','source','release','source_dataset','license','retrieved_at','confidence','operating_status'],
 ApifyBusinesses:['id','name','address','phone','latitude','longitude','industry','zip','source','license','retrieved_at','phone_source','phone_observed_at','operating_status']
};
function authorize_(){
 var props=PropertiesService.getScriptProperties();
 var email=String(Session.getActiveUser().getEmail()||'').toLowerCase();
 var allowed=(props.getProperty('ALLOWED_EMAILS')||'').toLowerCase().split(/[,;\s]+/).filter(Boolean);
 if(!email||allowed.indexOf(email)<0)throw new Error('Access denied. Sign in with a configured tester account.');
 return props;
}
function locked_(fn,readOnly){
 var lock=LockService.getScriptLock();
 if(!lock.tryLock(1000))throw new Error('Another request is running. Wait before trying again.');
 try{return fn();}finally{try{if(!readOnly)SpreadsheetApp.flush();}finally{lock.releaseLock();}}
}
var spreadsheetBinding_;
function sheet_(name,skipHeaders){
 var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
 if(!id)throw new Error('Run setup_ from the bound Sheet script first.');
 if(!spreadsheetBinding_||spreadsheetBinding_.id!==id)spreadsheetBinding_={id:id,value:SpreadsheetApp.openById(id)};
 var ss=spreadsheetBinding_.value,s=ss.getSheetByName(name);
 if(!s){s=ss.insertSheet(name);s.getRange(1,1,1,TABLES_[name].length).setValues([TABLES_[name]]);s.setFrozenRows(1);}
 if(skipHeaders!==true)validateHeaders_(name,s.getDataRange().getValues()[0]);
 return s;
}
function records_(name){
 var values=sheet_(name,true).getDataRange().getValues();
 validateHeaders_(name,values[0]);
 return values.slice(1).filter(function(r){return r.some(function(v){return v!=='';});}).map(function(r){var x={};TABLES_[name].forEach(function(h,i){x[h]=r[i]==null?'':String(r[i]);});return x;});
}
function validateHeaders_(name,headers){if(JSON.stringify(headers)!==JSON.stringify(TABLES_[name]))throw new Error(name+' headers were changed. Restore the documented headers before continuing.');}
function writeRecords_(name,records){
 if(records.length>4000)throw new Error('Pilot capacity reached. Ask the builder to expand the storage design.');
 var s=sheet_(name);if(!records.length)return;
 var rows=records.map(function(x){return TABLES_[name].map(function(h){return literalCell(x[h]);});});
 ensureGrid_(s,rows.length+1,TABLES_[name].length);
 s.getRange(2,1,rows.length,TABLES_[name].length).setNumberFormat('@').setValues(rows);
}
function appendRecord_(name,record){
 var s=sheet_(name);if(s.getLastRow()>10000)throw new Error('Activity capacity reached.');
 ensureGrid_(s,s.getLastRow()+1,TABLES_[name].length);
 s.getRange(s.getLastRow()+1,1,1,TABLES_[name].length).setNumberFormat('@').setValues([TABLES_[name].map(function(h){return literalCell(record[h]);})]);
}
function ensureGrid_(sheet,lastRow,lastColumn){
 var rows=sheet.getMaxRows(),columns=sheet.getMaxColumns();
 if(lastRow>rows)sheet.insertRowsAfter(rows,lastRow-rows);
 if(lastColumn>columns)sheet.insertColumnsAfter(columns,lastColumn-columns);
}
// Editor-only: create configuration names without obtaining keys or exposing existing values.
function configuredProperty_(props,name){var value=String(props.getProperty(name)||'').trim();return value==='NOT_CONFIGURED'?'':value;}
function initializeProperties_(){
 var active=SpreadsheetApp.getActiveSpreadsheet();if(!active)throw new Error('Open this script from Extensions > Apps Script in your Sheet.');
 var email=String(Session.getActiveUser().getEmail()||'').toLowerCase();if(!email)throw new Error('Sign in to Google before initializing the script.');
 var props=PropertiesService.getScriptProperties(),defaults={ALLOWED_EMAILS:email,SPREADSHEET_ID:active.getId(),APIFY_TOKEN:'',GOOGLE_MAPS_API_KEY:'',PRIVACY_URL:'',TERMS_URL:'',DAILY_APIFY_RUN_LIMIT:'1',DAILY_GEOCODE_LIMIT:'3',DAILY_SEARCH_LIMIT:'0'};
 Object.keys(defaults).forEach(function(name){var value=props.getProperty(name);if(value===null||value==='NOT_CONFIGURED'&&defaults[name]==='')props.setProperty(name,defaults[name]);});
 return {properties:Object.keys(defaults),credentialsCreated:false};
}
// Select setupCRM in the editor. The public wrapper requires the configured allowlist;
// the underlying underscore helpers cannot be called through google.script.run.
function setupCRM(){authorize_();return setup_();}
function setup_(){
 initializeProperties_();
 authorize_();
 var active=SpreadsheetApp.getActiveSpreadsheet();if(!active)throw new Error('Open this script from Extensions > Apps Script in your Sheet.');
 PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',active.getId());
 locked_(function(){Object.keys(TABLES_).forEach(sheet_);});
}
function doGet(){
 var initial=getInitialState();
 var html=HtmlService.createHtmlOutputFromFile('Index').getContent().replace('<!-- INITIAL_STATE -->',function(){return '<script>var fieldbookInitialState='+initialJSON_(initial)+';</script>';});
 return HtmlService.createHtmlOutput(html).setTitle('Fieldbook — Sales CRM').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function initialJSON_(value){return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,function(c){return '\\u'+c.charCodeAt(0).toString(16).padStart(4,'0');});}
function getInitialState(){var props=authorize_();return locked_(function(){return {boot:bootstrapSnapshot_(props),crm:crmSnapshot_(false)};},true);}
function today_(){return Utilities.formatDate(new Date(),'America/Denver','yyyy-MM-dd');}
function preferences_(){
 var raw=PropertiesService.getScriptProperties().getProperty('INDUSTRY_PREFERENCES');
 if(raw){try{return JSON.parse(raw);}catch(e){throw new Error('Saved industry settings are invalid. Ask the builder to reset them.');}}
 return INDUSTRIES.map(function(x,i){return {id:x.id,label:x.label,included:i<2};});
}
function getBootstrap(){
 var props=authorize_();return locked_(function(){return bootstrapSnapshot_(props);},true);
}
function bootstrapSnapshot_(props){
 var active=props.getProperty('APIFY_SEARCH');active=active?JSON.parse(active):null;
 return {industries:preferences_(),statuses:CRM_STATUSES,activityTypes:ACTIVITY_TYPES,today:today_(),configured:!!configuredProperty_(props,'GOOGLE_MAPS_API_KEY')&&policiesConfigured_(props),apifyConfigured:!!configuredProperty_(props,'APIFY_TOKEN'),pendingApifyJob:active&&['running','advance'].indexOf(active.stage)>=0?active.id:'',privacyUrl:props.getProperty('PRIVACY_URL')||'',termsUrl:props.getProperty('TERMS_URL')||'',exclusionCount:records_('Exclusions').length,catalogCount:records_('Catalog').length,demo:false};
}
function policiesConfigured_(props){return /^https:\/\//.test(props.getProperty('PRIVACY_URL')||'')&&/^https:\/\//.test(props.getProperty('TERMS_URL')||'');}
function saveIndustryPreferences(order){
 authorize_();if(!Array.isArray(order)||order.length!==INDUSTRIES.length)throw new Error('Keep every industry in the priority list.');
 var seen={};var clean=order.map(function(x){var industry=INDUSTRIES.find(function(y){return y.id===x.id;});if(!industry||seen[x.id]||typeof x.included!=='boolean')throw new Error('Invalid industry priorities.');seen[x.id]=true;return {id:x.id,label:industry.label,included:x.included};});
 if(!clean.some(function(x){return x.included;}))throw new Error('Include at least one industry.');
 locked_(function(){PropertiesService.getScriptProperties().setProperty('INDUSTRY_PREFERENCES',JSON.stringify(clean));});return clean;
}
function checkRequestBudget_(kind,reserve){
 var props=PropertiesService.getScriptProperties(),day=today_(),field=kind==='search'?'search':'geocode';
 var raw=props.getProperty('DAILY_USAGE');var usage=raw?JSON.parse(raw):{day:day,search:0,geocode:0};
 if(usage.day!==day)usage={day:day,search:0,geocode:0};
 var configured=props.getProperty(field==='search'?'DAILY_SEARCH_LIMIT':'DAILY_GEOCODE_LIMIT');
 var limit=configured===null?(field==='search'?30:10):Number(configured);
 if(!Number.isInteger(limit)||limit<0)throw new Error('Invalid server quota configuration.');
 if(usage[field]>=limit)throw new Error('Daily '+field+' request limit reached. No further request was sent.');
 if(reserve){usage[field]++;props.setProperty('DAILY_USAGE',JSON.stringify(usage));}
 return limit-usage[field];
}
function reserveRequest_(kind){checkRequestBudget_(kind,true);}
function generateLeads(input){
 var props=authorize_(),settings=validateRequest(input),key=configuredProperty_(props,'GOOGLE_MAPS_API_KEY');
 if(!key)throw new Error('Google API key is not configured. The builder must finish setup.');
 if(!policiesConfigured_(props))throw new Error('Public privacy policy and terms URLs must be configured before Google lookup.');
 return locked_(function(){
   var remainingSearchRequests=checkRequestBudget_('search',false);checkRequestBudget_('geocode',false);
   var exclusions=records_('Exclusions');
   records_('CRM').filter(function(x){return BLOCKED_STATUSES.indexOf(x.status)>=0;}).forEach(function(x){exclusions.push({place_id:x.place_id,name:x.business_name,address:x.address,reason:x.status});});
   var out=acquireCandidates(settings,googleDependencies(key,reserveRequest_),remainingSearchRequests);
   var filtered=filterCandidates(out.places,exclusions,settings.zips);
   delete out.places;return Object.assign(out,filtered,{requested:settings.count,generatedAt:new Date().toISOString(),demo:false});
 });
}
function importExclusions(csv){
 authorize_();var incoming=parseExclusions(csv);
 return locked_(function(){
  var existing=records_('Exclusions'),map={};existing.concat(incoming).forEach(function(x){map[exclusionKey(x)]=x;});
  var merged=Object.keys(map).map(function(k){return map[k];});if(merged.length>2000)throw new Error('Exclusion limit: 2,000 records.');
  writeRecords_('Exclusions',merged);return {count:merged.length};
 });
}
function getCRM(includeActivities){
 authorize_();return locked_(function(){return crmSnapshot_(includeActivities);},true);
}
function crmSnapshot_(includeActivities){var today=today_();return {leads:records_('CRM').map(function(x){return Object.assign(x,{due_bucket:followUpBucket(x,today)});}),activities:includeActivities===false?[]:records_('Activities'),today:today};
}
function getLeadActivities(leadId){
 authorize_();leadId=textValue(leadId,100);
 return locked_(function(){if(!records_('CRM').some(function(x){return x.id===leadId;}))throw new Error('Choose an existing CRM business.');return records_('Activities').filter(function(x){return x.lead_id===leadId;});},true);
}
function saveLead(record){
 authorize_();var clean=validateLead(record);var token=textValue(record&&record.request_id,100);
 return locked_(function(){
   var rows=records_('CRM'),index=rows.findIndex(function(x){return clean.id&&x.id===clean.id;});
   if(clean.id&&index<0)throw new Error('CRM record no longer exists. Refresh before saving.');
   if(!clean.id&&token){var repeated=rows.find(function(x){return x.request_id===token;});if(repeated)return repeated;}
   if(clean.place_id&&rows.some(function(x){return x.place_id===clean.place_id&&x.id!==clean.id;}))throw new Error('This location already has a CRM record. Refresh My CRM and open the existing business.');
   var previous=index>=0?rows[index]:null;
   if(previous&&textValue(record.expected_updated_at,100)!==previous.updated_at)throw new Error('This business changed since you opened it. Close the editor, refresh My CRM, and reopen it before saving. Your draft is still in the editor.');
   var now=new Date().getTime(),previousTime=previous?Date.parse(previous.updated_at):NaN;
   var saved=Object.assign(clean,{id:previous?previous.id:Utilities.getUuid(),created_at:previous?previous.created_at:new Date(now).toISOString(),updated_at:new Date(Number.isFinite(previousTime)?Math.max(now,previousTime+1):now).toISOString(),request_id:previous?previous.request_id:token});
   if(index>=0)rows[index]=saved;else rows.push(saved);
   writeRecords_('CRM',rows);return saved;
 });
}
function logActivity(activity){
 authorize_();activity=activity||{};
 var leadId=textValue(activity.lead_id,100),type=textValue(activity.type,50),date=dateValue(activity.date),notes=textValue(activity.notes,5000),token=textValue(activity.request_id,100);
 if(ACTIVITY_TYPES.indexOf(type)<0||!date||!token)throw new Error('Activity needs a type, valid date, and submission ID.');
 return locked_(function(){
   if(!records_('CRM').some(function(x){return x.id===leadId;}))throw new Error('Choose an existing CRM business.');
   var existing=records_('Activities').find(function(x){return x.request_id===token;});if(existing){if(existing.lead_id!==leadId)throw new Error('Activity submission ID conflict.');return existing;}
   var x={id:Utilities.getUuid(),lead_id:leadId,type:type,date:date,notes:notes,created_at:new Date().toISOString(),request_id:token};appendRecord_('Activities',x);return x;
 });
}
