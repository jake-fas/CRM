// Only the openly licensed Overture Places snapshot belongs in this table.
var CATALOG_HEADERS = ['id','name','address','phone','website','latitude','longitude','industry','zip','source','release','source_dataset','license','retrieved_at','confidence','operating_status'];
var OVERTURE_LICENSES = {meta:'CDLA-Permissive-2.0',microsoft:'CDLA-Permissive-2.0',pinmeto:'CDLA-Permissive-2.0',krick:'CDLA-Permissive-2.0',renderseo:'CDLA-Permissive-2.0',dac:'CDLA-Permissive-2.0',brightquery:'CDLA-Permissive-2.0',overture:'CDLA-Permissive-2.0','overture-signals':'CDLA-Permissive-2.0',foursquare:'Apache-2.0',alltheplaces:'CC0-1.0'};
function overtureIndustry(properties){
 var labels=[properties.basic_category,properties.taxonomy&&properties.taxonomy.primary].concat(properties.taxonomy&&properties.taxonomy.hierarchy||[],properties.taxonomy&&properties.taxonomy.alternates||[],properties.categories&&properties.categories.primary||'').filter(Boolean);
 if(labels.some(function(x){return /^(restaurant|cafe|coffee_shop|fast_food_restaurant)$/.test(x);}))return 'restaurant';
 if(labels.some(function(x){return /^(auto_repair|auto_repair_shop|car_repair|automotive_repair|automotive_repair_and_maintenance|automotive_service)$/.test(x);}))return 'car_repair';
 if(labels.some(function(x){return /^(hotel|motel)$/.test(x);}))return 'hotel';
 if(labels.some(function(x){return /^(gym|fitness_center|fitness_studio|pilates_studio|yoga_studio)$/.test(x);}))return 'gym';
 if(labels.some(function(x){return /^(dentist|dental_clinic|dental_office)$/.test(x);}))return 'dentist';
 if(labels.some(function(x){return /^(school|primary_school|secondary_school|elementary_school|high_school|middle_school)$/.test(x);}))return 'school';
 return '';
}
function parseCatalogSnapshot(json){
 if(typeof json!=='string'||json.length>5000000)throw new Error('Catalog limit: 5 MB.');
 var pack;try{pack=JSON.parse(json);}catch(e){throw new Error('Catalog must be valid JSON.');}
 if(!pack||pack.schema!=='fieldbook-overture-v1'||!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(pack.release||'')||!Array.isArray(pack.places)||!pack.places.length||pack.places.length>4000)throw new Error('Use a converted Overture snapshot with 1–4,000 places and a release date.');
 var seen={};return pack.places.map(function(p){
  if(!p||p.source!=='overture'||!/^overture:[a-zA-Z0-9-]+$/.test(p.id||'')||seen[p.id]||p.release!==pack.release)throw new Error('Invalid catalog source, release or duplicate ID.');seen[p.id]=true;
  var datasets=String(p.source_dataset||'').split('|'),licenses=String(p.license||'').split('|');
  var expected=datasets.map(function(d){return OVERTURE_LICENSES[d.toLowerCase()];});
  if(!datasets.length||expected.some(function(x){return !x;})||Array.from(new Set(expected)).sort().join('|')!==licenses.slice().sort().join('|'))throw new Error('Unsupported catalog dataset or license. Do not import Google or Apify exports here.');
  if(typeof p.latitude!=='number'||typeof p.longitude!=='number'||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)throw new Error('Invalid catalog coordinates.');
  if(!INDUSTRIES.some(function(x){return x.id===p.industry;})||typeof p.confidence!=='number'||p.confidence<.8||p.confidence>1||p.operating_status==='permanently_closed')throw new Error('Unsupported industry, closed place or insufficient confidence.');
  var x={};CATALOG_HEADERS.forEach(function(h){x[h]=textValue(p[h],h==='address'?500:500);});
  if(!x.name||!x.address||!/^\d{5}$/.test(x.zip))throw new Error('Each catalog place needs a name, full address and US ZIP.');
  if(x.website&&!/^https?:\/\//i.test(x.website))throw new Error('Invalid catalog website.');
  x.retrieved_at=new Date().toISOString();return x;
 });
}
function distanceMeters_(a,b){
 var rad=Math.PI/180,dlat=(b.latitude-a.latitude)*rad,dlon=(b.longitude-a.longitude)*rad;
 var v=Math.sin(dlat/2)*Math.sin(dlat/2)+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)*Math.sin(dlon/2);
 return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));
}
function selectCatalogCandidates(rows,settings,center){
 if(!center||!Number.isFinite(center.latitude)||!Number.isFinite(center.longitude))throw new Error('Starting address could not be located.');
 var selected=rows.map(function(p){return {p:p,priority:settings.industries.indexOf(p.industry),distance:distanceMeters_(center,{latitude:Number(p.latitude),longitude:Number(p.longitude)})};}).filter(function(x){return x.priority>=0&&x.p.operating_status!=='permanently_closed'&&Number.isFinite(x.distance)&&x.distance<=settings.radius&&(!settings.zips.length||settings.zips.indexOf(x.p.zip)>=0);}).sort(function(a,b){return a.priority-b.priority||a.distance-b.distance||a.p.id.localeCompare(b.p.id);}).slice(0,settings.count);
 var places=selected.map(function(x){var p=x.p;return {id:p.id,displayName:{text:p.name},formattedAddress:p.address,nationalPhoneNumber:p.phone,websiteUri:p.website,addressComponents:[{types:['postal_code'],shortText:p.zip}],primaryTypeDisplayName:{text:INDUSTRIES.find(function(i){return i.id===p.industry;}).label},retentionAllowed:true,source:'overture',sourceRelease:p.release,sourceDatasets:p.source_dataset,sourceLicense:p.license,distanceMeters:Math.round(x.distance),attributions:[{provider:'Overture Maps · '+p.source_dataset+' · '+p.license,providerUri:'https://docs.overturemaps.org/attribution/'}]};});
 return {places:places,rawCount:places.length,searchRequests:0,geocodeRequests:1,estimatedGrossUsd:0,ranking:'catalog_priority_distance',requestCapReached:false,budgetCapReached:false,provider:'overture'};
}
function importCatalog(json){
 authorize_();var rows=parseCatalogSnapshot(json);
 return locked_(function(){var s=sheet_('Catalog'),oldLast=s.getLastRow();writeRecords_('Catalog',rows);if(oldLast>rows.length+1)s.getRange(rows.length+2,1,oldLast-rows.length-1,CATALOG_HEADERS.length).clearContent();return {count:rows.length,release:rows[0].release};});
}
function generateCatalogLeads(input){
 authorize_();var settings=validateRequest(input);
 return locked_(function(){
  var rows=records_('Catalog');if(!rows.length)throw new Error('Import a licensed Overture territory snapshot first.');
  checkRequestBudget_('geocode',false);var center=censusGeocode(settings.address,reserveRequest_);
  var out=selectCatalogCandidates(rows,settings,center),exclusions=records_('Exclusions');
  records_('CRM').filter(function(x){return BLOCKED_STATUSES.indexOf(x.status)>=0;}).forEach(function(x){exclusions.push({place_id:x.place_id,name:x.business_name,address:x.address,reason:x.status});});
  var filtered=filterCandidates(out.places,exclusions,settings.zips);delete out.places;return Object.assign(out,filtered,{requested:settings.count,generatedAt:new Date().toISOString(),demo:false});
 });
}
