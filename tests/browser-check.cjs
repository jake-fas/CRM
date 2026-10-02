// Run with NODE_PATH pointing at a Playwright installation; demo server must be running.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const shots=path.join(__dirname,'..','screenshots');fs.mkdirSync(shots,{recursive:true});
 try{
 for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.DEMO_URL||'http://127.0.0.1:4173');await page.getByText('Demo ready.',{exact:false}).waitFor();
  assert.equal(await page.locator('.industry').count(),6);
  await page.getByRole('button',{name:'Move Auto repair shops up',exact:true}).click();
  assert.equal(await page.locator('.industry').first().getAttribute('data-id'),'car_repair');
  const handle=page.getByRole('button',{name:'Drag Restaurants to reorder',exact:true}),target=page.locator('.industry').first();
  const a=await handle.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();
  assert.equal(await page.locator('.industry').first().getAttribute('data-id'),'restaurant');
  await page.getByRole('button',{name:'Save priorities',exact:true}).click();await page.getByText('Industry order and inclusion saved.').waitFor();
  await page.locator('#provider').selectOption('google');await page.locator('#address').fill('Demo address');await page.locator('#count').fill('3');
  await page.route('**/api/generateLeads',async route=>{const response=await route.fetch();const out=await response.json();out.budgetCapReached=true;out.eligible.forEach(p=>p.id+='_'+require('node:crypto').randomUUID());await route.fulfill({response,json:out});});
  await page.getByRole('button',{name:'Find nearby businesses',exact:true}).click();await page.locator('#results .card').first().waitFor();assert.equal(await page.locator('#results .card').count(),3);
  assert.match(await page.locator('#notice').textContent(),/daily search budget.*partial/i);
  await page.unroute('**/api/generateLeads');
  assert.equal(await page.locator('#results a[href^="tel:"]').count(),0); // no accidental calls to fixtures
  await page.screenshot({path:path.join(shots,viewport.width===390?'mobile-discovery.png':'desktop-discovery.png'),fullPage:true});
  await page.getByRole('button',{name:'Create CRM record',exact:true}).first().click();assert.equal(await page.locator('#businessName').inputValue(),'');
  const name='Demo Coffee '+viewport.width+' '+require('node:crypto').randomUUID()+' <img src=x onerror=alert(1)>';
  await page.locator('#businessName').fill(name);await page.locator('#contactName').fill('Lucy');await page.locator('#contactRole').fill('Owner');await page.locator('#competitor').fill('Competitor noted');await page.locator('#nextPlan').fill('Revisit when owner returns.');
  const today=await page.locator('#activityDate').inputValue();await page.locator('#followUp').fill(today);
  await page.route('**/api/saveLead',async route=>{await new Promise(r=>setTimeout(r,400));await route.continue();});
  await page.getByRole('button',{name:'Save business',exact:true}).click();await page.getByRole('button',{name:'Close business editor'}).click();
  assert.ok(await page.locator('#leadDialog').evaluate(d=>d.open),'Editor cannot close during save');
  await page.getByText('Saved. You can now add a call, visit, or note.').waitFor();await page.unroute('**/api/saveLead');
  let releaseActivity,activityStarted;
  const activityPending=new Promise(resolve=>activityStarted=resolve),activityRelease=new Promise(resolve=>releaseActivity=resolve);
  await page.route('**/api/logActivity',async route=>{activityStarted();await activityRelease;await route.continue();});
  await page.locator('#activityType').selectOption('OSV');await page.locator('#activityNotes').fill('Owner away. Card left with receptionist.');await page.getByRole('button',{name:'Add to history',exact:true}).click();await activityPending;
  await page.locator('#activityNotes').fill('Next visit draft typed while saving.');releaseActivity();
  await page.getByText('Added to history.',{exact:true}).waitFor();assert.equal(await page.locator('#history .event').count(),1);
  assert.equal(await page.locator('#activityNotes').inputValue(),'Next visit draft typed while saving.','Late activity success preserves the new draft');
  assert.equal(await page.locator('#history .event p').textContent(),'Owner away. Card left with receptionist.','Only the submitted note enters history');
  await page.unroute('**/api/logActivity');
  await page.locator('#leadStatus').selectOption('archived');await page.getByRole('button',{name:'Save business',exact:true}).click();await page.getByText('Business saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Close business editor'}).click();
  await page.getByRole('button',{name:'My CRM',exact:true}).click();await page.locator('#crmView').waitFor();await page.locator('#crmFilter').selectOption('archived');await page.getByText(name,{exact:true}).waitFor();
  const card=page.locator('#crmResults .card').filter({has:page.getByText(name,{exact:true})});assert.equal(await card.locator('img').count(),0);await card.getByRole('button',{name:'Open / log activity'}).click();assert.equal(await page.locator('#history .event').count(),1);
  await page.locator('#leadStatus').selectOption('prospect');await page.getByRole('button',{name:'Save business',exact:true}).click();await page.getByText('Business saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Close business editor'}).click();await page.locator('#crmFilter').selectOption('due');await page.getByText(name,{exact:true}).waitFor();
  assert.ok(await page.locator('#todayCount').textContent()!=='0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow');
  await page.screenshot({path:path.join(shots,viewport.width===390?'mobile-crm.png':'desktop-crm.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(viewport.width+'px: priority arrows + drag, discovery, CRM save, OSV, archive/restore, due queue, safe text, no overflow PASS');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
