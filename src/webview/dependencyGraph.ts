import * as vscode from 'vscode';
import { DialogGraph } from '../parsers/dialogAnalyzer';

export function getDependencyGraphHtml(panel: vscode.WebviewPanel, graph: DialogGraph, agentName: string) {
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
  height: 100vh;
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
  padding: 16px 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  position: relative;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 300;
  color: var(--vscode-button-foreground);
  display: flex;
  align-items: center;
  gap: 12px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-button {
  background: var(--vscode-button-secondaryBackground);
  border: 1px solid var(--vscode-button-border);
  color: var(--vscode-button-secondaryForeground);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-button:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.control-button.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.graph-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
  overflow: auto;
  padding: 20px;
  background: radial-gradient(circle at 20% 50%, rgba(0, 122, 204, 0.05) 0%, transparent 50%), 
              radial-gradient(circle at 80% 20%, rgba(255, 107, 107, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(78, 205, 196, 0.05) 0%, transparent 50%);
}

.tooltip {
  position: absolute;
  background: var(--vscode-editorHoverWidget-background);
  border: 1px solid var(--vscode-editorHoverWidget-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.tooltip.show {
  opacity: 1;
}

.minimap {
  position: absolute;
  top: 80px;
  left: 20px;
  width: 150px;
  height: 100px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  z-index: 100;
  opacity: 0.8;
  overflow: hidden;
}

.minimap-node {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--vscode-focusBorder);
  border-radius: 2px;
}

.node {
  position: absolute;
  background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
  color: var(--vscode-button-foreground);
  border: 2px solid var(--vscode-button-border);
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 160px;
  max-width: 220px;
  text-align: center;
  cursor: move;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font-size: 13px;
  transition: all 0.3s ease;
  z-index: 10;
  user-select: none;
  backdrop-filter: blur(8px);
}

.node:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  border-color: var(--vscode-focusBorder);
}

.node.selected {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.3);
  transform: scale(1.05);
}

.node.root-node {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  border-color: #28a745;
  color: white;
}

.node.leaf-node {
  background: linear-gradient(135deg, #6c757d 0%, #adb5bd 100%);
  border-color: #6c757d;
  color: white;
}

.node-name {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.2;
  word-wrap: break-word;
}

.node-triggers {
  font-size: 11px;
  opacity: 0.9;
  max-height: 60px;
  overflow: hidden;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.1);
  padding: 6px 8px;
  border-radius: 6px;
  margin-top: 8px;
  text-overflow: ellipsis;
}

.node-stats {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.node-stat {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.edge {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.edge-line {
  stroke-width: 3;
  fill: none;
  marker-end: url(#arrowhead);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.edge-line:hover {
  stroke-width: 4;
  opacity: 1;
}

.edge-call {
  stroke: #007ACC;
  stroke-dasharray: none;
}

.edge-redirect {
  stroke: #FF6B6B;
  stroke-dasharray: 8,4;
}

.edge-handoff {
  stroke: #4ECDC4;
  stroke-dasharray: 12,6;
}

.edge-label {
  font-size: 11px;
  fill: var(--vscode-editor-foreground);
  text-anchor: middle;
  font-weight: 600;
  background: var(--vscode-editor-background);
  padding: 2px 6px;
  border-radius: 4px;
}

.edge-label-bg {
  fill: var(--vscode-editor-background);
  stroke: var(--vscode-panel-border);
  stroke-width: 1;
  rx: 4;
  ry: 4;
}

.legend {
  position: absolute;
  top: 80px;
  right: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  font-size: 12px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  backdrop-filter: blur(8px);
  max-width: 200px;
}

.legend h3 {
  margin: 0 0 16px 0; 
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 4px 0;
  transition: opacity 0.2s ease;
}

.legend-item:hover {
  opacity: 0.7;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-color {
  width: 20px;
  height: 4px;
  border-radius: 2px;
  position: relative;
}

.legend-color.dashed {
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 2px,
    currentColor 2px,
    currentColor 6px
  );
}

.legend-description {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 30px;
  margin-top: 2px;
}

.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  font-size: 12px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  backdrop-filter: blur(8px);
  min-width: 180px;
}

.stats h3 {
  margin: 0 0 12px 0; 
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: var(--vscode-input-background);
  border-radius: 6px;
  border: 1px solid var(--vscode-input-border);
}

.stat-number {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-focusBorder);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 60px);
  color: var(--vscode-descriptionForeground);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.dependency-list {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  margin: 20px;
  overflow: hidden;
}

.dependency-header {
  background: var(--vscode-tab-activeBackground);
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  font-weight: 600;
}

.dependency-item {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: background-color 0.2s ease;
}

.dependency-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.dependency-item:last-child {
  border-bottom: none;
}

.dependency-type {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 60px;
  text-align: center;
}

.dependency-type.call {
  background: #007ACC;
  color: white;
}

.dependency-type.redirect {
  background: #FF6B6B;
  color: white;
}

.dependency-type.handoff {
  background: #4ECDC4;
  color: white;
}

.dependency-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.dependency-from, .dependency-to {
  flex: 1;
}

.dependency-from strong, .dependency-to strong {
  display: block;
  margin-bottom: 4px;
  color: var(--vscode-editor-foreground);
}

.dependency-triggers {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

.dependency-arrow {
  font-size: 18px;
  color: var(--vscode-focusBorder);
  font-weight: bold;
}
</style>
</head><body>
  <div class="header">
    <h1>
      <span style="font-size: 18px;">📊</span>
      Dialog Dependencies - ${agentName}
    </h1>
    <div class="controls">
      <button class="control-button active" onclick="showView('graph')">📊 Graph View</button>
      <button class="control-button" onclick="showView('list')">📋 List View</button>
      <button class="control-button" onclick="resetZoom()">🔍 Reset Zoom</button>
    </div>
  </div>
  
  <div class="graph-container" id="graph-view">
    ${graph.nodes.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🤖</div>
        <h2>No Dialog Dependencies Found</h2>
        <p>This agent doesn't have any dialog call relationships to visualize.</p>
      </div>
    ` : generateGraphView(graph)}
  </div>

  <div class="graph-container" id="list-view" style="display: none;">
    ${graph.edges.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <h2>No Dependencies Found</h2>
        <p>This agent's dialogs don't have any call relationships.</p>
      </div>
    ` : generateListView(graph)}
  </div>
  
  <script nonce="${nonce}">
    let draggedNode = null;
    let dragOffset = { x: 0, y: 0 };
    
    function showView(viewType) {
      const graphView = document.getElementById('graph-view');
      const listView = document.getElementById('list-view');
      const buttons = document.querySelectorAll('.control-button');
      
      buttons.forEach(btn => btn.classList.remove('active'));
      
      if (viewType === 'graph') {
        graphView.style.display = 'block';
        listView.style.display = 'none';
        buttons[0].classList.add('active');
      } else {
        graphView.style.display = 'none';
        listView.style.display = 'block';
        buttons[1].classList.add('active');
      }
    }
    
    // Simple drag and drop for nodes with improved handling
    let isDragging = false;
    let currentZoom = 1;
    
    function resetZoom() {
      currentZoom = 1;
      const container = document.getElementById('graph-view');
      if (container) {
        container.style.transform = 'scale(' + currentZoom + ')';
        container.scrollTo(0, 0);
      }
    }
    
    // Add zoom functionality
    document.addEventListener('wheel', (e) => {
      if (e.target.closest('#graph-view') && e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        currentZoom = Math.max(0.3, Math.min(2, currentZoom + delta));
        const container = document.getElementById('graph-view');
        if (container) {
          container.style.transform = 'scale(' + currentZoom + ')';
        }
      }
    });
    
    document.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('node')) {
        draggedNode = e.target;
        isDragging = true;
        const rect = draggedNode.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        draggedNode.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (draggedNode && isDragging) {
        const container = draggedNode.parentElement;
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left - dragOffset.x;
        const y = e.clientY - containerRect.top - dragOffset.y;
        
        draggedNode.style.left = Math.max(0, x) + 'px';
        draggedNode.style.top = Math.max(0, y) + 'px';
        
        updateEdges();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (draggedNode) {
        draggedNode.style.cursor = 'move';
        draggedNode = null;
        isDragging = false;
      }
    });
    
    function updateEdges() {
      // Simple edge update logic - would need more complex calculation for proper curves
      const nodes = document.querySelectorAll('.node');
      const edges = document.querySelectorAll('.edge');
      
      // For now, just update straight lines between nodes
      // This is a simplified version
    }
  </script>
</body></html>`;
}

function generateGraphView(graph: DialogGraph): string {
  if (graph.nodes.length === 0) return '';
  
  // Better layout algorithm - arrange nodes with improved spacing and hierarchy
  const cols = Math.min(4, Math.ceil(Math.sqrt(graph.nodes.length)));
  const nodeWidth = 180;
  const nodeHeight = 120;
  const spacingX = 100;
  const spacingY = 80;
  
  // Categorize nodes
  const rootNodes = graph.nodes.filter(node => 
    !graph.edges.some(edge => edge.to === node.id)
  );
  const leafNodes = graph.nodes.filter(node => 
    !graph.edges.some(edge => edge.from === node.id)
  );
  
  let nodeHtml = '';
  graph.nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 80 + col * (nodeWidth + spacingX);
    const y = 120 + row * (nodeHeight + spacingY);
    
    const isRoot = rootNodes.includes(node);
    const isLeaf = leafNodes.includes(node);
    const nodeClass = isRoot ? 'root-node' : isLeaf ? 'leaf-node' : '';
    
    const incomingEdges = graph.edges.filter(e => e.to === node.id).length;
    const outgoingEdges = graph.edges.filter(e => e.from === node.id).length;
    
    const displayTriggers = node.triggers.length > 0 
      ? node.triggers.slice(0, 3).join(', ') + (node.triggers.length > 3 ? '...' : '')
      : 'No triggers';
    
    nodeHtml += `
      <div class="node ${nodeClass}" data-id="${node.id}" 
           style="left: ${x}px; top: ${y}px;" 
           title="Dialog: ${node.name}${node.triggers.length > 0 ? '\nTriggers: ' + node.triggers.join(', ') : ''}">
        <div class="node-name">${node.name}</div>
        <div class="node-triggers">${displayTriggers}</div>
        <div class="node-stats">
          <div class="node-stat" title="Incoming dependencies">⬅️ ${incomingEdges}</div>
          <div class="node-stat" title="Outgoing dependencies">➡️ ${outgoingEdges}</div>
        </div>
      </div>
    `;
  });

  // Create enhanced SVG for edges with better curves
  const svgWidth = Math.max(1000, (cols * (nodeWidth + spacingX)) + 200);
  const svgHeight = Math.max(700, (Math.ceil(graph.nodes.length / cols) * (nodeHeight + spacingY)) + 200);
  
  let edgeHtml = `
    <svg class="edge" width="${svgWidth}" height="${svgHeight}" style="position: absolute; top: 0; left: 0;">
      <defs>
        <marker id="arrowhead-call" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#007ACC" />
        </marker>
        <marker id="arrowhead-redirect" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#FF6B6B" />
        </marker>
        <marker id="arrowhead-handoff" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#4ECDC4" />
        </marker>
      </defs>
  `;
  
  graph.edges.forEach((edge, edgeIndex) => {
    const fromIndex = graph.nodes.findIndex(n => n.id === edge.from);
    const toIndex = graph.nodes.findIndex(n => n.id === edge.to);
    
    if (fromIndex >= 0 && toIndex >= 0) {
      const fromCol = fromIndex % cols;
      const fromRow = Math.floor(fromIndex / cols);
      const fromX = 80 + fromCol * (nodeWidth + spacingX) + nodeWidth / 2;
      const fromY = 120 + fromRow * (nodeHeight + spacingY) + nodeHeight / 2;
      
      const toCol = toIndex % cols;
      const toRow = Math.floor(toIndex / cols);
      const toX = 80 + toCol * (nodeWidth + spacingX) + nodeWidth / 2;
      const toY = 120 + toRow * (nodeHeight + spacingY) + nodeHeight / 2;
      
      // Create curved path for better readability
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const controlOffset = 30;
      
      const path = `M ${fromX} ${fromY} Q ${midX + controlOffset} ${midY - controlOffset} ${toX} ${toY}`;
      
      const labelX = midX;
      const labelY = midY - 15;
      const edgeLabel = edge.label || edge.type.toUpperCase();
      
      edgeHtml += `
        <path d="${path}" class="edge-line edge-${edge.type}" 
              marker-end="url(#arrowhead-${edge.type})" 
              data-from="${edge.from}" data-to="${edge.to}"/>
        <rect x="${labelX - 15}" y="${labelY - 8}" width="30" height="16" 
              class="edge-label-bg" rx="4" ry="4"/>
        <text x="${labelX}" y="${labelY + 3}" class="edge-label" 
              title="${edge.type} from ${graph.nodes[fromIndex].name} to ${graph.nodes[toIndex].name}">
          ${edgeLabel}
        </text>
      `;
    }
  });
  
  edgeHtml += '</svg>';

  return `
    ${edgeHtml}
    ${nodeHtml}
    
    <div class="legend">
      <h3>Connection Types</h3>
      <div class="legend-item">
        <div class="legend-color" style="background: #007ACC;"></div>
        <span>Dialog Calls</span>
        <div class="legend-description">Direct calls to other dialogs</div>
      </div>
      <div class="legend-item">
        <div class="legend-color dashed" style="color: #FF6B6B;"></div>
        <span>Redirects</span>
        <div class="legend-description">Conversation redirections</div>
      </div>
      <div class="legend-item">
        <div class="legend-color dashed" style="color: #4ECDC4;"></div>
        <span>Handoffs</span>
        <div class="legend-description">Agent to agent handoffs</div>
      </div>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--vscode-panel-border);">
        <div class="legend-item">
          <div class="legend-color" style="background: #28a745;"></div>
          <span>Entry Points</span>
          <div class="legend-description">Dialogs with no incoming calls</div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #6c757d;"></div>
          <span>End Points</span>
          <div class="legend-description">Dialogs with no outgoing calls</div>
        </div>
      </div>
    </div>
    
    <div class="stats">
      <h3>Graph Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">${graph.nodes.length}</span>
          <span class="stat-label">Dialogs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${graph.edges.length}</span>
          <span class="stat-label">Connections</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${rootNodes.length}</span>
          <span class="stat-label">Entry Points</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${leafNodes.length}</span>
          <span class="stat-label">End Points</span>
        </div>
      </div>
    </div>
  `;
}

function generateListView(graph: DialogGraph): string {
  if (graph.edges.length === 0) return '';
  
  // Group edges by type for better organization
  const edgesByType = {
    call: graph.edges.filter(e => e.type === 'call'),
    redirect: graph.edges.filter(e => e.type === 'redirect'),
    handoff: graph.edges.filter(e => e.type === 'handoff')
  };
  
  let listHtml = '';
  
  Object.entries(edgesByType).forEach(([type, edges]) => {
    if (edges.length === 0) return;
    
    const typeLabels = {
      call: '📞 Dialog Calls',
      redirect: '🔄 Redirects', 
      handoff: '👥 Handoffs'
    };
    
    listHtml += `
      <div class="dependency-list">
        <div class="dependency-header">
          ${typeLabels[type as keyof typeof typeLabels]} (${edges.length})
        </div>
    `;
    
    edges.forEach(edge => {
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        const fromTriggers = fromNode.triggers.length > 0 
          ? fromNode.triggers.slice(0, 2).join(', ') 
          : 'No triggers';
        const toTriggers = toNode.triggers.length > 0 
          ? toNode.triggers.slice(0, 2).join(', ') 
          : 'No triggers';
          
        listHtml += `
          <div class="dependency-item">
            <div class="dependency-type ${edge.type}">${edge.type}</div>
            <div class="dependency-details">
              <div class="dependency-from">
                <strong>${fromNode.name}</strong>
                <div class="dependency-triggers">Triggers: ${fromTriggers}</div>
              </div>
              <div class="dependency-arrow">→</div>
              <div class="dependency-to">
                <strong>${toNode.name}</strong>
                <div class="dependency-triggers">Triggers: ${toTriggers}</div>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    listHtml += '</div>';
  });
  
  return listHtml;
}
