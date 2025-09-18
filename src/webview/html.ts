import * as vscode from 'vscode';

export function getExplorerHtml(panel: vscode.WebviewPanel) {
  const nonce = Math.random().toString(36).slice(2);
  const csp = `default-src 'none'; img-src ${panel.webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource} 'unsafe-inline';`;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
<style>body{font-family: var(--vscode-font-family);padding:12px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} pre{background:#0001;padding:8px;border-radius:6px;max-height:300px;overflow:auto}</style>
</head><body>
  <h2>Agent Explorer</h2>
  <div id="content">Waiting for data…</div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', (e) => {
      const { agent, raw } = e.data;
      const el = document.getElementById('content');
      el.innerHTML = \`
        <p><b>Agent:</b> \${agent.name}</p>
        <div class="grid">
          <div><h3>Topics (\${agent.topics.length})</h3><ul>\${agent.topics.map(t=>'<li>'+t.name+'</li>').join('')}</ul></div>
          <div><h3>Knowledge (\${agent.knowledge.length})</h3><ul>\${agent.knowledge.map(k=>'<li>'+k.ref+(k.url ? ' - <a href="'+k.url+'" target="_blank">'+k.url+'</a>' : '')+'</li>').join('')}</ul></div>
          <div><h3>Actions (\${agent.actions.length})</h3><ul>\${agent.actions.map(a=>'<li>'+a.ref+'</li>').join('')}</ul></div>
          <div><h3>Channels (\${agent.channels.length})</h3><ul>\${agent.channels.map(c=>'<li>'+c.ref+'</li>').join('')}</ul></div>
        </div>
        <h3>Raw components</h3>
        <pre>\${JSON.stringify(raw, null, 2)}</pre>
      \`;
    });
  </script>
</body></html>`;
}