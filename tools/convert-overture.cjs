// Offline conversion of an official Overture Places GeoJSON download. No Google scraping.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),core=vm.createContext({Date,JSON,Math});
for(const f of ['Core.gs','Catalog.gs'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),core);
function convertOverture(data,release,zips=[]){
 if(!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release||''))throw new Error('Supply the exact Overture release, e.g. 2026-09-23.1.');
 if(zips.some(z=>!/^\d{5}$/.test(z)))throw new Error('ZIP filters must be five digits.');
 const features=Array.isArray(data)?data:data.features;if(!Array.isArray(features))throw new Error('Input must be Overture GeoJSON features.');
 const places=[];let skipped=0;
 for(const f of features){
  const p=f.properties||{},a=(p.addresses||[]).find(a=>a.country==='US'&&a.freeform&&a.locality&&a.region&&/^\d{5}$/.test(a.postcode||'')),coords=f.geometry?.coordinates,industry=core.overtureIndustry(p);
  const sources=p.sources||[],datasets=[...new Set(sources.map(s=>s.dataset).filter(Boolean))].sort(),licenses=[];let valid=sources.length>0;
  for(const s of sources){const expected=core.OVERTURE_LICENSES[String(s.dataset||'').toLowerCase()];if(!expected||(s.license&&s.license!==expected))valid=false;else licenses.push(expected);}
  if(!valid||!a||!industry||f.geometry?.type!=='Point'||!coords||!Number.isFinite(coords[0])||!Number.isFinite(coords[1])||typeof p.confidence!=='number'||p.confidence<.8||p.operating_status==='permanently_closed'||!p.names?.primary||(zips.length&&!zips.includes(a.postcode))){skipped++;continue;}
  places.push({id:'overture:'+f.id,name:p.names.primary,address:[a.freeform,a.locality,a.region,a.postcode].join(', '),phone:(p.phones||[])[0]||'',website:(p.websites||[]).find(x=>/^https?:\/\//i.test(x))||'',latitude:coords[1],longitude:coords[0],industry,zip:a.postcode,source:'overture',release,source_dataset:datasets.join('|'),license:[...new Set(licenses)].sort().join('|'),confidence:p.confidence,operating_status:p.operating_status||'unknown'});
 }
 const out={schema:'fieldbook-overture-v1',release,places,skipped};
 if(places.length)core.parseCatalogSnapshot(JSON.stringify(out)); // same validation as the server
 return out;
}
if(require.main===module){
 try{const [input,output,release,zipString='']=process.argv.slice(2);if(!input||!output||!release)throw new Error('Usage: npm run catalog:convert -- input.geojson data/territory.json YYYY-MM-DD.N [80301,80302]');
 const out=convertOverture(JSON.parse(fs.readFileSync(input,'utf8')),release,zipString.split(',').filter(Boolean));if(!out.places.length)throw new Error('No suitable places. Check categories, territory, source licenses and ZIPs.');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(out));
 const licenseDir=path.join(path.dirname(output),'docs','licenses');fs.mkdirSync(licenseDir,{recursive:true});
 for(const f of ['CDLA-Permissive-2.0.txt','Apache-2.0.txt','Foursquare-NOTICE.txt'])fs.copyFileSync(path.join(root,'docs','licenses',f),path.join(licenseDir,f));
 fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(path.dirname(output),'THIRD_PARTY_NOTICES.md'));
 console.log(JSON.stringify({retained:out.places.length,withPhone:out.places.filter(p=>p.phone).length,skipped:out.skipped,release:out.release}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={convertOverture};
