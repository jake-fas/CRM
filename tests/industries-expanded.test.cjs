const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function load(){const c=vm.createContext({console,Date,JSON,Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../Core.gs'),'utf8'),c);return c;}
function input(industries,count=60){return {address:'123 Example St, Boulder, CO',industries,count,radius:3000,zips:''};}
function run(c,ids,search,count=60,budget){return c.acquireCandidates(c.validateRequest(input(ids,count)),{geocode:()=>({latitude:40,longitude:-105}),search},budget);}

// Removing an option or a group breaks validation / selectable catalog metadata.
test('expanded sectors validate and carry labels and groups while original IDs stay compatible',()=>{
 const c=load();
 const sectors=['restaurant','car_repair','hotel','gym','dentist','school','cafe','coffee_shop','bar','bakery','pizza_restaurant','fast_food_restaurant','car_dealer','tire_shop','medical_clinic','preschool','child_care_agency','corporate_office','store','manufacturer','warehouse','food_production'];
 const result=c.validateRequest(input(sectors));assert.deepEqual(Array.from(result.industries),sectors);
 for(const id of sectors){const item=c.INDUSTRIES.find(x=>x.id===id);assert.ok(item.label&&item.group);}
 assert.throws(()=>c.validateRequest(input(['cafe','cafe'])));assert.throws(()=>c.validateRequest(input(['unsupported'])));
 assert.throws(()=>c.validateRequest(input(['cafe'],61)));
});

// A custom ID leaking into includedType would cause Google INVALID_ARGUMENT.
test('Google receives documented types and custom sector queries without invented types',()=>{
 const c=load(),calls=[];
 run(c,['tire_shop','medical_clinic','food_production','warehouse'],b=>{calls.push(b);return {places:[]};});
 assert.deepEqual(calls.map(b=>b.includedType),['tire_shop','medical_clinic','manufacturer',undefined]);
 assert.equal(calls[2].textQuery,'Food production facilities');assert.equal(calls[3].textQuery,'Warehouses and distribution centers');
 assert.equal(calls[2].strictTypeFiltering,true);assert.equal(calls[3].strictTypeFiltering,undefined);
});

// The many-selection path must not oversample or send one request per selected category.
test('many selected industries stop at 60 raw rows without fanout after filling',()=>{
 const c=load(),calls=[];let n=0;
 const ids=['cafe','coffee_shop','bar','bakery','car_dealer','tire_shop','medical_clinic','preschool'];
 const out=run(c,ids,b=>{calls.push(b);return {places:Array.from({length:b.pageSize},()=>({id:'p'+(++n)})),nextPageToken:'next'+n};});
 assert.equal(out.rawCount,60);assert.equal(out.searchRequests,3);assert.deepEqual(calls.map(b=>b.pageSize),[20,20,20]);
 assert.deepEqual(calls.map(b=>b.includedType),['cafe','cafe','cafe']);
});

test('sparse expanded sectors honor six-request ceiling and remaining budget',()=>{
 const c=load(),ids=['cafe','coffee_shop','bar','bakery','car_dealer','tire_shop','medical_clinic','preschool'];
 let calls=0;const out=run(c,ids,()=>{calls++;return {places:[]};});
 assert.equal(calls,6);assert.equal(out.requestCapReached,true);
 calls=0;const bounded=run(c,ids,()=>{calls++;return {places:[]};},60,2);
 assert.equal(calls,2);assert.equal(bounded.budgetCapReached,true);
});

test('hotel subtypes omit unsupported ranking and retain relevance explanation',()=>{
 const c=load();let body;const out=run(c,['extended_stay_hotel'],b=>{body=b;return {places:[]};});
 assert.equal(body.includedType,'extended_stay_hotel');assert.equal(body.rankPreference,undefined);assert.equal(body.strictTypeFiltering,undefined);assert.equal(out.ranking,'relevance');
});
