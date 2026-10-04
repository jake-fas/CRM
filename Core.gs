var INDUSTRIES = [
  // Keep the original six IDs and order for existing saved preferences and source rows.
  {id:'restaurant',label:'Restaurants',group:'Food & drink',googleType:'restaurant'},
  {id:'car_repair',label:'Auto repair shops',group:'Automotive',googleType:'car_repair'},
  {id:'hotel',label:'Hotels',group:'Hospitality',googleType:'hotel',googleRelevance:true},
  {id:'gym',label:'Gyms & fitness',group:'Health & wellness',googleType:'gym'},
  {id:'dentist',label:'Dentists',group:'Health & wellness',googleType:'dentist'},
  {id:'school',label:'Schools',group:'Education & childcare',googleType:'school'},
  {id:'cafe',label:'Cafes',group:'Food & drink',googleType:'cafe'},
  {id:'coffee_shop',label:'Coffee shops',group:'Food & drink',googleType:'coffee_shop'},
  {id:'bakery',label:'Bakeries',group:'Food & drink',googleType:'bakery'},
  {id:'bar',label:'Bars',group:'Food & drink',googleType:'bar'},
  {id:'bar_and_grill',label:'Bars & grills',group:'Food & drink',googleType:'bar_and_grill'},
  {id:'pub',label:'Pubs',group:'Food & drink',googleType:'pub'},
  {id:'brewery',label:'Breweries',group:'Food & drink',googleType:'brewery'},
  {id:'fast_food_restaurant',label:'Fast food restaurants',group:'Food & drink',googleType:'fast_food_restaurant'},
  {id:'pizza_restaurant',label:'Pizza restaurants',group:'Food & drink',googleType:'pizza_restaurant'},
  {id:'sandwich_shop',label:'Sandwich shops',group:'Food & drink',googleType:'sandwich_shop'},
  {id:'deli',label:'Delis',group:'Food & drink',googleType:'deli'},
  {id:'diner',label:'Diners',group:'Food & drink',googleType:'diner'},
  {id:'breakfast_restaurant',label:'Breakfast restaurants',group:'Food & drink',googleType:'breakfast_restaurant'},
  {id:'fine_dining_restaurant',label:'Fine dining restaurants',group:'Food & drink',googleType:'fine_dining_restaurant'},
  {id:'steak_house',label:'Steakhouses',group:'Food & drink',googleType:'steak_house'},
  {id:'seafood_restaurant',label:'Seafood restaurants',group:'Food & drink',googleType:'seafood_restaurant'},
  {id:'mexican_restaurant',label:'Mexican restaurants',group:'Food & drink',googleType:'mexican_restaurant'},
  {id:'italian_restaurant',label:'Italian restaurants',group:'Food & drink',googleType:'italian_restaurant'},
  {id:'chinese_restaurant',label:'Chinese restaurants',group:'Food & drink',googleType:'chinese_restaurant'},
  {id:'japanese_restaurant',label:'Japanese restaurants',group:'Food & drink',googleType:'japanese_restaurant'},
  {id:'catering_service',label:'Caterers',group:'Food & drink',googleType:'catering_service'},
  {id:'car_dealer',label:'Auto dealerships',group:'Automotive',googleType:'car_dealer'},
  {id:'truck_dealer',label:'Truck dealerships',group:'Automotive',googleType:'truck_dealer'},
  {id:'tire_shop',label:'Tire shops & services',group:'Automotive',googleType:'tire_shop'},
  {id:'car_wash',label:'Car washes',group:'Automotive',googleType:'car_wash'},
  {id:'auto_parts_store',label:'Auto parts stores',group:'Automotive',googleType:'auto_parts_store'},
  {id:'gas_station',label:'Gas stations',group:'Automotive',googleType:'gas_station'},
  {id:'truck_stop',label:'Truck stops',group:'Automotive',googleType:'truck_stop'},
  {id:'motel',label:'Motels',group:'Hospitality',googleType:'motel',googleRelevance:true},
  {id:'extended_stay_hotel',label:'Extended stay hotels',group:'Hospitality',googleType:'extended_stay_hotel',googleRelevance:true},
  {id:'resort_hotel',label:'Resort hotels',group:'Hospitality',googleType:'resort_hotel',googleRelevance:true},
  {id:'bed_and_breakfast',label:'Bed & breakfasts',group:'Hospitality',googleType:'bed_and_breakfast',googleRelevance:true},
  {id:'event_venue',label:'Event venues',group:'Hospitality',googleType:'event_venue'},
  {id:'banquet_hall',label:'Banquet halls',group:'Hospitality',googleType:'banquet_hall'},
  {id:'fitness_center',label:'Fitness centers',group:'Health & wellness',googleType:'fitness_center'},
  {id:'yoga_studio',label:'Yoga studios',group:'Health & wellness',googleType:'yoga_studio'},
  {id:'medical_clinic',label:'Medical clinics',group:'Health & wellness',googleType:'medical_clinic'},
  {id:'doctor',label:'Doctors offices',group:'Health & wellness',googleType:'doctor'},
  {id:'hospital',label:'Hospitals',group:'Health & wellness',googleType:'hospital'},
  {id:'medical_lab',label:'Medical labs',group:'Health & wellness',googleType:'medical_lab'},
  {id:'chiropractor',label:'Chiropractors',group:'Health & wellness',googleType:'chiropractor'},
  {id:'physiotherapist',label:'Physical therapy clinics',group:'Health & wellness',googleType:'physiotherapist'},
  {id:'veterinary_care',label:'Veterinary clinics',group:'Health & wellness',googleType:'veterinary_care'},
  {id:'spa',label:'Spas',group:'Health & wellness',googleType:'spa'},
  {id:'hair_salon',label:'Hair salons',group:'Health & wellness',googleType:'hair_salon'},
  {id:'nail_salon',label:'Nail salons',group:'Health & wellness',googleType:'nail_salon'},
  {id:'preschool',label:'Preschools',group:'Education & childcare',googleType:'preschool'},
  {id:'child_care_agency',label:'Childcare centers',group:'Education & childcare',googleType:'child_care_agency'},
  {id:'primary_school',label:'Elementary schools',group:'Education & childcare',googleType:'primary_school'},
  {id:'secondary_school',label:'Middle & high schools',group:'Education & childcare',googleType:'secondary_school'},
  {id:'university',label:'Colleges & universities',group:'Education & childcare',googleType:'university'},
  {id:'corporate_office',label:'Corporate offices',group:'Offices & professional',googleType:'corporate_office'},
  {id:'business_center',label:'Business centers',group:'Offices & professional',googleType:'business_center'},
  {id:'coworking_space',label:'Coworking offices',group:'Offices & professional',googleType:'coworking_space'},
  {id:'lawyer',label:'Law offices',group:'Offices & professional',googleType:'lawyer'},
  {id:'accounting',label:'Accounting offices',group:'Offices & professional',googleType:'accounting'},
  {id:'bank',label:'Banks',group:'Offices & professional',googleType:'bank'},
  {id:'insurance_agency',label:'Insurance offices',group:'Offices & professional',googleType:'insurance_agency'},
  {id:'real_estate_agency',label:'Real estate offices',group:'Offices & professional',googleType:'real_estate_agency'},
  {id:'store',label:'Retail stores',group:'Retail',googleType:'store'},
  {id:'grocery_store',label:'Grocery stores',group:'Retail',googleType:'grocery_store'},
  {id:'convenience_store',label:'Convenience stores',group:'Retail',googleType:'convenience_store'},
  {id:'department_store',label:'Department stores',group:'Retail',googleType:'department_store'},
  {id:'hardware_store',label:'Hardware stores',group:'Retail',googleType:'hardware_store'},
  {id:'clothing_store',label:'Clothing stores',group:'Retail',googleType:'clothing_store'},
  {id:'furniture_store',label:'Furniture stores',group:'Retail',googleType:'furniture_store'},
  {id:'pet_store',label:'Pet stores',group:'Retail',googleType:'pet_store'},
  {id:'manufacturer',label:'Manufacturing facilities',group:'Industrial & trade',googleType:'manufacturer'},
  // Google has no warehouse / distribution-center type: use the specific query without a type filter.
  {id:'warehouse',label:'Warehouses & distribution centers',group:'Industrial & trade',googleType:'',googleQuery:'Warehouses and distribution centers'},
  {id:'food_production',label:'Food production facilities',group:'Industrial & trade',googleType:'manufacturer',googleQuery:'Food production facilities'},
  {id:'wholesaler',label:'Wholesalers',group:'Industrial & trade',googleType:'wholesaler'},
  {id:'storage',label:'Storage facilities',group:'Industrial & trade',googleType:'storage'},
  {id:'electrician',label:'Electrical contractors',group:'Industrial & trade',googleType:'electrician'},
  {id:'plumber',label:'Plumbing contractors',group:'Industrial & trade',googleType:'plumber'},
  {id:'roofing_contractor',label:'Roofing contractors',group:'Industrial & trade',googleType:'roofing_contractor'},
  {id:'moving_company',label:'Moving companies',group:'Industrial & trade',googleType:'moving_company'}
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
  var discoveryMode=input.discoveryMode||'prioritized';
  if(['prioritized','general'].indexOf(discoveryMode)<0)throw new Error('Choose General or Prioritized discovery.');
  return {address:address,count:count,radius:radius,industries:industries.slice(),zips:zips,discoveryMode:discoveryMode};
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
   var industry=settings.industries[k],definition=INDUSTRIES.find(function(x){return x.id===industry;}),token='',seenTokens={};
   do{
     var body={textQuery:definition.googleQuery||definition.label,locationBias:{circle:{center:center,radius:settings.radius}},includePureServiceAreaBusinesses:false,languageCode:'en',regionCode:'US',pageSize:Math.min(20,settings.count-places.length)};
     if(definition.googleType)body.includedType=definition.googleType;
     if(!definition.googleRelevance){body.rankPreference='DISTANCE';if(definition.googleType)body.strictTypeFiltering=true;}
     if(token)body.pageToken=token;
     var result=deps.search(body);requests++;
     var batch=Array.isArray(result.places)?result.places:[];
     places=places.concat(batch.slice(0,body.pageSize));
     token=result.nextPageToken||'';
     if(!batch.length||seenTokens[token])break;
     seenTokens[token]=true;
   }while(token&&places.length<settings.count&&requests<requestLimit);
 }
 return {places:places,rawCount:places.length,searchRequests:requests,geocodeRequests:1,estimatedGrossUsd:Math.round((requests*.035+.005)*1000)/1000,ranking:settings.industries.length>1?'industry_priority':INDUSTRIES.find(function(x){return x.id===settings.industries[0];}).googleRelevance?'relevance':'distance',requestCapReached:requests===MAX_SEARCH_REQUESTS&&places.length<settings.count,budgetCapReached:remainingSearchRequests!==undefined&&requests===remainingSearchRequests&&places.length<settings.count};
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
