const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(extra={}){const c=vm.createContext({Date,JSON,Math,...extra});for(const f of ['Core.gs','Catalog.gs','Apify.gs'])if(fs.existsSync(path.join(__dirname,'..',f)))vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);return c;}
const item={placeId:'ChIJfixture',title:'Fictional Coffee',address:'1 Example St, Boulder, CO 80301',phone:'(303) 555-0100',phoneUnformatted:'+13035550100',postalCode:'80301',countryCode:'US',location:{lat:40,lng:-105},reviews:[{text:'do not retain'}],ownerUpdates:['do not retain']};
test('Apify normalization selects public phone, excludes personal/add-on payloads and does not invent a license',()=>{
 const c=load(),p=c.normalizeApifyPlace_(item,'restaurant',[]);assert.equal(p.phone,item.phoneUnformatted);assert.equal(p.id,'apify:ChIJfixture');assert.equal(p.license,'rights-unverified');assert.equal(p.source,'apify');assert.equal(p.reviews,undefined);assert.equal(p.contact_name,undefined);
 assert.equal(c.normalizeApifyPlace_({...item,location:{lat:91,lng:0}},'restaurant',[]),null);assert.equal(c.normalizeApifyPlace_({...item,permanentlyClosed:true},'restaurant',[]),null);
});
test('Overture phone fallback requires matching name, ZIP and nearby coordinates; never replaces an existing phone',()=>{
 const c=load(),fallback={id:'overture:fixture',name:item.title,address:item.address,zip:'80301',latitude:40,longitude:-105,phone:'+13035550199',operating_status:'open'};
 const missing={...item,phone:'',phoneUnformatted:''};assert.equal(c.normalizeApifyPlace_(missing,'restaurant',[fallback]).phone,fallback.phone);
 assert.equal(c.normalizeApifyPlace_(missing,'restaurant',[{...fallback,name:'Other business'}]).phone,'');assert.equal(c.normalizeApifyPlace_(missing,'restaurant',[{...fallback,latitude:41}]).phone,'');assert.equal(c.normalizeApifyPlace_(item,'restaurant',[fallback]).phone,item.phoneUnformatted);
 assert.equal(c.normalizeApifyPlace_(missing,'restaurant',[{...fallback,address:'2 Example St, Boulder, CO 80301'}]).phone,'');
});
test('Apify request uses one industry and remaining count, no enrichment, explicit radius and capped charge',()=>{
 const c=load(),p=c.apifyActorInput_({count:50,radius:3000,industries:['car_repair','restaurant']},{latitude:40,longitude:-105},1,17);
 assert.deepEqual(Array.from(p.searchStringsArray),['Restaurants']);assert.equal(p.maxCrawledPlacesPerSearch,17);assert.equal(p.customGeolocation.radiusKm,3);assert.equal(p.scrapeContacts,false);assert.equal(p.scrapePlaceDetailPage,false);assert.equal(p.maxReviews,0);
 let request;const d=load({UrlFetchApp:{fetch:(url,options)=>{request={url,options};return {getResponseCode:()=>201,getContentText:()=>JSON.stringify({data:{id:'run1'}})};}}});d.apifyRequest_('private-token','actors/compass~crawler-google-places/runs?maxTotalChargeUsd=0.125&restartOnError=false','post',p);
 assert.ok(!request.url.includes('private-token'));assert.equal(request.options.headers.Authorization,'Bearer private-token');
 const e=load({UrlFetchApp:{fetch:()=>{throw new Error('private-token');}}});assert.throws(()=>e.apifyRequest_('private-token','actors/x/runs','post',{}),err=>!err.message.includes('private-token'));
});
test('exclusions recognize an underlying Google place ID in Apify and match branch facts across source namespaces',()=>{
 const c=load(),p={id:'apify:ChIJfixture',displayName:{text:item.title},formattedAddress:item.address};assert.equal(c.matchesExclusion(p,{place_id:'ChIJfixture'}),true);assert.equal(c.matchesExclusion(p,{place_id:'overture:fixture',name:item.title,address:item.address}),true);
});
