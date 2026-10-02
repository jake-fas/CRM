const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function feature(extra={}) {return {id:'fixture-1',geometry:{type:'Point',coordinates:[-105.27,40.015]},properties:{names:{primary:'Fictional Coffee'},basic_category:'cafe',taxonomy:{hierarchy:['food_and_drink','cafe']},confidence:.9,operating_status:'open',phones:['+13035550100'],websites:['https://example.com'],addresses:[{freeform:'1 Example St',locality:'Boulder',region:'CO',postcode:'80301',country:'US'}],sources:[{dataset:'meta',license:null}],...extra}};}
function load(){const c=vm.createContext({Date,JSON,Math});for(const f of ['Core.gs','Catalog.gs'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);return c;}
test('Overture converter retains public facts and source provenance without inventing manager contacts',()=>{
 const {convertOverture}=require('../tools/convert-overture.cjs');
 const out=convertOverture({type:'FeatureCollection',features:[feature()]},'2026-09-23.1');
 assert.equal(out.places.length,1);const p=out.places[0];assert.equal(p.phone,'+13035550100');assert.equal(p.industry,'restaurant');assert.equal(p.license,'CDLA-Permissive-2.0');assert.equal(p.source_dataset,'meta');assert.equal(p.contact_name,undefined);assert.ok(p.id.startsWith('overture:'));assert.equal(out.release,'2026-09-23.1');
});
test('Overture converter skips unknown licenses, closed/low-confidence places and unrelated categories',()=>{
 const {convertOverture}=require('../tools/convert-overture.cjs');
 const out=convertOverture({features:[feature({sources:[{dataset:'unknown',license:'proprietary'}]}),feature({confidence:.1}),feature({operating_status:'permanently_closed'}),feature({basic_category:'mountain',taxonomy:{hierarchy:['natural','mountain']}})]},'2026-09-23.1');
 assert.equal(out.places.length,0);assert.equal(out.skipped,4);
});
test('catalog import rejects duplicate IDs, invalid coordinates, Google source labels and oversized snapshots',()=>{
 const c=load();const p={id:'overture:fixture-1',name:'Fixture',address:'1 Example St',phone:'',website:'',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 const pack=ps=>JSON.stringify({schema:'fieldbook-overture-v1',release:'2026-09-23.1',places:ps});
 assert.equal(c.parseCatalogSnapshot(pack([p])).length,1);
 for(const ps of [[p,p],[{...p,source:'google'}],[{...p,latitude:91}],[{...p,license:'unrestricted'}],[{...p,source_dataset:'unknown'}]])assert.throws(()=>c.parseCatalogSnapshot(pack(ps)));
 assert.throws(()=>c.parseCatalogSnapshot(' '.repeat(5000001)));
});
test('catalog selection applies industry priority and distance then caps BEFORE exclusions',()=>{
 const c=load();const rows=[{id:'overture:a',name:'A',latitude:40.01,longitude:-105,industry:'restaurant',zip:'80301',operating_status:'open'},{id:'overture:b',name:'B',latitude:40,longitude:-105,industry:'car_repair',zip:'80301',operating_status:'open'},{id:'overture:c',name:'C',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',operating_status:'permanently_closed'}];
 const settings={count:2,radius:3000,industries:['restaurant','car_repair'],zips:['80301']};
 const out=c.selectCatalogCandidates(rows,settings,{latitude:40,longitude:-105});
 assert.deepEqual(Array.from(out.places,p=>p.id),['overture:a','overture:b']);assert.equal(out.places[0].retentionAllowed,true);assert.equal(out.searchRequests,0);
 const filtered=c.filterCandidates(out.places,[{place_id:'overture:a'}],settings.zips);assert.equal(filtered.eligible.length,1);
 assert.equal(c.selectCatalogCandidates(rows,{...settings,radius:100,count:1},{latitude:40,longitude:-105}).places[0].id,'overture:b');
});
