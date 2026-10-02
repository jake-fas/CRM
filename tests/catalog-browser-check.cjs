const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.DEMO_URL||'http://127.0.0.1:4174';await page.goto(base);await page.getByText('Demo ready.',{exact:false}).waitFor();
 const p={id:'overture:fixture-'+viewport.width,name:'Fictional retained cafe '+viewport.width,address:'1 Example St, Boulder, CO, 80301',phone:'+13035550100',website:'https://example.com',latitude:40,longitude:-105,industry:'restaurant',zip:'80301',source:'overture',release:'2026-09-23.1',source_dataset:'meta',license:'CDLA-Permissive-2.0',confidence:.9,operating_status:'open'};
 const pack=JSON.stringify({schema:'fieldbook-overture-v1',release:p.release,places:[p]});
 await page.getByText('Update territory catalog',{exact:true}).click();await page.locator('#catalogFile').setInputFiles({name:'fictional-catalog.json',mimeType:'application/json',buffer:Buffer.from(pack)});await page.getByRole('button',{name:'Import territory catalog',exact:true}).click();await page.getByText('Catalog imported: 1 businesses.',{exact:true}).waitFor();
 assert.equal(await page.locator('#provider').inputValue(),'catalog');await page.locator('#address').fill('Fictional starting address');await page.locator('#count').fill('1');await page.getByRole('button',{name:'Find nearby businesses',exact:true}).click();await page.locator('#results .card').first().waitFor();
 await page.getByRole('button',{name:'Create CRM record',exact:true}).first().click();assert.equal(await page.locator('#businessName').inputValue(),p.name);assert.equal(await page.locator('#contactPhone').inputValue(),p.phone);assert.equal(await page.locator('#contactName').inputValue(),'');
 await page.getByRole('button',{name:'Save business',exact:true}).click();await page.getByText('Business saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Close business editor'}).click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.deepEqual(errors,[]);console.log(viewport.width+'px: catalog upload, retained discovery, CRM prefill/save, no invented contact, no overflow PASS');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
