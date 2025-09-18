import * as vscode from 'vscode';
import { PublicClientApplication, DeviceCodeRequest } from '@azure/msal-node';

const TENANT = 'organizations';
const AUTHORITY = `https://login.microsoftonline.com/${TENANT}`;

export class MsalAuth {
  private pca: PublicClientApplication;

  constructor(private clientId: string) {
    this.pca = new PublicClientApplication({ 
      auth: { 
        clientId, 
        authority: AUTHORITY 
      } 
    });
  }

  async getTokenForResource(resourceBase: string): Promise<string> {
    const scope = `${resourceBase}/.default`;
    const cache = this.pca.getTokenCache();
    const accounts = await cache.getAllAccounts();
    
    // Try silent token acquisition first
    if (accounts.length > 0) {
      try {
        const res = await this.pca.acquireTokenSilent({ 
          account: accounts[0], 
          scopes: [scope] 
        });
        if (res?.accessToken) return res.accessToken;
      } catch (error) {
        console.log('Silent token acquisition failed, using device code flow');
      }
    }

    // Use VS Code's built-in authentication provider for better UX
    return await this.getTokenWithVSCode(scope);
  }

  private async getTokenWithVSCode(scope: string): Promise<string> {
    try {
      // Try VS Code's built-in Microsoft authentication first
      const session = await vscode.authentication.getSession('microsoft', [scope], { createIfNone: true });
      if (session?.accessToken) {
        return session.accessToken;
      }
    } catch (error) {
      console.log('VS Code authentication failed, falling back to device code:', error);
    }

    // Fallback to device code flow
    return await this.getTokenWithDeviceCode(scope);
  }

  private async getTokenWithDeviceCode(scope: string): Promise<string> {
    const req: DeviceCodeRequest = {
      scopes: [scope],
      deviceCodeCallback: async (deviceCodeInfo) => {
        const selection = await vscode.window.showInformationMessage(
          `To sign in, use a web browser to open the page ${deviceCodeInfo.verificationUri} and enter the code ${deviceCodeInfo.userCode}`,
          'Copy Code & Open Browser',
          'I\'ve completed the steps'
        );
        
        if (selection === 'Copy Code & Open Browser') {
          await vscode.env.clipboard.writeText(deviceCodeInfo.userCode);
          await vscode.env.openExternal(vscode.Uri.parse(deviceCodeInfo.verificationUri));
          vscode.window.showInformationMessage(`Code ${deviceCodeInfo.userCode} copied to clipboard`);
        }
      }
    };

    const res = await this.pca.acquireTokenByDeviceCode(req);
    if (!res?.accessToken) {
      throw new Error('No access token received');
    }
    
    return res.accessToken;
  }
}