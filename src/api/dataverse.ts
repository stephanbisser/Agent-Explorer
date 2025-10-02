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
  
  console.log(`🔍 EXTRACTING CHANNELS AND INSTRUCTIONS FROM BOT: ${botId}`);
  console.log(`📊 Total bot components retrieved: ${data.value.length}`);
  
  // Log a sample of component types to help identify instruction components
  const componentTypes = new Set(data.value.map((c: any) => c.componenttype));
  const schemaNames = new Set(data.value.map((c: any) => c.schemaname));
  console.log(`📊 Unique component types:`, Array.from(componentTypes));
  console.log(`📊 Sample schema names:`, Array.from(schemaNames).slice(0, 20));
  
  // Track found channels to avoid duplicates
  const foundChannels = new Set<string>();
  
  // Get the bot record to extract channel information and instructions
  try {
    // Fetch bot with all available fields - we'll handle missing ones gracefully
    const botUrl = `${orgApiUrl}/api/data/v9.2/bots(${botId})`;
    const bot = await getJson<any>(botUrl, token);
    
    console.log(`✅ Got bot configuration data`);
    console.log(`📊 Bot fields available:`, Object.keys(bot));
    
    // Extract instructions from multiple possible sources
    let instructions: string | undefined;
    
    // Priority 1: Check GptComponentMetadata for instructions (primary source for Copilot Studio)
    if (bot.GptComponentMetadata) {
      try {
        const metadata = typeof bot.GptComponentMetadata === 'string' 
          ? JSON.parse(bot.GptComponentMetadata) 
          : bot.GptComponentMetadata;
        
        console.log(`📊 GptComponentMetadata keys:`, Object.keys(metadata));
        
        if (metadata.instructions) {
          instructions = metadata.instructions;
          console.log(`📝 Found bot instructions in GptComponentMetadata.instructions`);
          const preview = String(instructions).length > 150 
            ? String(instructions).substring(0, 150) + '...' 
            : String(instructions);
          console.log(`📝 Instructions preview:`, preview);
        }
      } catch (e) {
        console.log(`⚠️ Could not parse GptComponentMetadata:`, e);
      }
    }
    
    // Priority 2: Check configuration for instructions
    if (!instructions && bot.configuration) {
      try {
        const config = JSON.parse(bot.configuration);
        console.log(`📊 Configuration keys:`, Object.keys(config));
        console.log(`📊 Configuration sample:`, JSON.stringify(config).substring(0, 500));
        
        if (config.instructions) {
          instructions = config.instructions;
          console.log(`📝 Found bot instructions in configuration.instructions`);
        } else if (config.systemPrompt) {
          instructions = config.systemPrompt;
          console.log(`📝 Found bot instructions in configuration.systemPrompt`);
        } else if (config.agentInstructions) {
          instructions = config.agentInstructions;
          console.log(`📝 Found bot instructions in configuration.agentInstructions`);
        } else if (config.description) {
          instructions = config.description;
          console.log(`📝 Found bot instructions in configuration.description`);
        }
      } catch (e) {
        console.log(`⚠️ Could not parse configuration for instructions`);
      }
    }
    
    // Priority 2: Check application manifest
    if (!instructions && bot.applicationmanifestinformation) {
      try {
        const manifest = JSON.parse(bot.applicationmanifestinformation);
        if (manifest.instructions) {
          instructions = manifest.instructions;
          console.log(`📝 Found bot instructions in applicationmanifestinformation.instructions`);
        }
      } catch (e) {
        console.log(`⚠️ Could not parse application manifest for instructions`);
      }
    }
    
    // Store instructions in a special component so it can be passed through
    if (instructions) {
      const preview = instructions.length > 100 ? instructions.substring(0, 100) + '...' : instructions;
      console.log(`✅ Final instructions: ${preview}`);
      data.value.push({
        botcomponentid: 'bot_instructions',
        name: '__BOT_INSTRUCTIONS__',
        componenttype: 999,
        schemaname: 'bot.instructions',
        category: 'metadata',
        data: null,
        content: instructions,
        description: 'Agent instructions and description'
      });
    } else {
      console.log(`ℹ️ No instructions found for this agent`);
    }
    
    // Extract channels from configuration field (primary source)
    if (bot.configuration) {
      try {
        const config = JSON.parse(bot.configuration);
        console.log(`📄 Bot configuration:`, config);
        
        if (config.channels && Array.isArray(config.channels)) {
          console.log(`🎯 FOUND ${config.channels.length} CHANNELS in configuration:`, config.channels);
          
          config.channels.forEach((channel: any, index: number) => {
            const channelId = channel.channelId || channel.name || `Channel ${index + 1}`;
            const channelKey = channelId.toLowerCase();
            
            if (!foundChannels.has(channelKey)) {
              foundChannels.add(channelKey);
              
              // Map common channel IDs to friendly names
              const friendlyName = getFriendlyChannelName(channelId);
              
              console.log(`✅ ADDING CHANNEL: "${friendlyName}" (Original ID: "${channelId}")`);
              
              data.value.push({
                botcomponentid: `channel_${channelKey}`,
                name: friendlyName,
                componenttype: 998, // Special type for channels
                schemaname: 'channel',
                category: 'channel',
                data: JSON.stringify(channel),
                content: null,
                description: `Published channel: ${friendlyName}`
              });
            } else {
              console.log(`🔄 SKIPPING DUPLICATE CHANNEL: "${channelId}" (already found as "${channelKey}")`);
            }
          });
        }
      } catch (error) {
        console.log(`❌ Failed to parse configuration JSON:`, error);
      }
    }
    
    // Extract additional channels from applicationmanifestinformation (only if not already found)
    if (bot.applicationmanifestinformation) {
      try {
        const appManifest = JSON.parse(bot.applicationmanifestinformation);
        console.log(`📄 App manifest:`, appManifest);
        
        // Check for Copilot Chat if not already found via Teams
        if (appManifest.copilotChat?.isEnabled && !foundChannels.has('copilot') && !foundChannels.has('msteams')) {
          foundChannels.add('copilot');
          
          console.log(`✅ ADDING COPILOT CHANNEL from app manifest`);
          
          data.value.push({
            botcomponentid: 'channel_copilot',
            name: 'Copilot Chat',
            componenttype: 998,
            schemaname: 'channel',
            category: 'channel',
            data: JSON.stringify(appManifest.copilotChat),
            content: null,
            description: 'Microsoft Copilot Chat integration'
          });
        } else {
          console.log(`🔄 SKIPPING COPILOT CHANNEL: already have copilot=${foundChannels.has('copilot')} or msteams=${foundChannels.has('msteams')}`);
        }
        
        // Add Teams info only if we have additional details beyond basic channel
        if (appManifest.teams && appManifest.teams.botChannelRegistrationAppId && foundChannels.has('msteams')) {
          // Update existing Teams channel with app ID info
          const teamsChannel = data.value.find(c => c.botcomponentid === 'channel_msteams');
          if (teamsChannel) {
            const existingData = JSON.parse(teamsChannel.data);
            existingData.appId = appManifest.teams.botChannelRegistrationAppId;
            existingData.version = appManifest.teams.version;
            teamsChannel.data = JSON.stringify(existingData);
            teamsChannel.description = `Microsoft Teams (App ID: ${appManifest.teams.botChannelRegistrationAppId})`;
          }
        }
        
      } catch (error) {
        console.log(`❌ Failed to parse applicationmanifestinformation JSON:`, error);
      }
    }
    
  } catch (error) {
    console.log(`❌ Failed to get bot configuration:`, error instanceof Error ? error.message : String(error));
  }
  
  // Also check for instructions in bot components
  console.log(`🔍 Searching for instructions in bot components...`);
  for (const component of data.value) {
    const schema = (component.schemaname || '').toLowerCase();
    const name = (component.name || '').toLowerCase();
    
    // Look for instruction-related components
    if (schema.includes('instruction') || schema.includes('prompt') || 
        name.includes('instruction') || name.includes('prompt') ||
        schema.includes('copilot') && (component.data || component.content)) {
      console.log(`🎯 Potential instruction component found:`, {
        name: component.name,
        schema: component.schemaname,
        type: component.componenttype,
        hasData: !!component.data,
        hasContent: !!component.content
      });
      
      if (component.data) {
        try {
          const parsed = JSON.parse(component.data);
          if (parsed.instructions || parsed.systemPrompt || parsed.prompt) {
            console.log(`✅ Found instructions in component data!`);
          }
        } catch (e) {
          // Not JSON
        }
      }
    }
  }
  
  console.log(`📊 FINAL COMPONENT COUNT: ${data.value.length} (${foundChannels.size} unique channels extracted)`);
  console.log(`🎯 UNIQUE CHANNELS FOUND:`, Array.from(foundChannels));
  
  return data.value;
}

function getFriendlyChannelName(channelId: string): string {
  const channelMap: { [key: string]: string } = {
    'msteams': 'Microsoft Teams',
    'teams': 'Microsoft Teams',
    'webchat': 'Web Chat',
    'directline': 'Direct Line',
    'facebook': 'Facebook Messenger',
    'slack': 'Slack',
    'telegram': 'Telegram',
    'email': 'Email',
    'sms': 'SMS',
    'skype': 'Skype',
    'cortana': 'Cortana',
    'alexa': 'Amazon Alexa',
    'copilot': 'Copilot Chat',
    'copilotchat': 'Copilot Chat'
  };
  
  const lowerChannelId = channelId.toLowerCase().replace(/\s+/g, '');
  return channelMap[lowerChannelId] || channelId;
}