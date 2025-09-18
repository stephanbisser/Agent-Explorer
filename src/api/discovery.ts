import { getJson } from './http';
export interface Instance {
  Id: string; UrlName: string; FriendlyName: string; ApiUrl: string;
  OrganizationId: string; EnvironmentId: string; Geo: string;
}
export async function listInstances(token: string) {
  const url = 'https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances';
  const data = await getJson<{ value: Instance[] }>(url, token);
  return data.value;
}