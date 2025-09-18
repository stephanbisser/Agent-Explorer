import { BotComponent } from '../api/dataverse';

export interface DialogNode {
  id: string;
  name: string;
  type: 'topic' | 'dialog';
  triggers: string[];
  x?: number;
  y?: number;
}

export interface DialogEdge {
  from: string;
  to: string;
  type: 'call' | 'redirect' | 'handoff';
  label?: string;
}

export interface DialogGraph {
  nodes: DialogNode[];
  edges: DialogEdge[];
}

export function analyzeDialogDependencies(components: any[]): DialogGraph {
  console.log('=== Starting Dialog Dependency Analysis ===');
  console.log(`Total components received: ${components.length}`);
  
  const nodes: DialogNode[] = [];
  const edges: DialogEdge[] = [];
  
  // Extract all dialogs/topics
  const dialogs = components.filter(c => {
    const schema = (c.schemaname || '').toLowerCase();
    const isDialog = schema.includes('.topic.') || c.componenttype === 10;
    if (isDialog) {
      console.log(`Found dialog: "${c.name}" - Schema: ${schema} - Type: ${c.componenttype}`);
    }
    return isDialog;
  });

  console.log(`Found ${dialogs.length} dialogs/topics to analyze`);

  // Create nodes for each dialog
  dialogs.forEach(dialog => {
    const triggers = extractTriggers(dialog);
    nodes.push({
      id: dialog.botcomponentid,
      name: dialog.name,
      type: 'topic',
      triggers: triggers
    });
    console.log(`Added node: "${dialog.name}" with ${triggers.length} triggers`);
  });

  // Analyze dependencies by parsing dialog data
  dialogs.forEach(dialog => {
    console.log(`\n--- Analyzing dependencies for: ${dialog.name} ---`);
    const dependencies = extractDialogDependencies(dialog, dialogs);
    
    dependencies.forEach(dep => {
      const targetDialog = dialogs.find(d => d.botcomponentid === dep.targetId);
      console.log(`Adding edge: ${dialog.name} -> ${dep.type} -> ${targetDialog?.name || 'UNKNOWN'}`);
      
      edges.push({
        from: dialog.botcomponentid,
        to: dep.targetId,
        type: dep.type,
        label: dep.label
      });
    });
  });

  console.log(`\n=== Analysis Complete ===`);
  console.log(`Total nodes: ${nodes.length}`);
  console.log(`Total edges: ${edges.length}`);
  console.log('Nodes:', nodes.map(n => n.name));
  console.log('Edges:', edges.map(e => `${nodes.find(n => n.id === e.from)?.name} -> ${nodes.find(n => n.id === e.to)?.name}`));

  return { nodes, edges };
}

function extractTriggers(dialog: any): string[] {
  const triggers: string[] = [];
  
  try {
    if (dialog.data) {
      const data = dialog.data;
      
      // Look for trigger patterns in YAML/JSON data
      const triggerMatches = data.match(/intent:\s*\n?\s*displayName:\s*["']?([^"'\n]+)["']?/gi);
      if (triggerMatches) {
        triggerMatches.forEach((match: string) => {
          const displayNameMatch = match.match(/displayName:\s*["']?([^"'\n]+)["']?/i);
          if (displayNameMatch) {
            triggers.push(displayNameMatch[1]);
          }
        });
      }
      
      // Look for phrase triggers
      const phraseMatches = data.match(/triggers?:\s*\n([\s\S]*?)(?=\n\S|\n$)/gi);
      if (phraseMatches) {
        phraseMatches.forEach((match: string) => {
          const phrases = match.match(/[-–]\s*["']?([^"'\n]+)["']?/g);
          if (phrases) {
            phrases.forEach(phrase => {
              const cleanPhrase = phrase.replace(/^[-–]\s*["']?|["']?$/g, '');
              if (cleanPhrase) triggers.push(cleanPhrase);
            });
          }
        });
      }
    }
  } catch (error) {
    console.warn('Error extracting triggers:', error);
  }
  
  return triggers;
}

function extractDialogDependencies(dialog: any, allDialogs: any[]): { targetId: string, type: 'call' | 'redirect' | 'handoff', label?: string }[] {
  const dependencies: { targetId: string, type: 'call' | 'redirect' | 'handoff', label?: string }[] = [];
  
  try {
    if (!dialog.data) {
      console.log(`  No data field for dialog: ${dialog.name}`);
      return dependencies;
    }

    const data = dialog.data;
    console.log(`  Dialog data length: ${data.length} characters`);
    console.log(`  Dialog data sample:`, data.substring(0, 200) + '...');
    
    // Look for BeginDialog actions (calls to other dialogs) - comprehensive patterns
    const beginDialogPatterns = [
      // YAML patterns
      /kind:\s*BeginDialog[\s\S]*?dialog:\s*([^\s\n\r]+)/gi,
      /BeginDialog[\s\S]*?dialog:\s*([^\s\n\r]+)/gi,
      /"BeginDialog"[\s\S]*?"dialog":\s*"([^"]+)"/gi,
      // More flexible patterns
      /beginDialog[\s\S]*?dialog[:\s]*([^\s\n\r"']+)/gi,
      /begin.*dialog[\s\S]*?dialog[:\s]*([^\s\n\r"']+)/gi,
      // Topic reference patterns
      /goToTopic[\s\S]*?topic[:\s]*([^\s\n\r"']+)/gi,
      /redirectToTopic[\s\S]*?topic[:\s]*([^\s\n\r"']+)/gi
    ];
    
    let foundAnyMatches = false;
    
    beginDialogPatterns.forEach((pattern, index) => {
      const matches = data.matchAll(pattern);
      for (const match of matches) {
        foundAnyMatches = true;
        const targetName = match[1]?.trim().replace(/['"]/g, '');
        if (targetName) {
          console.log(`  Pattern ${index + 1} found target: "${targetName}"`);
          
          // Try multiple matching strategies
          let targetDialog = allDialogs.find(d => d.name === targetName);
          if (!targetDialog) {
            targetDialog = allDialogs.find(d => d.name.includes(targetName) || targetName.includes(d.name));
          }
          if (!targetDialog) {
            targetDialog = allDialogs.find(d => d.schemaname?.toLowerCase().includes(targetName.toLowerCase()));
          }
          if (!targetDialog) {
            // Try matching the last part of schema names
            targetDialog = allDialogs.find(d => {
              const schemaParts = d.schemaname?.split('.') || [];
              return schemaParts.some((part: string) => part.toLowerCase() === targetName.toLowerCase());
            });
          }
          
          if (targetDialog && targetDialog.botcomponentid !== dialog.botcomponentid) {
            console.log(`  ✅ Matched "${targetName}" to dialog: "${targetDialog.name}"`);
            dependencies.push({
              targetId: targetDialog.botcomponentid,
              type: 'call',
              label: 'calls'
            });
          } else {
            console.log(`  ❌ Could not match "${targetName}" to any dialog`);
            console.log(`  Available dialogs:`, allDialogs.map(d => d.name));
          }
        }
      }
    });
    
    if (!foundAnyMatches) {
      console.log(`  No BeginDialog patterns found in data`);
      // Log a larger sample to help debug
      console.log(`  Larger data sample:`, data.substring(0, 1000));
    }
    
  } catch (error) {
    console.warn('Error extracting dependencies:', error);
  }
  
  console.log(`  Final dependencies for "${dialog.name}": ${dependencies.length}`);
  return dependencies;
}
