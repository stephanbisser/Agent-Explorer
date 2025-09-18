import * as vscode from 'vscode';

export function getExplorerHtml(panel: vscode.WebviewPanel) {
  const nonce = Math.random().toString(36).slice(2);
  const csp = `default-src 'none'; img-src ${panel.webview.cspSource} https: data:; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource} 'unsafe-inline'; font-src ${panel.webview.cspSource};`;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
body {
  font-family: var(--vscode-font-family);
  padding: 0;
  margin: 0;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.header {
  background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
  padding: 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 300;
  color: var(--vscode-button-foreground);
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-icon {
  width: 32px;
  height: 32px;
  background: var(--vscode-button-foreground);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.overview {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 32px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: var(--vscode-textLink-foreground);
  display: block;
}

.stat-label {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.section {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  background: var(--vscode-tab-activeBackground);
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.section-count {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.section-content {
  padding: 20px;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item {
  padding: 12px 0;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.item:last-child {
  border-bottom: none;
}

.item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.7;
}

.item-content {
  flex: 1;
}

.item-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-url {
  font-size: 12px;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  opacity: 0.8;
}

.item-url:hover {
  opacity: 1;
  text-decoration: underline;
}

.raw-data {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  overflow: hidden;
}

.raw-data-header {
  background: var(--vscode-tab-activeBackground);
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.raw-data-content {
  padding: 20px;
}

.code-block {
  background: var(--vscode-textCodeBlock-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow: auto;
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size);
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--vscode-scrollbarSlider-background);
}

::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-hoverBackground);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-activeBackground);
}
</style>
</head><body>
  <div class="header">
    <h1>
      <div class="agent-icon">🤖</div>
      <span id="agent-title">Agent Explorer</span>
    </h1>
  </div>
  
  <div class="container">
    <div id="content">
      <div style="text-align: center; padding: 60px 20px; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <div style="font-size: 18px;">Loading agent data...</div>
      </div>
    </div>
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    window.addEventListener('message', (e) => {
      const { agent, raw } = e.data;
      const titleEl = document.getElementById('agent-title');
      const contentEl = document.getElementById('content');
      
      titleEl.textContent = agent.name;
      
      contentEl.innerHTML = \`
        <div class="overview">
          <div class="stats">
            <div class="stat-card">
              <span class="stat-number">\${agent.topics.length}</span>
              <div class="stat-label">Topics</div>
            </div>
            <div class="stat-card">
              <span class="stat-number">\${agent.knowledge.length}</span>
              <div class="stat-label">Knowledge Sources</div>
            </div>
            <div class="stat-card">
              <span class="stat-number">\${agent.actions.length}</span>
              <div class="stat-label">Actions</div>
            </div>
            <div class="stat-card">
              <span class="stat-number">\${agent.channels.length}</span>
              <div class="stat-label">Channels</div>
            </div>
          </div>
        </div>
        
        <div class="sections">
          <div class="section">
            <div class="section-header">
              <div class="section-icon">💬</div>
              <h3 class="section-title">Topics</h3>
              <span class="section-count">\${agent.topics.length}</span>
            </div>
            <div class="section-content">
              \${agent.topics.length > 0 ? \`
                <ul class="item-list">
                  \${agent.topics.map(t => \`
                    <li class="item">
                      <div class="item-icon">📝</div>
                      <div class="item-content">
                        <div class="item-name">\${t.name}</div>
                      </div>
                    </li>
                  \`).join('')}
                </ul>
              \` : '<div class="empty-state">No topics configured</div>'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">
              <div class="section-icon">📚</div>
              <h3 class="section-title">Knowledge Sources</h3>
              <span class="section-count">\${agent.knowledge.length}</span>
            </div>
            <div class="section-content">
              \${agent.knowledge.length > 0 ? \`
                <ul class="item-list">
                  \${agent.knowledge.map(k => \`
                    <li class="item">
                      <div class="item-icon">🔗</div>
                      <div class="item-content">
                        <div class="item-name">\${k.ref}</div>
                        \${k.url ? \`<a href="\${k.url}" target="_blank" class="item-url">\${k.url}</a>\` : ''}
                      </div>
                    </li>
                  \`).join('')}
                </ul>
              \` : '<div class="empty-state">No knowledge sources configured</div>'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">
              <div class="section-icon">⚡</div>
              <h3 class="section-title">Actions</h3>
              <span class="section-count">\${agent.actions.length}</span>
            </div>
            <div class="section-content">
              \${agent.actions.length > 0 ? \`
                <ul class="item-list">
                  \${agent.actions.map(a => \`
                    <li class="item">
                      <div class="item-icon">🔧</div>
                      <div class="item-content">
                        <div class="item-name">\${a.ref}</div>
                      </div>
                    </li>
                  \`).join('')}
                </ul>
              \` : '<div class="empty-state">No actions configured</div>'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">
              <div class="section-icon">📡</div>
              <h3 class="section-title">Channels</h3>
              <span class="section-count">\${agent.channels.length}</span>
            </div>
            <div class="section-content">
              \${agent.channels.length > 0 ? \`
                <ul class="item-list">
                  \${agent.channels.map(c => \`
                    <li class="item">
                      <div class="item-icon">📱</div>
                      <div class="item-content">
                        <div class="item-name">\${c.ref}</div>
                      </div>
                    </li>
                  \`).join('')}
                </ul>
              \` : '<div class="empty-state">No channels configured</div>'}
            </div>
          </div>
        </div>
        
        <div class="raw-data">
          <div class="raw-data-header">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 16px;">🔍</span>
              Raw Component Data
            </h3>
          </div>
          <div class="raw-data-content">
            <div class="code-block">\${JSON.stringify(raw, null, 2)}</div>
          </div>
        </div>
      \`;
    });
  </script>
</body></html>`;
}