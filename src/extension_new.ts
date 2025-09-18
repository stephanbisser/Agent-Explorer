import * as vscode from 'vscode';
import { AgentExplorerTreeProvider } from './views/treeProvider';
import { listBotComponents } from './api/dataverse';
import { buildAgentModel } from './parsers/copilot';
import { getExplorerHtml } from './webview/html';
import { analyzeDialogDependencies } from './parsers/dialogAnalyzer';
import { getDependencyGraphHtml } from './webview/dependencyGraph';

export function activate(context: vscode.ExtensionContext) {
  // Create tree data provider
  const treeProvider = new AgentExplorerTreeProvider(context);
  
  // Register tree view
  vscode.window.createTreeView('agentExplorerTree', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  // Register commands
  const signInCommand = vscode.commands.registerCommand('agentExplorer.signIn', () => {
    treeProvider.signIn();
  });

  const signOutCommand = vscode.commands.registerCommand('agentExplorer.signOut', () => {
    treeProvider.signOut();
  });

  const refreshCommand = vscode.commands.registerCommand('agentExplorer.refresh', () => {
    treeProvider.refresh();
  });

  const showAgentDetailsCommand = vscode.commands.registerCommand('agentExplorer.showAgentDetails', (agentItem) => {
    treeProvider.showAgentDetails(agentItem);
  });

  const showDependencyGraphCommand = vscode.commands.registerCommand('agentExplorer.showDependencyGraph', (agentItem) => {
    treeProvider.showDependencyGraph(agentItem);
  });

  // Internal command for showing agent details (called from tree provider)
  const showAgentDetailsInternalCommand = vscode.commands.registerCommand('agentExplorer.showAgentDetailsInternal', 
    async (params: { msal: any, environment: any, agent: any }) => {
      try {
        const token = await params.msal.getTokenForResource(params.environment.apiUrl);
        const components = await listBotComponents(params.environment.apiUrl, token, params.agent.id);
        const agentModel = buildAgentModel(params.environment.apiUrl, params.agent, components);
        
        const panel = vscode.window.createWebviewPanel(
          'agentExplorer', 
          `Agent: ${params.agent.name}`, 
          vscode.ViewColumn.Active, 
          { enableScripts: true }
        );
        
        panel.webview.html = getExplorerHtml(panel);
        panel.webview.postMessage({ 
          agent: agentModel.agent, 
          raw: agentModel.rawComponents 
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load agent details: ${error}`);
      }
    }
  );

  // Internal command for showing dependency graph (called from tree provider)
  const showDependencyGraphInternalCommand = vscode.commands.registerCommand('agentExplorer.showDependencyGraphInternal',
    async (params: { msal: any, environment: any, agent: any }) => {
      try {
        const token = await params.msal.getTokenForResource(params.environment.apiUrl);
        const components = await listBotComponents(params.environment.apiUrl, token, params.agent.id);
        const dependencyGraph = analyzeDialogDependencies(components);
        
        const panel = vscode.window.createWebviewPanel(
          'dependencyGraph', 
          `Dialog Dependencies - ${params.agent.name}`, 
          vscode.ViewColumn.Active, 
          { enableScripts: true }
        );
        
        panel.webview.html = getDependencyGraphHtml(panel, dependencyGraph, params.agent.name);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load dependency graph: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    signInCommand,
    signOutCommand, 
    refreshCommand,
    showAgentDetailsCommand,
    showDependencyGraphCommand,
    showAgentDetailsInternalCommand,
    showDependencyGraphInternalCommand
  );
}

export function deactivate() {}
