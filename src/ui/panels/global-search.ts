import { ObjectEngine } from '../../object-engine';
import { globalSearch } from '../../component-library';
import { CommandEngine } from '../../command-engine';
import { CanvasEngine } from '../../canvas-engine';
import { generateUUID } from '../../utils';
import { CATALOG } from '../../app';
import { EventBus } from '../../event-bus';
import { Panel } from '../components/panel';

export class GlobalSearchPanel {
  private container: HTMLElement;
  private panel: Panel;
  private input: HTMLInputElement;
  private resultsContainer: HTMLElement;
  private isVisible = false;

  constructor(
    private appShell: HTMLElement, 
    private objectEngine: ObjectEngine,
    private commandEngine: CommandEngine,
    private canvasEngine: CanvasEngine,
    private eventBus: EventBus
  ) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-global-search';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '600px',
      maxHeight: '80%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      display: 'none',
      flexDirection: 'column',
      zIndex: '2000',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden'
    });

    this.panel = new Panel('Global Search');
    this.panel.element.style.borderTop = 'none';
    this.container.appendChild(this.panel.element);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.hide());
    
    this.panel.header.appendChild(closeBtn);

    const wrapper = document.createElement('div');
    wrapper.style.padding = 'var(--space-md)';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.flex = '1';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Search components, nets, pages, libraries...';
    Object.assign(this.input.style, {
      width: '100%',
      background: 'var(--bg-canvas)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-primary)',
      padding: 'var(--space-sm) var(--space-md)',
      font: 'var(--text-body)',
      outline: 'none',
      boxSizing: 'border-box'
    });

    this.resultsContainer = document.createElement('div');
    Object.assign(this.resultsContainer.style, {
      marginTop: 'var(--space-sm)',
      flex: '1',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)'
    });

    wrapper.appendChild(this.input);
    wrapper.appendChild(this.resultsContainer);
    this.panel.content.appendChild(wrapper);

    this.appShell.appendChild(this.container);

    let selectedIndex = -1;
    let resultElements: HTMLElement[] = [];

    this.input.addEventListener('input', () => {
      this.performSearch();
      resultElements = Array.from(this.resultsContainer.children) as HTMLElement[];
      selectedIndex = -1;
      this.updateSelection(resultElements, selectedIndex);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        selectedIndex = Math.min(selectedIndex + 1, resultElements.length - 1);
        this.updateSelection(resultElements, selectedIndex);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.updateSelection(resultElements, selectedIndex);
        e.preventDefault();
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < resultElements.length) {
        resultElements[selectedIndex].click();
        e.preventDefault();
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  private updateSelection(elements: HTMLElement[], index: number) {
    elements.forEach((el, i) => {
      if (i === index) {
        el.style.background = 'var(--text-secondary)';
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.style.background = 'var(--border)';
      }
    });
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.input.value = '';
    this.resultsContainer.innerHTML = '';
    this.input.focus();
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  private performSearch() {
    const query = this.input.value.toLowerCase();
    this.resultsContainer.innerHTML = '';
    if (!query) return;

    const results: { category: string; label: string; subtext: string }[] = [];

    // Search Library
    const libMatches = globalSearch.search(query);
    for (const match of libMatches.slice(0, 5)) {
      results.push({ category: 'Library', label: match.name, subtext: `Type: ${match.id}` });
    }

    // Search Project Components
    const project = this.objectEngine.getProject();
    for (const page of project.pages) {
      if (page.name.toLowerCase().includes(query)) {
        results.push({ category: 'Page', label: page.name, subtext: `Page ID: ${page.id}` });
      }

      for (const layer of page.layers) {
        for (const obj of layer.objects) {
          if (obj.name.toLowerCase().includes(query) || obj.type.toLowerCase().includes(query)) {
            results.push({ category: 'Component', label: obj.name, subtext: `Type: ${obj.type} (Page: ${page.name})` });
          }
        }
      }
    }

    // Search Nets
    const connections = this.objectEngine.getConnections();
    for (const conn of connections) {
      if (conn.netId.toLowerCase().includes(query)) {
        if (!results.find(r => r.category === 'Net' && r.label === conn.netId)) {
          results.push({ category: 'Net', label: conn.netId, subtext: 'Logical Connection' });
        }
      }
    }

    this.renderResults(results.slice(0, 15));
  }

  private renderResults(results: any[]) {
    if (results.length === 0) {
      this.resultsContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: var(--space-lg); font: var(--text-body);">No results found.</div>';
      return;
    }

    results.forEach(res => {
      const item = document.createElement('div');
      Object.assign(item.style, {
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--bg-canvas)',
        border: '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'var(--transition-fast)'
      });
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: var(--text-primary); font: var(--text-body);">${this.escapeHtml(res.label)}</strong>
          <span style="font: var(--text-caption); background: var(--bg-toolbar); color: var(--text-secondary); padding: 2px var(--space-xs); border-radius: var(--radius-sm); border: 1px solid var(--border);">${this.escapeHtml(res.category)}</span>
        </div>
        <div style="font: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-xs);">${this.escapeHtml(res.subtext)}</div>
      `;

      item.addEventListener('mouseenter', () => { 
        item.style.background = 'var(--bg-toolbar)'; 
        item.style.border = '1px solid var(--accent)';
      });
      item.addEventListener('mouseleave', () => { 
        item.style.background = 'var(--bg-canvas)'; 
        item.style.border = '1px solid transparent';
      });

      item.addEventListener('click', () => {
        if (res.category === 'Library') {
          const compDef = CATALOG.find(c => c.name === res.label);
          if (compDef) {
            const center = this.canvasEngine.screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            const compId = `comp-${generateUUID().substring(0, 8)}`;
            const result = this.commandEngine.dispatch({
              id: `cmd-place-${generateUUID().substring(0,8)}`,
              name: 'CreateComponent',
              payload: {
                layerId: this.objectEngine.getProject().pages[0].layers[0].id,
                component: {
                  id: compId,
                  type: compDef.type,
                  name: compDef.name,
                  properties: { x: center.x - 50, y: center.y - 40, rotation: 0 },
                  ports: JSON.parse(JSON.stringify(compDef.ports || [])),
                  pins: JSON.parse(JSON.stringify(compDef.pins || {}))
                }
              }
            });
            if (result.success) {
              this.eventBus.publish({ namespace: 'selection', name: 'set', payload: { ids: [compId] } });
              this.hide();
            } else {
              alert(`Failed to place component: ${result.error}`);
            }
          } else {
            alert(`Component definition for ${res.label} not found in catalog.`);
          }
        }
      });

      this.resultsContainer.appendChild(item);
    });
  }

  private escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
