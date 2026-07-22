import { ObjectEngine } from '../../object-engine';
import { CommandEngine } from '../../command-engine';
import { CanvasEngine } from '../../canvas-engine';
import { EventBus } from '../../event-bus';
import { generateUUID } from '../../utils';
import { DiscoveryViewModel, DiscoveryState } from '../../component-library/discovery/view-model';
import { DiscoveryService } from '../../component-library/discovery/service';
import { globalRegistry } from '../../component-library/global';
import { ComponentMetadata } from '../../component-library/types';

export class ComponentBrowser {
  private overlay: HTMLElement;
  private dialog: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private searchInput!: HTMLInputElement;
  private modeTabs!: HTMLElement;
  private listContainer!: HTMLElement;

  private viewModel: DiscoveryViewModel;

  constructor(
    private appShell: HTMLElement,
    private commandEngine: CommandEngine,
    private canvasEngine: CanvasEngine,
    private objectEngine: ObjectEngine,
    private eventBus: EventBus
  ) {
    const service = new DiscoveryService(globalRegistry, window.localStorage);
    this.viewModel = new DiscoveryViewModel(service);

    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    this.overlay.style.display = 'none';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.justifyContent = 'center';
    this.overlay.style.zIndex = '9999';

    this.dialog = document.createElement('div');
    this.dialog.style.width = '800px';
    this.dialog.style.height = '600px';
    this.dialog.style.background = 'var(--bg-panel)';
    this.dialog.style.border = '1px solid var(--border)';
    this.dialog.style.borderRadius = 'var(--radius-lg)';
    this.dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    this.dialog.style.display = 'flex';
    this.dialog.style.overflow = 'hidden';
    this.dialog.style.color = 'var(--text-primary)';
    this.dialog.style.fontFamily = 'var(--text-body)';

    this.leftPanel = document.createElement('div');
    this.leftPanel.style.width = '60%';
    this.leftPanel.style.display = 'flex';
    this.leftPanel.style.flexDirection = 'column';
    this.leftPanel.style.borderRight = '1px solid var(--border)';

    this.rightPanel = document.createElement('div');
    this.rightPanel.style.width = '40%';
    this.rightPanel.style.display = 'flex';
    this.rightPanel.style.flexDirection = 'column';
    this.rightPanel.style.background = 'var(--bg-canvas)';

    this.dialog.appendChild(this.leftPanel);
    this.dialog.appendChild(this.rightPanel);
    this.overlay.appendChild(this.dialog);
    this.appShell.appendChild(this.overlay);

    this.buildLeftPanel();
    
    // Close on overlay click
    this.overlay.addEventListener('mousedown', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
        this.hide();
      }
    });

    this.viewModel.subscribe(state => this.render(state));
  }

  private buildLeftPanel() {
    const header = document.createElement('div');
    header.style.padding = 'var(--space-md)';
    header.style.borderBottom = '1px solid var(--border)';
    
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search components (Name, Mfg, Tags)...';
    this.searchInput.style.width = '100%';
    this.searchInput.style.padding = '8px 12px';
    this.searchInput.style.background = 'var(--bg-canvas)';
    this.searchInput.style.color = 'var(--text-primary)';
    this.searchInput.style.border = '1px solid var(--border)';
    this.searchInput.style.borderRadius = 'var(--radius-sm)';
    this.searchInput.style.outline = 'none';
    this.searchInput.style.font = 'var(--text-body)';
    this.searchInput.style.boxSizing = 'border-box';
    this.searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (val.trim() === '') {
        this.viewModel.setMode('browse');
      } else {
        this.viewModel.setSearchQuery(val);
      }
    });
    this.searchInput.addEventListener('keydown', (e) => {
      const state = this.viewModel.getState();
      if (!state.results.length) return;
      
      const currentIndex = state.selectedComponent 
        ? state.results.findIndex((r: any) => r.id === state.selectedComponent!.id) 
        : -1;
        
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, state.results.length - 1);
        this.viewModel.selectComponent(state.results[next].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        this.viewModel.selectComponent(state.results[prev].id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.selectedComponent) {
          this.viewModel.insertComponent(state.selectedComponent.id);
          this.placeItem(state.selectedComponent);
        }
      }
    });
    header.appendChild(this.searchInput);

    this.modeTabs = document.createElement('div');
    this.modeTabs.style.display = 'flex';
    this.modeTabs.style.gap = 'var(--space-sm)';
    this.modeTabs.style.padding = 'var(--space-sm) var(--space-md)';
    this.modeTabs.style.borderBottom = '1px solid var(--border)';
    
    ['Browse', 'Recent', 'Favorites'].forEach(mode => {
      const tab = document.createElement('div');
      tab.textContent = mode;
      tab.style.padding = '4px 12px';
      tab.style.cursor = 'pointer';
      tab.style.borderRadius = 'var(--radius-sm)';
      tab.style.fontSize = '13px';
      tab.style.fontWeight = '500';
      tab.addEventListener('click', () => {
        this.searchInput.value = '';
        this.viewModel.setMode(mode.toLowerCase() as any);
      });
      // Stored in DOM to update styling later
      tab.dataset.mode = mode.toLowerCase();
      this.modeTabs.appendChild(tab);
    });

    this.listContainer = document.createElement('div');
    this.listContainer.style.flex = '1';
    this.listContainer.style.overflowY = 'auto';
    this.listContainer.style.padding = 'var(--space-md)';

    this.leftPanel.appendChild(header);
    this.leftPanel.appendChild(this.modeTabs);
    this.leftPanel.appendChild(this.listContainer);
  }

  private render(state: DiscoveryState) {
    // Update tabs
    Array.from(this.modeTabs.children).forEach((tab: any) => {
      if (tab.dataset.mode === state.mode) {
        tab.style.background = 'var(--accent)';
        tab.style.color = '#fff';
      } else {
        tab.style.background = 'transparent';
        tab.style.color = 'var(--text-secondary)';
      }
    });

    this.listContainer.innerHTML = '';

    if (state.mode === 'browse') {
      // Breadcrumbs
      if (state.currentBrowsePath.length > 0) {
        const breadcrumbs = document.createElement('div');
        breadcrumbs.style.marginBottom = 'var(--space-md)';
        breadcrumbs.style.color = 'var(--text-secondary)';
        breadcrumbs.style.fontSize = '12px';
        breadcrumbs.style.cursor = 'pointer';
        breadcrumbs.innerHTML = `← Back to ${state.currentBrowsePath.length === 1 ? 'Root' : state.currentBrowsePath[state.currentBrowsePath.length - 2]}`;
        breadcrumbs.addEventListener('click', () => {
          this.viewModel.setBrowsePath(state.currentBrowsePath.slice(0, -1));
        });
        this.listContainer.appendChild(breadcrumbs);
      }

      // Folders
      const folders = Array.from(state.browseTree.children.keys());
      folders.forEach(folder => {
        const row = document.createElement('div');
        row.textContent = `📁 ${folder}`;
        row.style.padding = '8px';
        row.style.cursor = 'pointer';
        row.style.borderRadius = 'var(--radius-sm)';
        row.style.marginBottom = '4px';
        row.style.background = 'var(--bg-canvas)';
        row.addEventListener('click', () => {
          this.viewModel.setBrowsePath([...state.currentBrowsePath, folder]);
        });
        this.listContainer.appendChild(row);
      });
    }

    // Results
    if (state.results.length === 0 && (state.mode !== 'browse' || state.browseTree.children.size === 0)) {
      const empty = document.createElement('div');
      empty.textContent = 'No components found.';
      empty.style.color = 'var(--text-secondary)';
      empty.style.textAlign = 'center';
      empty.style.marginTop = 'var(--space-xl)';
      this.listContainer.appendChild(empty);
    }

    state.results.forEach(comp => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px';
      row.style.cursor = 'pointer';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.marginBottom = '4px';
      
      const isSelected = state.selectedComponent?.id === comp.id;
      row.style.background = isSelected ? 'var(--selection-bg)' : 'transparent';
      
      const info = document.createElement('div');
      info.innerHTML = `
        <div style="font-weight: 500">${comp.name}</div>
        <div style="font-size: 11px; color: var(--text-secondary)">${comp.tvcs?.manufacturer || 'Generic'} • ${comp.tvcs?.package || 'Unknown'}</div>
      `;
      
      row.appendChild(info);

      // Fav icon
      const fav = document.createElement('div');
      const isFav = this.viewModel.isFavorite(comp.id);
      fav.textContent = isFav ? '★' : '☆';
      fav.style.color = isFav ? '#f1fa8c' : 'var(--text-secondary)';
      fav.style.cursor = 'pointer';
      fav.style.padding = '4px';
      fav.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewModel.toggleFavorite(comp.id);
      });

      row.appendChild(fav);

      row.addEventListener('click', () => {
        this.viewModel.selectComponent(comp.id);
      });

      row.addEventListener('dblclick', () => {
        this.viewModel.insertComponent(comp.id);
        this.placeItem(comp);
      });

      this.listContainer.appendChild(row);
    });

    this.renderPreview(state.selectedComponent);
  }

  private renderPreview(comp: ComponentMetadata | null) {
    this.rightPanel.innerHTML = '';
    if (!comp) {
      this.rightPanel.innerHTML = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">Select a component to preview</div>`;
      return;
    }

    const preview = document.createElement('div');
    preview.style.padding = 'var(--space-md)';
    preview.style.display = 'flex';
    preview.style.flexDirection = 'column';
    preview.style.height = '100%';
    preview.style.boxSizing = 'border-box';

    const t = comp.tvcs;

    preview.innerHTML = `
      <h2 style="margin: 0 0 4px 0; font-size: 18px;">${comp.name}</h2>
      <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: var(--space-md)">${t?.manufacturer || 'Unknown Manufacturer'}</div>
      
      <div style="height: 200px; background: var(--bg-panel); border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-md); position: relative;">
        <!-- Placeholder for TVCS Top View Illustration -->
        <div style="color: var(--accent); font-weight: bold; border: 2px solid var(--accent); padding: 20px; border-radius: 4px;">
          ${t?.package || comp.visual.symbol}
        </div>
      </div>

      <div style="font-size: 13px; line-height: 1.5; flex: 1; overflow-y: auto;">
        <div style="margin-bottom: 8px;"><strong>Family:</strong> ${t?.family || 'N/A'}</div>
        <div style="margin-bottom: 8px;"><strong>Variant:</strong> ${t?.variant || 'N/A'}</div>
        <div style="margin-bottom: 8px;"><strong>Description:</strong> ${comp.description}</div>
        <div style="margin-bottom: 8px;"><strong>Pins:</strong> ${comp.electrical.pins.length}</div>
        <div style="margin-bottom: 8px;"><strong>Voltage:</strong> ${t?.electrical.operatingVoltageMin || 0}V - ${t?.electrical.operatingVoltageMax || 0}V</div>
        <div style="margin-bottom: 8px;"><strong>Interfaces:</strong> ${t?.interfaces.join(', ') || 'None'}</div>
        <div style="margin-bottom: 8px;"><strong>Category Path:</strong> ${t?.categoryPath.join(' > ') || 'Root'}</div>
        ${t?.datasheetUrl ? `<div style="margin-bottom: 8px;"><a href="${t.datasheetUrl}" target="_blank" style="color: var(--accent)">📄 Datasheet</a></div>` : ''}
      </div>
    `;

    const btn = document.createElement('button');
    btn.textContent = 'Add Component';
    btn.style.marginTop = 'var(--space-md)';
    btn.style.padding = '10px';
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = 'var(--radius-sm)';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.addEventListener('click', () => {
      this.viewModel.insertComponent(comp.id);
      this.placeItem(comp);
    });

    preview.appendChild(btn);
    this.rightPanel.appendChild(preview);
  }

  private placeItem(comp: ComponentMetadata) {
    this.hide();

    const center = this.canvasEngine.screenToWorld({
      x: this.canvasEngine.getWidth() / 2,
      y: this.canvasEngine.getHeight() / 2,
    });
    
    // Snap to grid (assuming 20px grid base for new components)
    const px = Math.round(center.x / 20) * 20;
    const py = Math.round(center.y / 20) * 20;

    const layerId = this.objectEngine.getProject().pages[0]?.layers[0]?.id || 'layer-1';
    const compId = `comp-${generateUUID().substring(0, 8)}`;
    
    const ports = (comp.electrical?.pins || []).map(p => ({
      id: p.id,
      name: p.name,
      direction: 'passive',
      signalCategory: 'default'
    }));

    const result = this.commandEngine.dispatch({
      id: `cmd-place-${generateUUID().substring(0,8)}`,
      name: 'CreateComponent',
      payload: {
        layerId,
        component: {
          id: compId,
          type: comp.id,
          name: comp.name,
          properties: { x: px, y: py, rotation: 0 },
          ports: ports,
          pins: []
        }
      }
    });

    if (result.success) {
      this.eventBus.publish({ namespace: 'selection', name: 'set', payload: { ids: [compId] } });
      this.eventBus.publish({ namespace: 'system', name: 'redrawRequested', payload: {} });
    } else {
      alert(`Failed to place component: ${result.error}`);
    }
  }

  public show(): void {
    this.searchInput.value = '';
    this.viewModel.setMode('browse');
    this.overlay.style.display = 'flex';
    this.searchInput.focus();
  }

  public hide(): void {
    this.overlay.style.display = 'none';
  }
}
