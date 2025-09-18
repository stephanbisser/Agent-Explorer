import { BotComponent } from '../api/dataverse';
import { Agent, Topic, Dependency, LoadedAgent } from '../model/types';

export function buildAgentModel(
  envUrl: string,
  bot: { botid: string; name: string },
  components: any[]
): LoadedAgent {
  const topics: Topic[] = [];
  const knowledge: Dependency[] = [];
  const actions: Dependency[] = [];
  const channels: Dependency[] = [];
  const agents: Dependency[] = [];

  function classifyComponent(c: any) {
    const schema = (c.schemaname || '').toLowerCase();
    const componentType = c.componenttype;
    
    // Based on schema patterns and component types
    if (schema.includes('.topic.') || componentType === 10) {
      return 'topic';
    }
    if (schema.includes('.knowledgesource') || schema.includes('.knowledge') || schema.includes('datasource') ||
        componentType === 15 || componentType === 16) {
      return 'knowledge';
    }
    if (schema.includes('.action') || schema.includes('.plugin') || schema.includes('.flow')) {
      return 'action';
    }
    if (schema.includes('.channel')) {
      return 'channel';
    }
    if (schema.includes('.agent') || schema.includes('.handoff')) {
      return 'agent';
    }
    
    // Log unclassified for debugging
    console.log(`Unclassified component: type=${componentType}, schema=${schema}, name=${c.name}`);
    return 'unknown';
  }

  function extractKnowledgeUrl(c: any): string | undefined {
    try {
      // Try to parse URL from data field (YAML/JSON)
      if (c.data) {
        const data = c.data;
        // Look for URL patterns in the data
        const urlMatch = data.match(/(?:url|source|endpoint|link):\s*["']?(https?:\/\/[^\s"'\n]+)/i);
        if (urlMatch) return urlMatch[1];
        
        // Look for website patterns
        const websiteMatch = data.match(/(https?:\/\/[^\s"'\n\r]+)/);
        if (websiteMatch) return websiteMatch[1];
      }
      
      // Try content field
      if (c.content) {
        const urlMatch = c.content.match(/(https?:\/\/[^\s"'\n\r]+)/);
        if (urlMatch) return urlMatch[1];
      }
      
      // Try description field
      if (c.description) {
        const urlMatch = c.description.match(/(https?:\/\/[^\s"'\n\r]+)/);
        if (urlMatch) return urlMatch[1];
      }
    } catch (e) {
      console.warn('Error extracting URL from knowledge source:', e);
    }
    return undefined;
  }

  for (const c of components) {
    const type = classifyComponent(c);
    if (type === 'topic') {
      topics.push({ id: c.botcomponentid, name: c.name, triggers: [], variables: [], edges: [], uses: [] });
    } else if (type === 'knowledge') {
      const url = extractKnowledgeUrl(c);
      knowledge.push({ 
        kind: 'knowledge', 
        type: 'datasource', 
        ref: c.name,
        url: url
      });
    } else if (type === 'action') {
      actions.push({ kind: 'action', type: 'plugin', ref: c.name });
    } else if (type === 'channel') {
      channels.push({ kind: 'channel', type: 'unknown', ref: c.name });
    } else if (type === 'agent') {
      agents.push({ kind: 'agent', type: 'handoff', ref: c.name });
    }
  }

  const agent: Agent = { id: bot.botid, name: bot.name, environmentUrl: envUrl, topics, knowledge, actions, channels, agents };
  return { agent, rawComponents: components };
}