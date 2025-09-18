import * as vscode from 'vscode';
import { MsalAuth } from './auth/msal';
import { listInstances } from './api/discovery';
import { listBots, listBotComponents } from './api/dataverse';
import { buildAgentModel } from './parsers/copilot';
import { getExplorerHtml } from './webview/html';

export function activate(context: vscode.ExtensionContext) {
  let msal: MsalAuth | undefined;
  let envPick: { label: string; apiUrl: string } | undefined;
  let lastLoaded: { agent: any; rawComponents: any[] } | undefined;

  async function signIn() {
    const clientId = vscode.workspace.getConfiguration('agentExplorer.aad').get<string>('clientId') || '';
    if (!clientId) return vscode.window.showErrorMessage('Set agentExplorer.aad.clientId in Settings.');
    msal = new MsalAuth(clientId);
    await msal.getTokenForResource('https://globaldisco.crm.dynamics.com');
    vscode.window.showInformationMessage('Signed in successfully.');
  }

  async function pickEnvironment() {
    if (!msal) return vscode.window.showErrorMessage('Run: Agent Explorer: Sign In');
    const discoToken = await msal.getTokenForResource('https://globaldisco.crm.dynamics.com');
    const instances = await listInstances(discoToken);
    const pick = await vscode.window.showQuickPick(instances.map(i => ({
      label: i.FriendlyName || i.UrlName, apiUrl: i.ApiUrl
    })), { placeHolder: 'Select Dataverse environment' });
    if (pick) envPick = pick;
  }

  async function listAgentsCmd() {
    if (!msal || !envPick) return vscode.window.showErrorMessage('Sign in and pick environment first.');
    const token = await msal.getTokenForResource(envPick.apiUrl);
    const bots = await listBots(envPick.apiUrl, token);
    const pick = await vscode.window.showQuickPick(bots.map(b => ({ label: b.name, id: b.botid })), { placeHolder: 'Select an agent' });
    if (!pick) return;
    const comps = await listBotComponents(envPick.apiUrl, token, pick.id);
    lastLoaded = buildAgentModel(envPick.apiUrl, { botid: pick.id, name: pick.label }, comps);
    vscode.window.showInformationMessage(`Loaded ${pick.label} (${comps.length} components).`);
    await showExplorer();
  }

  async function showExplorer() {
    if (!lastLoaded) return vscode.window.showInformationMessage('Load an agent first.');
    const panel = vscode.window.createWebviewPanel('agentExplorer', 'Agent Explorer', vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = getExplorerHtml(panel);
    panel.webview.postMessage({ agent: lastLoaded.agent, raw: lastLoaded.rawComponents });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('agentExplorer.signIn', signIn),
    vscode.commands.registerCommand('agentExplorer.pickEnvironment', pickEnvironment),
    vscode.commands.registerCommand('agentExplorer.listAgents', listAgentsCmd),
    vscode.commands.registerCommand('agentExplorer.showGraph', showExplorer),
  );
}

export function deactivate() {}