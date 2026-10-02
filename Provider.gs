var GOOGLE_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.regularOpeningHours,places.attributions,nextPageToken';
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
