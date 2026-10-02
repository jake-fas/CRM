var INDUSTRIES = [
  {id:'restaurant',label:'Restaurants'}, {id:'car_repair',label:'Auto repair shops'},
  {id:'hotel',label:'Hotels'}, {id:'gym',label:'Gyms & fitness'},
  {id:'dentist',label:'Dentists'}, {id:'school',label:'Schools'}
];
var CRM_STATUSES = ['prospect','attempting_contact','appointment','not_interested','current_customer','archived','do_not_contact'];
var ACTIVITY_TYPES = ['call','OSV','appointment','decision_maker_meeting','card_left','not_interested','note'];
var BLOCKED_STATUSES = ['current_customer','archived','do_not_contact'];
var MAX_SEARCH_REQUESTS = 6;

function textValue(value,max) {
  var s = value == null ? '' : String(value).trim();
  if(s.length > max) throw new Error('Text is too long (maximum '+max+' characters).');
  return s;
}
function validateRequest(input) {
  input=input||{};
  var address=textValue(input.address,300),count=Number(input.count),radius=Number(input.radius);
  if(!address) throw new Error('Enter a starting address.');
  if(!Number.isInteger(count)||count<1||count>60) throw new Error('Choose 1–60 candidates.');
  if(!Number.isFinite(radius)||radius<100||radius>50000) throw new Error('Radius bias must be 100–50,000 meters.');
  var industries=input.industries||[input.category||'restaurant'];
  if(!Array.isArray(industries)||!industries.length||industries.length>INDUSTRIES.length) throw new Error('Include at least one industry.');
  var seen={};industries.forEach(function(id){
    if(!INDUSTRIES.some(function(x){return x.id===id;})||seen[id]) throw new Error('Invalid or duplicate industry.');seen[id]=true;
  });
  var zips=textValue(input.zips,100).split(/[\s,;]+/).filter(Boolean);
  if(zips.some(function(z){return !/^\d{5}$/.test(z);})||zips.length>8) throw new Error('Enter up to eight five-digit ZIP codes.');
  return {address:address,count:count,radius:radius,industries:industries.slice(),zips:zips};
}
function parseExclusions(csv) {
  if(typeof csv!=='string'||csv.length>1000000) throw new Error('CSV limit: 1 MB.');
  csv=csv.replace(/^\uFEFF/,'');
  var rows=[],row=[],cell='',quoted=false,closed=false;
  for(var i=0;i<=csv.length;i++){
    var ch=i===csv.length?'\n':csv[i];
    if(quoted){if(ch==='"'){if(csv[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else{if(i===csv.length) throw new Error('Unclosed CSV quote.');cell+=ch;}continue;}
    if(ch==='"'){if(cell||closed) throw new Error('Invalid CSV quote.');quoted=true;continue;}
    if(ch===','||ch==='\n'||ch==='\r'){
      row.push(cell);cell='';closed=false;
      if(ch!==','){if(ch==='\r'&&csv[i+1]==='\n')i++;if(row.some(function(x){return x.trim();}))rows.push(row);row=[];}
    }else{if(closed)throw new Error('Unexpected text after CSV quote.');cell+=ch;}
  }
  if(!rows.length) throw new Error('CSV is empty.');
  var headers=rows.shift().map(function(h){return h.trim().toLowerCase().replace(/[ -]/g,'_');});
  if(new Set(headers).size!==headers.length) throw new Error('Duplicate CSV headers.');
  if(headers.indexOf('place_id')<0&&(headers.indexOf('name')<0||headers.indexOf('address')<0)) throw new Error('Use place_id or both name and address headers.');
  if(rows.length>2000) throw new Error('CSV limit: 2,000 records.');
  return rows.map(function(r){
    if(r.length!==headers.length)throw new Error('CSV row has the wrong number of columns.');
    var x={place_id:'',name:'',address:'',reason:''};
    headers.forEach(function(h,i){if(Object.prototype.hasOwnProperty.call(x,h))x[h]=textValue(r[i],500);});
    if(!x.place_id&&(!x.name||!x.address)) throw new Error('Each exclusion needs an ID or a name and full address.');
    return x;
  });
}
function normalized(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function exclusionKey(x){return x.place_id?'id:'+x.place_id:'address:'+normalized(x.name)+'|'+normalized(x.address);}
function matchesExclusion(place,x){
  if(x.place_id&&(x.place_id===place.id||String(x.place_id).replace(/^apify:/,'')===String(place.id).replace(/^apify:/,'')))return true;
  return !!x.name&&!!x.address&&normalized(x.name)===normalized(place.displayName&&place.displayName.text)&&normalized(x.address)===normalized(place.formattedAddress);
}
function filterCandidates(places,exclusions,zips){
 var out={eligible:[],excluded:0,filtered:0,duplicates:0},seen={};
 places.forEach(function(p){
   if(!p.id){out.filtered++;return;}if(seen[p.id]){out.duplicates++;return;}seen[p.id]=true;
   if(exclusions.some(function(x){return matchesExclusion(p,x);})){out.excluded++;return;}
   var zip=(p.addressComponents||[]).find(function(c){return (c.types||[]).indexOf('postal_code')>=0;});
   if((zips.length&&(!zip||zips.indexOf(zip.shortText||zip.longText)<0))||p.businessStatus==='CLOSED_PERMANENTLY'){out.filtered++;return;}
   out.eligible.push(p);
 });return out;
}
function acquireCandidates(settings,deps,remainingSearchRequests){
 var requestLimit=remainingSearchRequests===undefined?MAX_SEARCH_REQUESTS:Math.min(MAX_SEARCH_REQUESTS,remainingSearchRequests);
 var center=deps.geocode(settings.address),places=[],requests=0;
 if(!center||!Number.isFinite(center.latitude)||!Number.isFinite(center.longitude))throw new Error('Starting address could not be located.');
 for(var k=0;k<settings.industries.length&&places.length<settings.count&&requests<requestLimit;k++){
   var industry=settings.industries[k],token='',seenTokens={};
   do{
     var body={textQuery:INDUSTRIES.find(function(x){return x.id===industry;}).label,includedType:industry,locationBias:{circle:{center:center,radius:settings.radius}},includePureServiceAreaBusinesses:false,languageCode:'en',regionCode:'US',pageSize:Math.min(20,settings.count-places.length)};
     if(industry!=='hotel'){body.rankPreference='DISTANCE';body.strictTypeFiltering=true;}
     if(token)body.pageToken=token;
     var result=deps.search(body);requests++;
     var batch=Array.isArray(result.places)?result.places:[];
     places=places.concat(batch.slice(0,body.pageSize));
     token=result.nextPageToken||'';
     if(!batch.length||seenTokens[token])break;
     seenTokens[token]=true;
   }while(token&&places.length<settings.count&&requests<requestLimit);
 }
 return {places:places,rawCount:places.length,searchRequests:requests,geocodeRequests:1,estimatedGrossUsd:Math.round((requests*.035+.005)*1000)/1000,ranking:settings.industries.length>1?'industry_priority':settings.industries[0]==='hotel'?'relevance':'distance',requestCapReached:requests===MAX_SEARCH_REQUESTS&&places.length<settings.count,budgetCapReached:remainingSearchRequests!==undefined&&requests===remainingSearchRequests&&places.length<settings.count};
}
function literalCell(value){var s=value==null?'':String(value);return /^[=+\-@]/.test(s)?"'"+s:s;}
function dateValue(value){
 var s=textValue(value,10);if(!s)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Error('Enter a valid date.');return s;
}
function validateLead(record){
 record=record||{};var status=record.status||'prospect';
 if(CRM_STATUSES.indexOf(status)<0)throw new Error('Invalid lead status.');
 var x={id:textValue(record.id,100),place_id:textValue(record.place_id,300),business_name:textValue(record.business_name,300),address:textValue(record.address,500),phone:textValue(record.phone,60),contact_name:textValue(record.contact_name,200),contact_role:textValue(record.contact_role,200),competitor:textValue(record.competitor,200),status:status,next_plan:textValue(record.next_plan,3000),follow_up:dateValue(record.follow_up)};
 if(!x.business_name)throw new Error('Enter your own business label for this CRM record.');return x;
}
function followUpBucket(lead,today){
 if(BLOCKED_STATUSES.indexOf(lead.status)>=0||!lead.follow_up)return 'none';
 return lead.follow_up<today?'overdue':lead.follow_up===today?'today':'upcoming';
}
