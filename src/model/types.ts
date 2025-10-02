export interface Agent {
  id: string; name: string; environmentUrl: string;
  topics: Topic[]; knowledge: Dependency[]; actions: Dependency[]; channels: Dependency[]; agents: Dependency[];
  instructions?: string; // Agent instructions from Copilot Studio
}
export interface Topic {
  id: string; name: string; triggers: string[]; variables: string[]; edges: Edge[]; uses: Dependency[];
}
export interface Edge { from: string; to: string; reason: 'redirect'|'call'|'handoff'; }
export type Dependency = { kind: 'knowledge'|'action'|'channel'|'agent'; type?: string; ref: string; url?: string; };
export interface LoadedAgent { agent: Agent; rawComponents: any[]; }