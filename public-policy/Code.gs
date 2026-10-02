// Deploy in a SEPARATE standalone Apps Script project with no CRM access or API key.
function doGet(e){
 var contact=PropertiesService.getScriptProperties().getProperty('POLICY_CONTACT');
 if(!contact)throw new Error('Set POLICY_CONTACT to the app operator contact before deploying.');
 var template=HtmlService.createTemplateFromFile('Policy');template.contact=contact;
 template.terms=!!(e&&e.parameter&&e.parameter.page==='terms');
 return template.evaluate().setTitle(template.terms?'Fieldbook terms':'Fieldbook privacy').addMetaTag('viewport','width=device-width, initial-scale=1');
}
