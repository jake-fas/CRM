var GOOGLE_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.regularOpeningHours,places.attributions,nextPageToken';
// Free U.S. address lookup. Street-range coordinates are approximate, not rooftop positions.
function censusGeocode(address,reserve){
 reserve('geocode');var response,data;
 try{response=UrlFetchApp.fetch('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address='+encodeURIComponent(address)+'&benchmark=Public_AR_Current&format=json',{muteHttpExceptions:true});}catch(e){throw new Error('Free address lookup is unavailable. No paid fallback or retry was sent.');}
 if(response.getResponseCode()!==200)throw new Error('Free address lookup failed. Try again later; no paid fallback was used.');
 try{data=JSON.parse(response.getContentText());}catch(e){throw new Error('Free address lookup returned an unreadable response.');}
 var matches=data&&data.result&&data.result.addressMatches;
 if(!Array.isArray(matches)||matches.length!==1)throw new Error('Address did not match one clear U.S. location. Enter a full street address, city, state and ZIP. No Apify run was started.');
 var p=matches[0].coordinates||{};
 if(typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>180||Math.abs(p.y)>90)throw new Error('Free address lookup returned invalid coordinates.');
 return {latitude:p.y,longitude:p.x};
}
function googleDependencies(key,reserve){
 function request(url,options,kind){
   reserve(kind);
   var response;
   try{response=UrlFetchApp.fetch(url,options);}catch(e){throw new Error('Google request failed. No automatic retry was made.');}
   var code=response.getResponseCode();
   if(code<200||code>=300)throw new Error('Google request failed (HTTP '+code+'). Check API configuration and quotas; this attempt may count toward usage.');
   try{return JSON.parse(response.getContentText());}catch(e){throw new Error('Google returned an unreadable response.');}
 }
 return {
   geocode:function(address){
     var r=request('https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(address)+'&key='+encodeURIComponent(key),{muteHttpExceptions:true},'geocode');
     if(r.status!=='OK'||!r.results||!r.results.length)throw new Error('Address lookup failed. Check the street address and Google configuration.');
     var first=r.results[0];if(first.partial_match)throw new Error('Address only partially matched. Enter a more specific street address.');
     var p=first.geometry.location;return {latitude:p.lat,longitude:p.lng};
   },
   search:function(body){return request('https://places.googleapis.com/v1/places:searchText',{method:'post',contentType:'application/json',headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':GOOGLE_FIELDS},payload:JSON.stringify(body),muteHttpExceptions:true},'search');}
 };
}
