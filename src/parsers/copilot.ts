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
  let instructions: string | undefined = undefined;
  
  // Track channel names to avoid duplicates
  const seenChannels = new Set<string>();

  function classifyComponent(c: any) {
    const schema = (c.schemaname || '').toLowerCase();
    const componentType = c.componenttype;
    const name = (c.name || '').toLowerCase();
    
    // Log all components for debugging
    console.log(`Component: "${c.name}" - Type: ${componentType} - Schema: ${schema}`);
    
    // Skip agent definition components entirely
    if (schema.includes('msdyn_appcopilot') || 
        schema.includes('.agent.') || 
        schema.includes('bot.') ||
        name.includes('copilot') ||
        name.includes('agent')) {
      return 'skip'; // Don't classify agent-related components
    }
    
    // More specific classification based on actual schema patterns
    if (schema.includes('.topic.') || componentType === 10) {
      return 'topic';
    }
    
    // Only classify as knowledge if it's specifically a knowledge source
    if ((schema.includes('.knowledgesource') || schema.includes('.datasource') || 
         schema.includes('.knowledge.') || schema.includes('sharepoint') || 
         schema.includes('website') || schema.includes('file') ||
         schema.includes('document')) && 
        !schema.includes('.agent.') && !schema.includes('msdyn_appcopilot')) {
      return 'knowledge';
    }
    
    if (schema.includes('.action') || schema.includes('.plugin') || schema.includes('.flow') ||
        schema.includes('connector') || componentType === 20) {
      return 'action';
    }
    
    // Expand channel detection patterns - be more aggressive
    if (schema.includes('.channel') || schema.includes('channel') ||
        // Common channel component types
        componentType === 30 || componentType === 31 || componentType === 32 || componentType === 5 || componentType === 999 ||
        // Our extracted channel types
        componentType === 998 || componentType === 997 || componentType === 996 || componentType === 995 ||
        // Channel platform names
        schema.includes('teams') || schema.includes('webchat') || 
        schema.includes('facebook') || schema.includes('slack') ||
        schema.includes('telegram') || schema.includes('twilio') ||
        schema.includes('directline') || schema.includes('cortana') ||
        schema.includes('skype') || schema.includes('email') ||
        schema.includes('sms') || schema.includes('alexa') ||
        // Channel-related keywords
        name.includes('channel') || name.includes('teams') || 
        name.includes('webchat') || name.includes('facebook') ||
        name.includes('slack') || name.includes('telegram') ||
        name.includes('directline') || name.includes('sms') ||
        name.includes('copilot chat') || name.includes('microsoft teams') ||
        // Publication/deployment related
        schema.includes('publish') || schema.includes('deploy') ||
        name.includes('publish') || name.includes('deploy') ||
        // Specific schemas we extract
        schema.includes('config.channel') || schema.includes('sync.channel') ||
        schema.includes('teams.app') || schema.includes('copilot.chat')) {
      console.log(`🎯 CLASSIFIED AS CHANNEL: "${c.name}" (Type: ${componentType}, Schema: ${schema})`);
      return 'channel';
    }
    
    if (schema.includes('.agent') || schema.includes('.handoff')) {
      return 'agent';
    }
    
    // Log unclassified for debugging - but exclude the main agent components
    if (!schema.includes('msdyn_appcopilot') && !schema.includes('.agent.') && !name.includes('copilot')) {
      console.log(`❓ UNCLASSIFIED: "${c.name}" (Type: ${componentType}, Schema: ${schema})`);
    }
    
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
    // Check for bot instructions - try multiple possible sources
    if (c.name === '__BOT_INSTRUCTIONS__' && c.content) {
      instructions = c.content;
      const instructionsText = String(instructions);
      const preview = instructionsText.length > 100 ? instructionsText.substring(0, 100) + '...' : instructionsText;
      console.log(`✅ Extracted agent instructions from special component: ${preview}`);
      continue;
    }
    
    // Check for GptComponentMetadata in component data (YAML format)
    if (!instructions && c.data && typeof c.data === 'string') {
      // Check if this is GptComponentMetadata
      if (c.data.includes('kind: GptComponentMetadata') || c.data.includes('kind:GptComponentMetadata')) {
        console.log(`🎯 Found GptComponentMetadata component: "${c.name}"`);
        
        // Parse YAML-like format to extract instructions
        const lines = c.data.split('\n');
        let inInstructions = false;
        let instructionLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('instructions:')) {
            inInstructions = true;
            // Check if instructions are on the same line
            const sameLine = line.substring(line.indexOf('instructions:') + 13).trim();
            if (sameLine) {
              instructionLines.push(sameLine);
            }
          } else if (inInstructions) {
            // If line starts with another key, we're done with instructions
            if (line.match(/^[a-zA-Z]/)) {
              break;
            }
            // Otherwise it's part of instructions (indented)
            instructionLines.push(line);
          }
        }
        
        if (instructionLines.length > 0) {
          instructions = instructionLines.join('\n').trim();
          console.log(`✅ Extracted instructions from GptComponentMetadata`);
          console.log(`📝 Instructions preview:`, instructions.substring(0, 150) + '...');
          continue;
        }
      }
    }
    
    // Check for instructions in component data (JSON format)
    const schema = (c.schemaname || '').toLowerCase();
    if (!instructions && (schema.includes('copilot') || schema.includes('agent')) && c.data) {
      try {
        const data = typeof c.data === 'string' ? JSON.parse(c.data) : c.data;
        if (data.instructions || data.systemInstructions || data.systemPrompt) {
          instructions = data.instructions || data.systemInstructions || data.systemPrompt;
          console.log(`✅ Found instructions in component "${c.name}" (${c.schemaname})`);
          console.log(`📝 Instructions preview:`, String(instructions).substring(0, 100));
        }
      } catch (e) {
        // Not JSON or failed to parse
      }
    }
    
    const type = classifyComponent(c);
    
    // Skip agent-related components entirely
    if (type === 'skip') {
      continue;
    }
    
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
      // Avoid duplicates - normalize the channel name for comparison
      const normalizedName = c.name.toLowerCase().trim();
      if (!seenChannels.has(normalizedName)) {
        seenChannels.add(normalizedName);
        channels.push({ kind: 'channel', type: 'unknown', ref: c.name });
        console.log(`✅ Added unique channel: "${c.name}"`);
      } else {
        console.log(`🔄 Skipped duplicate channel: "${c.name}"`);
      }
    } else if (type === 'agent') {
      agents.push({ kind: 'agent', type: 'handoff', ref: c.name });
    }
  }

  // Final deduplication pass - remove channels with very similar names
  const finalChannels: Dependency[] = [];
  const normalizedChannelNames = new Set<string>();
  
  for (const channel of channels) {
    // Create a normalized version for comparison
    const normalized = channel.ref.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/microsoft/g, 'ms')
      .replace(/messenger/g, 'msg');
    
    if (!normalizedChannelNames.has(normalized)) {
      normalizedChannelNames.add(normalized);
      finalChannels.push(channel);
      console.log(`✅ Final channel kept: "${channel.ref}"`);
    } else {
      console.log(`🔄 Final dedup removed: "${channel.ref}"`);
    }
  }

  const agent: Agent = { 
    id: bot.botid, 
    name: bot.name, 
    environmentUrl: envUrl, 
    topics, 
    knowledge, 
    actions, 
    channels: finalChannels, // Use deduplicated channels
    agents,
    instructions // Include agent instructions if available
  };
  return { agent, rawComponents: components };
}