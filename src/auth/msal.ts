import * as vscode from 'vscode';
import { PublicClientApplication, DeviceCodeRequest } from '@azure/msal-node';

const TENANT = 'organizations';
const AUTHORITY = `https://login.microsoftonline.com/${TENANT}`;

export class MsalAuth {
  private pca: PublicClientApplication;
  constructor(private clientId: string) {
    this.pca = new PublicClientApplication({ auth: { clientId, authority: AUTHORITY } });
  }
  async getTokenForResource(resourceBase: string): Promise<string> {
    const scope = `${resourceBase}/.default`;
    const cache = this.pca.getTokenCache();
    const accounts = await cache.getAllAccounts();
    if (accounts.length) {
      const res = await this.pca.acquireTokenSilent({ account: accounts[0], scopes: [scope] });
      if (res?.accessToken) return res.accessToken;
    }
    const req: DeviceCodeRequest = {
      scopes: [scope],
      deviceCodeCallback: info => vscode.window.showInformationMessage(info.message, { modal: true })
    };
    const res = await this.pca.acquireTokenByDeviceCode(req);
    if (!res?.accessToken) throw new Error('No access token');
    return res.accessToken;
  }
}