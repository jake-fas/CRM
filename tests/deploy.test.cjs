const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
test('deployment refuses missing credentials before writing files or making requests',()=>{
 const root=path.join(__dirname,'..');const result=spawnSync(process.execPath,['tools/deploy.cjs'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot}});
 assert.equal(result.status,1);assert.match(result.stderr,/CLASPRC_JSON/);assert.ok(!fs.existsSync(path.join(root,'.clasp.json')));
});
test('deployment stages only the six CRM source files inside the config root',()=>{
 const {stageDeployment,cleanupStage}=require('../tools/deploy.cjs');let stage;
 try{stage=stageDeployment(path.join(__dirname,'..'),{},'fixture-script-id');
 const config=JSON.parse(fs.readFileSync(stage.config,'utf8'));assert.equal(config.rootDir,'.');
 assert.deepEqual(fs.readdirSync(stage.dir).sort(),['.claspignore','Catalog.gs','Code.gs','Core.gs','Index.html','Provider.gs','appsscript.json','auth.json','project.json'].sort());
 assert.ok(path.isAbsolute(stage.config));
 }finally{if(stage)cleanupStage(stage);}
});
test('web app deployment keeps accessing-user identity and never allows anonymous access',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','appsscript.json'),'utf8'));
 assert.equal(manifest.webapp?.executeAs,'USER_ACCESSING');assert.equal(manifest.webapp?.access,'ANYONE');
});
