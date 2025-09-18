import * as vscode from 'vscode';
import { MsalAuth } from '../auth/msal';
import { listInstances } from '../api/discovery';
import { listBots } from '../api/dataverse';

export class AgentExplorerTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private msal: MsalAuth | undefined;
  private environments: Environment[] = [];
  private isSignedIn = false;

  constructor(private context: vscode.ExtensionContext) {
    // Set context for menu visibility
    vscode.commands.executeCommand('setContext', 'agentExplorer.signedIn', false);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async signIn(): Promise<void> {
    try {
      const clientId = vscode.workspace.getConfiguration('agentExplorer.aad').get<string>('clientId') || '';
      if (!clientId) {
        vscode.window.showErrorMessage('Set agentExplorer.aad.clientId in Settings.');
        return;
      }

      this.msal = new MsalAuth(clientId);
      await this.msal.getTokenForResource('https://globaldisco.crm.dynamics.com');
      
      this.isSignedIn = true;
      vscode.commands.executeCommand('setContext', 'agentExplorer.signedIn', true);
      
      // Load environments after sign in
      await this.loadEnvironments();
      
      vscode.window.showInformationMessage('Signed in successfully.');
      this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Sign in failed: ${error}`);
    }
  }

  async signOut(): Promise<void> {
    this.msal = undefined;
    this.isSignedIn = false;
    this.environments = [];
    vscode.commands.executeCommand('setContext', 'agentExplorer.signedIn', false);
    vscode.window.showInformationMessage('Signed out.');
    this.refresh();
  }

  private async loadEnvironments(): Promise<void> {
    if (!this.msal) return;

    try {
      const discoToken = await this.msal.getTokenForResource('https://globaldisco.crm.dynamics.com');
      const instances = await listInstances(discoToken);
      
      this.environments = await Promise.all(instances.map(async (instance) => {
        const env: Environment = {
          id: instance.Id,
          name: instance.FriendlyName || instance.UrlName,
          apiUrl: instance.ApiUrl,
          agents: []
        };

        try {
          const token = await this.msal!.getTokenForResource(instance.ApiUrl);
          const bots = await listBots(instance.ApiUrl, token);
          env.agents = bots.map(bot => ({
            id: bot.botid,
            name: bot.name,
            environmentId: instance.Id
          }));
        } catch (error) {
          console.warn(`Failed to load bots for environment ${env.name}:`, error);
        }

        return env;
      }));
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load environments: ${error}`);
    }
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!this.isSignedIn) {
      return Promise.resolve([new SignInItem()]);
    }

    if (!element) {
      // Root level - show environments
      if (this.environments.length === 0) {
        return Promise.resolve([new EmptyStateItem('No environments found', 'Refresh to reload environments', 'folder')]);
      }
      return Promise.resolve(
        this.environments.map(env => new EnvironmentItem(env))
      );
    }

    if (element instanceof EnvironmentItem) {
      // Environment level - show agents
      if (element.environment.agents.length === 0) {
        return Promise.resolve([new EmptyStateItem('No agents found', 'This environment has no agents configured', 'info')]);
      }
      return Promise.resolve(
        element.environment.agents.map(agent => new AgentItem(agent))
      );
    }

    return Promise.resolve([]);
  }

  async showAgentDetails(agent: AgentItem): Promise<void> {
    if (!this.msal) return;

    const environment = this.environments.find(env => env.id === agent.agent.environmentId);
    if (!environment) return;

    // This will trigger the existing agent details logic
    vscode.commands.executeCommand('agentExplorer.showAgentDetailsInternal', {
      msal: this.msal,
      environment: environment,
      agent: agent.agent
    });
  }
}

abstract class TreeItem extends vscode.TreeItem {}

class SignInItem extends TreeItem {
  constructor() {
    super('Sign in to explore agents', vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'agentExplorer.signIn',
      title: 'Sign In'
    };
    this.iconPath = new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.blue'));
    this.tooltip = 'Click to authenticate with Microsoft and load your environments';
  }
}

class EnvironmentItem extends TreeItem {
  constructor(public readonly environment: Environment) {
    super(environment.name, vscode.TreeItemCollapsibleState.Expanded);
    this.tooltip = `${environment.name} - ${environment.agents.length} agent${environment.agents.length !== 1 ? 's' : ''}`;
    this.description = `${environment.agents.length} agent${environment.agents.length !== 1 ? 's' : ''}`;
    
    // Use different icons based on agent count
    if (environment.agents.length === 0) {
      this.iconPath = new vscode.ThemeIcon('cloud-outline', new vscode.ThemeColor('charts.gray'));
    } else if (environment.agents.length <= 5) {
      this.iconPath = new vscode.ThemeIcon('cloud', new vscode.ThemeColor('charts.green'));
    } else {
      this.iconPath = new vscode.ThemeIcon('cloud', new vscode.ThemeColor('charts.blue'));
    }
    
    this.contextValue = 'environment';
  }
}

class AgentItem extends TreeItem {
  constructor(public readonly agent: Agent) {
    super(agent.name, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `Agent: ${agent.name}\nClick to view details`;
    this.iconPath = new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.purple'));
    this.contextValue = 'agent';
    this.command = {
      command: 'agentExplorer.showAgentDetails',
      title: 'Show Agent Details',
      arguments: [this]
    };
  }
}

class EmptyStateItem extends TreeItem {
  constructor(title: string, description: string, iconName: string) {
    super(title, vscode.TreeItemCollapsibleState.None);
    this.tooltip = description;
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.gray'));
    this.contextValue = 'empty';
  }
}

interface Environment {
  id: string;
  name: string;
  apiUrl: string;
  agents: Agent[];
}

interface Agent {
  id: string;
  name: string;
  environmentId: string;
}
