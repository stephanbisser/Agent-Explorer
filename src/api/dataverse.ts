import { getJson } from './http';

export async function listBots(orgApiUrl: string, token: string) {
  const url = `${orgApiUrl}/api/data/v9.2/bots?$select=botid,name`;
  const data = await getJson<{ value: { botid: string; name: string }[] }>(url, token);
  return data.value;
}

export type BotComponent = {
  botcomponentid: string;
  name: string;
  // Optional fields; not all environments expose these
  msdyn_type?: string;
  msdyn_schema?: string; // may be JSON or YAML string depending on type
};

export async function listBotComponents(orgApiUrl: string, token: string, botId: string) {
  // Filter by bot and get key fields including content/data for URLs
  const filter = encodeURIComponent(`_parentbotid_value eq ${botId}`);
  const select = encodeURIComponent('botcomponentid,name,componenttype,schemaname,category,data,content,description');
  const url = `${orgApiUrl}/api/data/v9.2/botcomponents?$select=${select}&$filter=${filter}`;
  const data = await getJson<{ value: any[] }>(url, token);
  
  // Log component types to understand the mapping
  if (data.value.length > 0) {
    console.log('Component types found:');
    const typeMap = new Map();
    data.value.forEach(comp => {
      const key = `${comp.componenttype}`;
      if (!typeMap.has(key)) {
        typeMap.set(key, { 
          componenttype: comp.componenttype, 
          schemaname: comp.schemaname, 
          name: comp.name,
          hasData: !!comp.data,
          hasContent: !!comp.content
        });
      }
    });
    typeMap.forEach(v => console.log(`Type ${v.componenttype}: ${v.schemaname} (data: ${v.hasData}, content: ${v.hasContent})`));
    
    // Log knowledge source details for URL extraction
    const knowledgeSources = data.value.filter(c => 
      (c.schemaname || '').toLowerCase().includes('knowledge') ||
      (c.schemaname || '').toLowerCase().includes('datasource') ||
      c.componenttype === 15 || c.componenttype === 16 // common knowledge source types
    );
    if (knowledgeSources.length > 0) {
      console.log('Knowledge source details:');
      knowledgeSources.forEach(ks => {
        console.log(`${ks.name}:`);
        if (ks.data) console.log('  data:', ks.data.substring(0, 200) + '...');
        if (ks.content) console.log('  content:', ks.content.substring(0, 200) + '...');
      });
    }
  }
  
  return data.value;
}