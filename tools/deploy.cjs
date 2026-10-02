// CI only: credentials come from GitHub Secrets, never checked-in files.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const sourceFiles=['appsscript.json','Core.gs','Provider.gs','Catalog.gs','Apify.gs','Code.gs','Index.html'];
function stageDeployment(root,credentials,scriptId){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fieldbook-deploy-'));
 const stage={dir,auth:path.join(dir,'auth.json'),config:path.join(dir,'project.json')};
 try{
 for(const f of sourceFiles)fs.copyFileSync(path.join(root,f),path.join(dir,f));
 fs.copyFileSync(path.join(root,'.claspignore'),path.join(dir,'.claspignore'));
 fs.writeFileSync(stage.auth,JSON.stringify(credentials),{mode:0o600});
 fs.writeFileSync(stage.config,JSON.stringify({scriptId,rootDir:'.',scriptExtensions:['.gs'],htmlExtensions:['.html'],jsonExtensions:['.json']}),{mode:0o600});
 return stage;
 }catch(e){cleanupStage(stage);throw e;}
}
function cleanupStage(stage){
 for(const f of [...sourceFiles,'.claspignore','auth.json','project.json'])fs.rmSync(path.join(stage.dir,f),{force:true});
 fs.rmdirSync(stage.dir);
}
function main(){
 const root=path.join(__dirname,'..');let stage;
 try{
 for(const key of ['CLASPRC_JSON','CLASP_SCRIPT_ID','CLASP_DEPLOYMENT_ID'])if(!process.env[key])throw new Error('Missing '+key+'. Configure GitHub Secrets before enabling deployment.');
 const credentials=JSON.parse(process.env.CLASPRC_JSON);
 if(!credentials||typeof credentials!=='object'||Array.isArray(credentials))throw new Error('Invalid CLASPRC_JSON.');
 for(const key of ['CLASP_SCRIPT_ID','CLASP_DEPLOYMENT_ID'])if(!/^[A-Za-z0-9_-]{20,}$/.test(process.env[key]))throw new Error('Invalid '+key+'.');
 stage=stageDeployment(root,credentials,process.env.CLASP_SCRIPT_ID);
 const cli=path.join(root,'node_modules','@google','clasp','build','src','index.js');
 const run=args=>{const result=spawnSync(process.execPath,[cli,'--auth',stage.auth,'--project',stage.config,'--ignore',path.join(stage.dir,'.claspignore'),...args],{cwd:stage.dir,stdio:'inherit',env:{...process.env,DEBUG:''}});if(result.error||result.status!==0)throw new Error('Apps Script deployment stopped. Check the clasp error above.');};
 run(['push','--force']);
 run(['create-deployment','--deploymentId',process.env.CLASP_DEPLOYMENT_ID,'--description','GitHub '+(process.env.GITHUB_SHA||'manual').slice(0,12)]);
 console.log('Existing Apps Script deployment updated.');
}catch(e){console.error(e instanceof SyntaxError?'Invalid deployment credential JSON.':e.message);process.exitCode=1;}
finally{if(stage)cleanupStage(stage);}
}
if(require.main===module)main();
module.exports={stageDeployment,cleanupStage};
