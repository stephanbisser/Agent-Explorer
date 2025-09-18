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
  
  console.log(`🔍 EXTRACTING CHANNELS FROM BOT CONFIGURATION: ${botId}`);
  
  // Track found channels to avoid duplicates
  const foundChannels = new Set<string>();
  
  // Get the bot record to extract channel information
  try {
    const botUrl = `${orgApiUrl}/api/data/v9.2/bots(${botId})?$select=configuration,synchronizationstatus,applicationmanifestinformation`;
    const bot = await getJson<any>(botUrl, token);
    
    console.log(`✅ Got bot configuration data`);
    
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