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
}

.node {
  position: absolute;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 2px solid var(--vscode-button-border);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 120px;
  text-align: center;
  cursor: move;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-size: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 10;
}

.node:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.node.selected {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 2px var(--vscode-focusBorder);
}

.node-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.node-triggers {
  font-size: 10px;
  opacity: 0.8;
  max-height: 40px;
  overflow: hidden;
}

.edge {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.edge-line {
  stroke-width: 2;
  fill: none;
  marker-end: url(#arrowhead);
}

.edge-call {
  stroke: #007ACC;
}

.edge-redirect {
  stroke: #FF6B6B;
}

.edge-handoff {
  stroke: #4ECDC4;
}

.edge-label {
  font-size: 10px;
  fill: var(--vscode-editor-foreground);
  text-anchor: middle;
}

.legend {
  position: absolute;
  top: 20px;
  right: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 16px;
  font-size: 12px;
  z-index: 100;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-color {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 16px;
  font-size: 12px;
  z-index: 100;
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
  padding: 12px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.dependency-item:last-child {
  border-bottom: none;
}

.dependency-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
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
}

.dependency-from {
  font-weight: 500;
  margin-bottom: 4px;
}

.dependency-to {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
</style>
</head><body>
  <div class="header">
    <h1>
      <span style="font-size: 18px;">📊</span>
      Dialog Dependencies - ${agentName}
    </h1>
    <div class="controls">
      <button class="control-button active" onclick="showView('graph')">Graph View</button>
      <button class="control-button" onclick="showView('list')">List View</button>
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
    
    // Simple drag and drop for nodes
    document.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('node')) {
        draggedNode = e.target;
        const rect = draggedNode.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (draggedNode) {
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
      draggedNode = null;
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
  
  // Simple layout algorithm - arrange nodes in a grid
  const cols = Math.ceil(Math.sqrt(graph.nodes.length));
  const nodeWidth = 140;
  const nodeHeight = 80;
  const spacing = 60;
  
  let nodeHtml = '';
  graph.nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 50 + col * (nodeWidth + spacing);
    const y = 50 + row * (nodeHeight + spacing);
    
    nodeHtml += `
      <div class="node" data-id="${node.id}" style="left: ${x}px; top: ${y}px;">
        <div class="node-name">${node.name}</div>
        <div class="node-triggers">${node.triggers.slice(0, 2).join(', ')}</div>
      </div>
    `;
  });

  // Create SVG for edges
  const svgWidth = Math.max(800, (cols * (nodeWidth + spacing)) + 100);
  const svgHeight = Math.max(600, (Math.ceil(graph.nodes.length / cols) * (nodeHeight + spacing)) + 100);
  
  let edgeHtml = `
    <svg class="edge" width="${svgWidth}" height="${svgHeight}" style="position: absolute; top: 0; left: 0;">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-editor-foreground)" />
        </marker>
      </defs>
  `;
  
  graph.edges.forEach(edge => {
    const fromIndex = graph.nodes.findIndex(n => n.id === edge.from);
    const toIndex = graph.nodes.findIndex(n => n.id === edge.to);
    
    if (fromIndex >= 0 && toIndex >= 0) {
      const fromCol = fromIndex % cols;
      const fromRow = Math.floor(fromIndex / cols);
      const fromX = 50 + fromCol * (nodeWidth + spacing) + nodeWidth / 2;
      const fromY = 50 + fromRow * (nodeHeight + spacing) + nodeHeight / 2;
      
      const toCol = toIndex % cols;
      const toRow = Math.floor(toIndex / cols);
      const toX = 50 + toCol * (nodeWidth + spacing) + nodeWidth / 2;
      const toY = 50 + toRow * (nodeHeight + spacing) + nodeHeight / 2;
      
      edgeHtml += `
        <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" 
              class="edge-line edge-${edge.type}" />
        <text x="${(fromX + toX) / 2}" y="${(fromY + toY) / 2}" class="edge-label">
          ${edge.label || edge.type}
        </text>
      `;
    }
  });
  
  edgeHtml += '</svg>';

  return `
    ${edgeHtml}
    ${nodeHtml}
    
    <div class="legend">
      <h3 style="margin: 0 0 12px 0; font-size: 14px;">Edge Types</h3>
      <div class="legend-item">
        <div class="legend-color" style="background: #007ACC;"></div>
        <span>Calls</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #FF6B6B;"></div>
        <span>Redirects</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #4ECDC4;"></div>
        <span>Handoffs</span>
      </div>
    </div>
    
    <div class="stats">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">Graph Stats</h3>
      <div>Dialogs: ${graph.nodes.length}</div>
      <div>Dependencies: ${graph.edges.length}</div>
    </div>
  `;
}

function generateListView(graph: DialogGraph): string {
  if (graph.edges.length === 0) return '';
  
  let listHtml = `
    <div class="dependency-list">
      <div class="dependency-header">
        Dialog Dependencies (${graph.edges.length})
      </div>
  `;
  
  graph.edges.forEach(edge => {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    
    if (fromNode && toNode) {
      listHtml += `
        <div class="dependency-item">
          <div class="dependency-type ${edge.type}">${edge.type}</div>
          <div class="dependency-details">
            <div class="dependency-from">${fromNode.name}</div>
            <div class="dependency-to">→ ${toNode.name}</div>
          </div>
        </div>
      `;
    }
  });
  
  listHtml += '</div>';
  
  return listHtml;
}
