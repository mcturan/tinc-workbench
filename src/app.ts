import { EventBus } from './event-bus';
import { ObjectEngine } from './object-engine';
import { HistoryEngine, CommandReverserReplayer } from './history-engine';
import { CommandEngine } from './command-engine';
import { GeometryEngine } from './geometry-engine';
import { CanvasEngine } from './canvas-engine';
import { RenderingEngine } from './rendering-engine';
import { SemanticObject } from './types';
import { generateUUID } from './utils';
import { InputRouter } from './input-router';
import { SelectionEngine } from './selection-engine';
import { ToolSystem } from './tool-system';

import { globalRegistry, globalSearch } from './component-library';
import { DocumentationPanel } from './ui/panels/documentation';
import { GlobalSearchPanel } from './ui/panels/global-search';
import { PlaceholderPanel } from './ui/components/placeholder';
import { TemplatesPanel } from './ui/panels/templates';
import { KiCadImportPanel } from './ui/panels/kicad-import';
import { ProjectDashboardPanel } from './ui/panels/project-dashboard';
import { ProjectIntelligenceEngine } from './project-intelligence/engine';
import { DeviceWorkspaceUI } from './ui/device-workspace';
import { WorkbenchUI } from './ui/workbench';
import { ProjectExplorer } from './project-explorer/explorer';
import { PropertyInspector } from './property-inspector/inspector';
import { WelcomeScreen } from './ui/welcome-screen';
import { MenuBarUI } from './ui/menu-bar';
import { PersistenceManager } from './persistence';
import { AutosaveService } from './persistence/autosave';
import { SessionRecoveryService } from './persistence/recovery';
import { ComponentBrowser } from './ui/panels/component-browser';
// 1. Dynamic Component Catalog built from Component Library metadata
export const CATALOG: { type: string; name: string; aliases: string[]; ports: any[]; pins: any[] }[] =
  globalRegistry.list().map(match => {
    const cat = match.tvcs?.categoryPath?.[0]?.toLowerCase() || '';
    const isMCU = cat === 'mcu' || cat === 'microcontrollers';
    const ports: any[] = [];
    const pins: any[] = [];

    for (const pin of match.electrical.pins) {
      const term = {
        id: pin.id,
        name: pin.name,
        direction: pin.direction === 'unspecified' ? 'passive' : pin.direction,
        signalCategory: pin.electricalType,
      };
      if (isMCU) {
        pins.push(term);
      } else {
        if (pin.electricalType === 'digital' || pin.electricalType === 'analog') {
          pins.push(term);
        } else {
          ports.push(term);
        }
      }
    }

    return {
      type: match.id,
      name: match.name,
      aliases: match.aliases,
      ports,
      pins,
    };
  });

// Helper to match catalog query using ranked Component Library Search
export function queryCatalog(query: string) {
  const results = globalSearch.search(query);
  if (results.length === 0) return null;
  const match = results[0];
  return CATALOG.find(item => item.type === match.id) || null;
}

// 2. Application Bootstrap
export function bootstrapApp(containerId: string) {
  const style = document.createElement('style');
  style.innerHTML = `
    :root {
      /* Colors */
      --bg-surface: #ffffff;
      --bg-sidebar: #f5f5f5;
      --bg-toolbar: #eeeeee;
      --bg-canvas: #e0e0e0;
      --border-strong: #cccccc;
      --border: #dddddd;
      --text-secondary: #555555;
      --text-primary: #111111;
      --accent: #007acc;
      --success: #28a745;
      --danger: #dc3545;
      --warning: #ffc107;

      /* Typography */
      --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      --text-display: 600 24px/1.2 var(--font-family);
      --text-h1: 600 16px/1.4 var(--font-family);
      --text-h2: 600 14px/1.4 var(--font-family);
      --text-body: 400 13px/1.5 var(--font-family);
      --text-caption: 500 11px/1.4 var(--font-family);

      /* Spacing (8pt grid) */
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --space-xxl: 32px;

      /* Radii */
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --radius-pill: 9999px;

      /* Elevation */
      --elevation-0: none;
      --elevation-1: 0 2px 8px rgba(0,0,0,0.1);
      --elevation-2: 0 4px 12px rgba(0,0,0,0.15);
      --elevation-3: 0 10px 30px rgba(0,0,0,0.2);

      /* Transitions */
      --transition-fast: 0.15s ease-in-out;
    }
    
    [data-theme="dark"] {
      --bg-surface: #282a36;
      --bg-sidebar: #21222c;
      --bg-toolbar: #1e1f29;
      --bg-canvas: #18191e;
      --border-strong: #191a21;
      --border: #44475a;
      --text-secondary: #6272a4;
      --text-primary: #f8f8f2;
      --accent: #bd93f9;
      --success: #50fa7b;
      --danger: #ff5555;
      --warning: #f1fa8c;
      --elevation-1: 0 2px 8px rgba(0,0,0,0.4);
      --elevation-2: 0 4px 12px rgba(0,0,0,0.5);
      --elevation-3: 0 10px 30px rgba(0,0,0,0.6);
    }

    body {
      font: var(--text-body);
      color: var(--text-primary);
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: var(--bg-canvas);
    }

    * {
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
  document.documentElement.setAttribute('data-theme', 'dark');

  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  // Clear container
  container.innerHTML = '';

  // 1. Initialize Workbench UI Shell
  const workbench = new WorkbenchUI(containerId);
  const appShell = workbench.appShell;
  
  const canvas = document.createElement('canvas');
  canvas.id = 'tinc-canvas';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.style.display = 'block';
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  canvas.style.userSelect = 'none';
  (canvas.style as any).webkitUserSelect = 'none';
  (canvas.style as any).webkitTapHighlightColor = 'transparent';
  canvas.style.background = 'transparent';
  
  const initialCtx = canvas.getContext('2d')!;
  initialCtx.scale(dpr, dpr);

  // Attach canvas to workbench container
  workbench.canvasContainer.appendChild(canvas);

  // Initialize Welcome Screen Overlay (First Run Experience)
  try {
    new WelcomeScreen(appShell, undefined as any, () => {
      workbench.setStatus('TINC Workbench | Ready', 'No active project');
    });
  } catch (e) {
    console.error('Failed to init WelcomeScreen', e);
  }

  // Summon Overlay (UX-004)
  const summonOverlay = document.createElement('div');
  summonOverlay.id = 'tinc-summon-overlay';
  summonOverlay.style.position = 'absolute';
  summonOverlay.style.top = '25%';
  summonOverlay.style.left = '50%';
  summonOverlay.style.transform = 'translate(-50%, -50%)';
  summonOverlay.style.background = 'var(--bg-surface)';
  summonOverlay.style.border = '1px solid #44475a';
  summonOverlay.style.borderRadius = '8px';
  summonOverlay.style.padding = '12px 16px';
  summonOverlay.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
  summonOverlay.style.display = 'none';
  summonOverlay.style.zIndex = '1000';

  const summonInput = document.createElement('input');
  summonInput.id = 'tinc-summon-input';
  summonInput.type = 'text';
  summonInput.placeholder = 'Type component (e.g. ESP32, psu)...';
  summonInput.style.background = 'var(--bg-toolbar)';
  summonInput.style.border = '1px solid #6272a4';
  summonInput.style.borderRadius = '4px';
  summonInput.style.color = 'var(--text-primary)';
  summonInput.style.padding = '8px 12px';
  summonInput.style.fontSize = '14px';
  summonInput.style.width = '280px';
  summonInput.style.outline = 'none';

  summonOverlay.appendChild(summonInput);
  appShell.appendChild(summonOverlay);

  // Floating Add Component Button
  const addComponentBtn = document.createElement('button');
  addComponentBtn.innerHTML = '+';
  addComponentBtn.title = 'Add Component';
  addComponentBtn.style.position = 'absolute';
  addComponentBtn.style.top = '16px';
  addComponentBtn.style.left = '16px';
  addComponentBtn.style.zIndex = '90';
  addComponentBtn.style.width = '48px';
  addComponentBtn.style.height = '48px';
  addComponentBtn.style.background = 'var(--accent)';
  addComponentBtn.style.color = '#fff';
  addComponentBtn.style.border = 'none';
  addComponentBtn.style.borderRadius = '24px';
  addComponentBtn.style.cursor = 'pointer';
  addComponentBtn.style.fontSize = '28px';
  addComponentBtn.style.display = 'flex';
  addComponentBtn.style.alignItems = 'center';
  addComponentBtn.style.justifyContent = 'center';
  addComponentBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  addComponentBtn.style.transition = 'transform 0.1s';
  addComponentBtn.addEventListener('mousedown', () => addComponentBtn.style.transform = 'scale(0.95)');
  addComponentBtn.addEventListener('mouseup', () => addComponentBtn.style.transform = 'scale(1)');
  addComponentBtn.addEventListener('mouseleave', () => addComponentBtn.style.transform = 'scale(1)');
  workbench.canvasContainer.appendChild(addComponentBtn);

  addComponentBtn.addEventListener('click', () => {
    componentBrowser.show();
  });

  // Canvas double click -> Quick Add
  canvas.addEventListener('dblclick', (e) => {
    componentBrowser.show();
  });

  // Click outside closes summon overlay
  document.addEventListener('click', (e) => {
    if (summonOverlay.style.display === 'block' && !summonOverlay.contains(e.target as Node)) {
      summonOverlay.style.display = 'none';
      canvas.focus();
    }
  });

  // Initialize Core Engines
  const eventBus = new EventBus();
  const objectEngine = new ObjectEngine('project-v1', 'TINC Validation Project');
  const reverserReplayer: CommandReverserReplayer = {
    executeReverse: (delta: any): boolean => commandEngine.executeReverseDelta(delta),
    executeReplay: (delta: any): boolean => commandEngine.executeReplay(delta),
  };
  const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
  const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
  const geometryEngine = new GeometryEngine();
  const canvasEngine = new CanvasEngine();
  const renderingEngine = new RenderingEngine(geometryEngine);
  const inputRouter = new InputRouter(canvasEngine);
  const selectionEngine = new SelectionEngine();
  const toolSystem = new ToolSystem();

  let docPanel: DocumentationPanel | null = null;
  let searchPanel: GlobalSearchPanel | null = null;
  let templatesPanel: TemplatesPanel | null = null;
  let kicadImportPanel: KiCadImportPanel | null = null;
  
  try { docPanel = new DocumentationPanel(appShell, commandEngine, objectEngine); } catch (e) { console.error('Failed to init DocumentationPanel', e); }
  try { searchPanel = new GlobalSearchPanel(appShell, objectEngine, commandEngine, canvasEngine, eventBus); } catch (e) { console.error('Failed to init GlobalSearchPanel', e); }
  try { templatesPanel = new TemplatesPanel(appShell, commandEngine, objectEngine); } catch (e) { console.error('Failed to init TemplatesPanel', e); }
  try { kicadImportPanel = new KiCadImportPanel(appShell, commandEngine); } catch (e) { console.error('Failed to init KiCadImportPanel', e); }


  const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, val: string) => localStorage.setItem(key, val),
    removeItem: (key: string) => localStorage.removeItem(key)
  };

  const persistenceManager = new PersistenceManager(objectEngine, storage);
  
  try {
    const sessionRecovery = new SessionRecoveryService(storage, 'tinc_recovery_snapshot');
    if (sessionRecovery.hasRecoverySnapshot()) {
      if (confirm('A recovery snapshot was found. Would you like to restore it?')) {
        if (sessionRecovery.performRecovery(objectEngine)) {
          console.log('Session recovered successfully.');
        } else {
          alert('Failed to recover session.');
        }
      } else {
        sessionRecovery.clearRecoverySnapshot();
      }
    }
  } catch (e) {
    console.error('Failed to init SessionRecoveryService', e);
  }

  let autosaveService: AutosaveService | null = null;
  try {
    autosaveService = new AutosaveService(objectEngine, storage, 'tinc_recovery_snapshot');
    autosaveService.setInterval(30000);
    autosaveService.start();

    eventBus.subscribe('*', () => {
      if (autosaveService && autosaveService.isDirty()) {
        autosaveService.triggerAutosave();
      }
    }, { priority: 1 });
  } catch (e) {
    console.error('Failed to init AutosaveService', e);
  }

  new MenuBarUI(workbench.menuBarContainer, [
    {
      label: 'File',
      items: [
        { label: 'New Project', onClick: () => { window.location.reload(); } },
        { label: 'Open...', onClick: async () => {
          try {
            if ('showOpenFilePicker' in window) {
              const [handle] = await (window as any).showOpenFilePicker({ types: [{ description: 'TINC Project', accept: { 'application/json': ['.tinc'] } }] });
              const file = await handle.getFile();
              const text = await file.text();
              const res = persistenceManager.openProject(text);
              if (res.success) {
                requestRedraw();
                alert('Project opened successfully');
              } else {
                alert('Failed to open project: Data is corrupt or invalid format.\n' + res.error);
              }
            } else {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.tinc';
              input.onchange = (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                  const text = re.target?.result as string;
                  const res = persistenceManager.openProject(text);
                  if (res.success) {
                    requestRedraw();
                    alert('Project opened successfully');
                  } else {
                    alert('Failed to open project: Data is corrupt or invalid format.\n' + res.error);
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }
          } catch (e: any) { 
            if (e.name !== 'AbortError') alert('Error opening file: ' + e.message); 
          }
        }},
        { separator: true },
        { label: 'Save', onClick: async () => {
          try {
            const content = persistenceManager.saveProject();
            if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({ types: [{ description: 'TINC Project', accept: { 'application/json': ['.tinc'] } }] });
              const writable = await handle.createWritable();
              await writable.write(content);
              await writable.close();
              workbench.setStatus('TINC Workbench', 'Project saved successfully.');
            } else {
              const blob = new Blob([content], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'project.tinc';
              a.click();
              URL.revokeObjectURL(url);
              workbench.setStatus('TINC Workbench', 'Project saved successfully (downloaded).');
            }
          } catch (e: any) { 
            if (e.name !== 'AbortError') alert('Failed to save project: ' + e.message); 
          }
        }},
        { label: 'Save As...', onClick: async () => {
          try {
            const content = persistenceManager.saveAs();
            if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({ types: [{ description: 'TINC Project', accept: { 'application/json': ['.tinc'] } }] });
              const writable = await handle.createWritable();
              await writable.write(content);
              await writable.close();
              workbench.setStatus('TINC Workbench', 'Project saved successfully.');
            } else {
              const blob = new Blob([content], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'project.tinc';
              a.click();
              URL.revokeObjectURL(url);
              workbench.setStatus('TINC Workbench', 'Project saved successfully (downloaded).');
            }
          } catch (e: any) { 
            if (e.name !== 'AbortError') alert('Failed to save project: ' + e.message); 
          }
        }},
        { separator: true },
        { label: 'Export BOM (CSV)', onClick: () => {
          try {
            const summary = intelligenceEngine.analyze();
            let csv = 'Name,Category,Quantity,Status\n';
            for (const req of summary.inventoryRequirements) {
              csv += `"${req.itemName}","Component",${req.requiredQuantity},${req.status}\n`;
            }
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bom.csv';
            a.click();
            URL.revokeObjectURL(url);
          } catch (e: any) {
            alert('Failed to export BOM: ' + e.message);
          }
        }},
        { label: 'Export Netlist', onClick: () => {
          try {
            const netlist = '(export (version D)\n  (components)\n  (nets)\n)\n';
            const blob = new Blob([netlist], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'netlist.net';
            a.click();
            URL.revokeObjectURL(url);
          } catch (e: any) {
            alert('Failed to export Netlist: ' + e.message);
          }
        }}
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', accelerator: 'Ctrl+Z', onClick: () => historyEngine.undo() },
        { label: 'Redo', accelerator: 'Ctrl+Y', onClick: () => historyEngine.redo() },
        { separator: true },
        { label: 'Cut', accelerator: 'Ctrl+X', onClick: async () => {
          try {
            const ids = selectionEngine.getSelectedIds();
            if (ids.length > 0) {
              const objs = ids.map(id => objectEngine.getObject(id)).filter(o => o);
              await navigator.clipboard.writeText(JSON.stringify(objs));
              for (const id of ids) {
                try {
                  commandEngine.dispatch({ id: `cmd-cut-${generateUUID().substring(0, 8)}`, name: 'DeleteComponent', payload: { componentId: id } });
                } catch {
                  try { commandEngine.dispatch({ id: `cmd-cut-w-${generateUUID().substring(0, 8)}`, name: 'DeleteWire', payload: { wireId: id } }); } catch { /* ignore */ }
                }
              }
              selectionEngine.clear();
              requestRedraw();
            }
          } catch (e: any) { alert('Failed to cut: ' + e.message); }
        }},
        { label: 'Copy', accelerator: 'Ctrl+C', onClick: async () => {
          try {
            const ids = selectionEngine.getSelectedIds();
            if (ids.length > 0) {
              const objs = ids.map(id => objectEngine.getObject(id)).filter(o => o);
              await navigator.clipboard.writeText(JSON.stringify(objs));
            }
          } catch (e: any) { alert('Failed to copy: ' + e.message); }
        }},
        { label: 'Paste', accelerator: 'Ctrl+V', onClick: async () => {
          try {
            const text = await navigator.clipboard.readText();
            const objs = JSON.parse(text);
            if (Array.isArray(objs)) {
              selectionEngine.clear();
              for (const obj of objs) {
                if (obj.kind === 'module') continue; // Skip physical objects for now
                if (obj.segments) continue; // Skip wires for now
                
                const newId = `comp-pasted-${generateUUID().substring(0, 8)}`;
                commandEngine.dispatch({
                  id: `cmd-paste-${generateUUID().substring(0, 8)}`,
                  name: 'CreateComponent',
                  payload: {
                    layerId: 'layer-1',
                    component: {
                      ...obj,
                      id: newId,
                      properties: { ...obj.properties, x: (obj.properties?.x || 0) + 20, y: (obj.properties?.y || 0) + 20 }
                    }
                  }
                });
                selectionEngine.select(newId);
              }
              requestRedraw();
            } else {
              alert('Clipboard does not contain valid TINC components.');
            }
          } catch (e: any) { alert('Paste failed: ' + e.message); }
        }},
        { label: 'Duplicate', accelerator: 'D', onClick: () => {
          const ids = selectionEngine.getSelectedIds();
          if (ids.length > 0) {
            commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DuplicateComponent', payload: { sourceId: ids[0] } });
            requestRedraw();
          }
        }},
        { separator: true },
        { label: 'Delete', accelerator: 'Del', onClick: () => {
          const ids = selectionEngine.getSelectedIds();
          if (ids.length > 0) {
            for (const id of ids) {
              try {
                commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteComponent', payload: { componentId: id } });
              } catch {
                try {
                  commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteWire', payload: { wireId: id } });
                } catch { /* ignore */ }
              }
            }
            selectionEngine.clear();
            requestRedraw();
          }
        }}
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', accelerator: '+', onClick: () => { canvasEngine.zoomIn(); requestRedraw(); } },
        { label: 'Zoom Out', accelerator: '-', onClick: () => { canvasEngine.zoomOut(); requestRedraw(); } },
        { label: 'Reset View', accelerator: '0', onClick: () => { canvasEngine.setZoom(1); canvasEngine.centerViewport({x: 0, y: 0}); requestRedraw(); } }
      ]
    },
    {
      label: 'Window',
      items: [
        { label: 'Project Explorer', accelerator: '1', onClick: () => { workbench.getLeftSidebar().style.display = workbench.getLeftSidebar().style.display === 'none' ? 'flex' : 'none'; } },
        { label: 'Property Inspector', accelerator: '2', onClick: () => { workbench.getRightSidebar().style.display = workbench.getRightSidebar().style.display === 'none' ? 'flex' : 'none'; } },
        { separator: true },
        { label: 'Project Dashboard', accelerator: 'H', onClick: () => dashboardPanel?.toggle() }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', accelerator: 'O', onClick: () => docPanel?.toggle() },
        { separator: true },
        { label: 'About TINC Workbench', onClick: () => alert('TINC Workbench RC1\nAn Advanced EDA Suite') }
      ]
    }
  ]);

  // Device Workspace Overlay
  const deviceWorkspace = new DeviceWorkspaceUI(workbench.deviceWorkspaceContainer, commandEngine);
  let isDeviceWorkspaceActive = false;

  const intelligenceEngine = new ProjectIntelligenceEngine(objectEngine, deviceWorkspace.getManager());
  let dashboardPanel: ProjectDashboardPanel | null = null;
  try {
    dashboardPanel = new ProjectDashboardPanel(
      appShell, 
      intelligenceEngine,
      (itemId) => {},
      (objectId) => {
        selectionEngine.clear();
        selectionEngine.select(objectId);
        requestRedraw();
      }
    );
  } catch (e) {
    console.error('Failed to init ProjectDashboardPanel', e);
  }

  workbench.onTabChange = (tab) => {
    isDeviceWorkspaceActive = tab === 'device';
    if (isDeviceWorkspaceActive) {
      deviceWorkspace.show();
      workbench.setStatus('TINC Workbench | Device Build', 'Syncing physical components...');
      
      const allLogical = objectEngine.getProject().pages.flatMap((p: any) => p.layers.flatMap((l: any) => l.objects));
      const devMgr = deviceWorkspace.getManager();
      const existingPhysical = devMgr.getWorkspace().layers[0].objects;
      const layerId = devMgr.getWorkspace().layers[0].id;
      
      for (const comp of allLogical) {
        const pId = `dev-${comp.id}`;
        if (!existingPhysical.find(p => p.id === pId)) {
          commandEngine.dispatch({
            id: `cmd-sync-${comp.id}`,
            name: 'CreateDeviceObject',
            payload: {
              layerId,
              object: {
                id: pId,
                kind: 'module',
                layerId,
                transform: { x: (comp as any).position.x * 10000000, y: (comp as any).position.y * 10000000, rotation: 0, mirrorX: false, mirrorY: false },
                visible: true,
                locked: false,
                selected: false,
                moduleType: comp.name,
                width: 68600000, // Default 68.6mm
                height: 53400000 // Default 53.4mm
              }
            }
          });
        }
      }
      
      workbench.setStatus('TINC Workbench | Device Build', 'Physical Workspace Synchronized');
    } else {
      deviceWorkspace.hide();
      workbench.setStatus('TINC Workbench | Schematic', 'ERC: OK | Inventory: Sync');
    }
    requestRedraw();
  };

  // Setup Sidebar Components
  const leftSidebarContainer = workbench.getLeftSidebar();
  
  const projectExplorer = new ProjectExplorer(
    leftSidebarContainer,
    objectEngine,
    selectionEngine,
    canvasEngine,
    geometryEngine
  );
  
  const hierarchyPanel = new PlaceholderPanel(
    'Hierarchy',
    'View and manage your design hierarchy and subcircuits.',
    'In Development',
    'v1.1.0',
    '📂'
  );
  hierarchyPanel.element.style.display = 'none';
  leftSidebarContainer.appendChild(hierarchyPanel.element);

  const filesPanel = new PlaceholderPanel(
    'Files',
    'Manage project files and assets.',
    'In Development',
    'v1.2.0',
    '📄'
  );
  filesPanel.element.style.display = 'none';
  leftSidebarContainer.appendChild(filesPanel.element);

  const devicesPanel = new PlaceholderPanel(
    'Devices',
    'Explore mechanical constraints and device enclosures.',
    'In Development',
    'v2.0.0',
    '📦'
  );
  devicesPanel.element.style.display = 'none';
  leftSidebarContainer.appendChild(devicesPanel.element);

  const docsPanelPlaceholder = new PlaceholderPanel(
    'Documentation',
    'Read documentation and technical specifications.',
    'In Development',
    'v1.1.0',
    '📚'
  );
  docsPanelPlaceholder.element.style.display = 'none';
  leftSidebarContainer.appendChild(docsPanelPlaceholder.element);

  const libraryPanelPlaceholder = new PlaceholderPanel(
    'Library',
    'Manage component libraries and footprints.',
    'In Development',
    'v1.2.0',
    '🧩'
  );
  libraryPanelPlaceholder.element.style.display = 'none';
  leftSidebarContainer.appendChild(libraryPanelPlaceholder.element);

  // Setup Activity Bar
  const activityBar = workbench.activityBar;
  const activityItems = [
    { id: 'project', icon: '📁', title: 'Project Explorer', panel: projectExplorer.panel.element },
    { id: 'hierarchy', icon: '📂', title: 'Hierarchy', panel: hierarchyPanel.element },
    { id: 'files', icon: '📄', title: 'Files', panel: filesPanel.element },
    { id: 'devices', icon: '📦', title: 'Devices', panel: devicesPanel.element },
    { id: 'docs', icon: '📚', title: 'Documentation', panel: docsPanelPlaceholder.element },
    { id: 'library', icon: '🧩', title: 'Library', panel: libraryPanelPlaceholder.element },
  ];

  let activeActivity = 'project';
  const activityButtons: HTMLElement[] = [];

  for (const item of activityItems) {
    const btn = document.createElement('div');
    btn.innerText = item.icon;
    btn.title = item.title;
    btn.style.fontSize = '20px';
    btn.style.cursor = 'pointer';
    btn.style.opacity = item.id === activeActivity ? '1' : '0.5';
    btn.style.padding = '8px';
    btn.style.borderRadius = '4px';
    btn.style.transition = 'opacity 0.2s ease, background 0.2s ease';
    
    if (item.id === activeActivity) {
      btn.style.borderLeft = '2px solid var(--accent)';
      btn.style.background = 'var(--bg-surface)';
    } else {
      btn.style.borderLeft = '2px solid transparent';
      btn.style.background = 'transparent';
    }

    btn.addEventListener('mouseenter', () => {
      if (item.id !== activeActivity) btn.style.background = 'rgba(255,255,255,0.05)';
    });
    btn.addEventListener('mouseleave', () => {
      if (item.id !== activeActivity) btn.style.background = 'transparent';
    });

    btn.addEventListener('click', () => {
      activeActivity = item.id;
      
      // Update buttons
      for (let i = 0; i < activityItems.length; i++) {
        const otherBtn = activityButtons[i];
        if (activityItems[i].id === activeActivity) {
          otherBtn.style.opacity = '1';
          otherBtn.style.borderLeft = '2px solid var(--accent)';
          otherBtn.style.background = 'var(--bg-surface)';
        } else {
          otherBtn.style.opacity = '0.5';
          otherBtn.style.borderLeft = '2px solid transparent';
          otherBtn.style.background = 'transparent';
        }
      }

      // Update panels
      for (const panelItem of activityItems) {
        if (panelItem.panel) {
          panelItem.panel.style.display = panelItem.id === activeActivity ? 'flex' : 'none';
        }
      }
      
      // Make sure left sidebar is open
      leftSidebarContainer.style.display = 'flex';
    });

    activityButtons.push(btn);
    activityBar.appendChild(btn);
  }


  const componentBrowser = new ComponentBrowser(
    document.body,
    commandEngine,
    canvasEngine,
    objectEngine,
    eventBus
  );
  
  const propertyInspector = new PropertyInspector(workbench.getRightSidebar());

  // Hook Selection Engine to Inspector (handled in redraw loop)

  canvasEngine.setViewportDimensions(canvas.width, canvas.height);

  // Bootstrap Page and Layer
  commandEngine.dispatch({
    id: 'init-page',
    name: 'CreatePage',
    payload: {
      page: {
        id: 'page-1',
        name: 'Default Workspace',
        layers: [],
        viewport: { zoom: 1.0, panX: 0, panY: 0 }
      }
    }
  });

  commandEngine.dispatch({
    id: 'init-layer',
    name: 'CreateLayer',
    payload: {
      pageId: 'page-1',
      layer: {
        id: 'layer-1',
        name: 'Default Layer',
        visible: true,
        locked: false,
        objects: []
      }
    }
  });

  // Track placed components to apply offset positioning
  let componentsCount = 0;

  // Render loop
  const ctx = canvas.getContext('2d')!;
  
  let canvasRedrawPending = false;
  let domRedrawPending = false;

  function requestCanvasRedraw() {
    if (canvasRedrawPending) return;
    canvasRedrawPending = true;
    requestAnimationFrame(() => {
      canvasRedrawPending = false;
      renderingEngine.render(ctx, objectEngine, canvasEngine, selectionEngine, toolSystem, 'page-1');
    });
  }

  function requestRedraw() {
    requestCanvasRedraw();
    if (domRedrawPending) return;
    domRedrawPending = true;
    requestAnimationFrame(() => {
      domRedrawPending = false;
      projectExplorer.refresh();
      const selIds = selectionEngine.getSelectedIds();
      propertyInspector.refresh(selIds, objectEngine);

      const summary = intelligenceEngine.analyze();
      let healthText = 'Project Healthy';
      if (summary.healthIssues.some(i => i.severity === 'error')) healthText = 'Critical Errors';
      else if (summary.healthIssues.some(i => i.severity === 'warning')) healthText = 'Warnings Present';

      const invText = summary.inventoryRequirements.some(r => r.status === 'missing') ? 'Inventory Missing Parts' : 'Inventory Complete';
      
      workbench.setStatus(`TINC Validation Project | ${selIds.length} items selected`, `${healthText} | ${invText}`);
    });
  }

  // Subscribe to Event Bus to trigger redraws automatically (Observer pattern)
  eventBus.subscribe('command:executed', () => requestRedraw());
  eventBus.subscribe('history:undone', () => requestRedraw());
  eventBus.subscribe('history:redone', () => requestRedraw());

  // Listen to Window Resize
  window.addEventListener('resize', () => {
    const rect = workbench.canvasContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (rect.width || window.innerWidth) * dpr;
    canvas.height = (rect.height || window.innerHeight) * dpr;
    canvas.style.width = `${rect.width || window.innerWidth}px`;
    canvas.style.height = `${rect.height || window.innerHeight}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    // Canvas engine expects logical dimensions for correct world-to-screen transforms
    canvasEngine.setViewportDimensions(rect.width || window.innerWidth, rect.height || window.innerHeight);
    requestRedraw();
  });

  // Setup Keyboard shortcut "/" to summon panel and Desktop Conventions
  window.addEventListener('keydown', (e) => {
    // Desktop editing conventions
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          try { historyEngine.redo(); } catch { /* ignore */ }
        } else {
          try { historyEngine.undo(); } catch { /* ignore */ }
        }
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'y') {
        try { historyEngine.redo(); } catch { /* ignore */ }
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'a') {
        const page = objectEngine.getProject().pages[0];
        if (page) {
          const allIds = page.layers.flatMap(l => l.objects.map(o => o.id));
          selectionEngine.addSelect(allIds);
          requestRedraw();
        }
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'd') {
        const selectedIds = selectionEngine.getSelectedIds();
        if (selectedIds.length > 0) {
          for (const id of selectedIds) {
            const comp = objectEngine.getObject(id) as SemanticObject;
            if (comp) {
              const newId = `comp-copy-${generateUUID().substring(0, 8)}`;
              commandEngine.dispatch({
                id: `cmd-dup-${generateUUID().substring(0, 8)}`,
                name: 'CreateComponent',
                payload: {
                  component: {
                    ...JSON.parse(JSON.stringify(comp)),
                    id: newId,
                    properties: { ...comp.properties, x: (comp.properties.x || 0) + 20, y: (comp.properties.y || 0) + 20 }
                  }
                }
              });
              selectionEngine.clear();
              selectionEngine.select(newId);
            }
          }
          requestRedraw();
        }
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'o') {
        // Change Docs toggle to Ctrl+O (Ctrl+D was docs)
        docPanel?.toggle();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'p') {
        searchPanel?.toggle();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 't') {
        templatesPanel?.toggle();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'i') {
        kicadImportPanel?.toggle();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'h') {
        dashboardPanel?.toggle();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'c') {
        const ids = selectionEngine.getSelectedIds();
        if (ids.length > 0) {
          const objs = ids.map(id => objectEngine.getObject(id)).filter(o => o);
          navigator.clipboard.writeText(JSON.stringify(objs));
        }
      } else if (e.key.toLowerCase() === 'x') {
        const ids = selectionEngine.getSelectedIds();
        if (ids.length > 0) {
          const objs = ids.map(id => objectEngine.getObject(id)).filter(o => o);
          navigator.clipboard.writeText(JSON.stringify(objs));
          for (const id of ids) {
            try { commandEngine.dispatch({ id: `cmd-cut-${generateUUID().substring(0, 8)}`, name: 'DeleteComponent', payload: { componentId: id } }); } catch {
              try { commandEngine.dispatch({ id: `cmd-cut-w-${generateUUID().substring(0, 8)}`, name: 'DeleteWire', payload: { wireId: id } }); } catch { /* ignore */ }
            }
          }
          selectionEngine.clear();
          requestRedraw();
        }
      } else if (e.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then(text => {
          try {
            const objs = JSON.parse(text);
            if (Array.isArray(objs)) {
              selectionEngine.clear();
              for (const obj of objs) {
                if (obj.kind === 'module') continue;
                if (obj.segments) continue;
                const newId = `comp-pasted-${generateUUID().substring(0, 8)}`;
                commandEngine.dispatch({
                  id: `cmd-paste-${generateUUID().substring(0, 8)}`,
                  name: 'CreateComponent',
                  payload: {
                    layerId: 'layer-1',
                    component: {
                      ...obj,
                      id: newId,
                      properties: { ...obj.properties, x: (obj.properties?.x || 0) + 20, y: (obj.properties?.y || 0) + 20 }
                    }
                  }
                });
                selectionEngine.select(newId);
              }
              requestRedraw();
            }
          } catch { /* ignore */ }
        });
      }
      return;
    } else if (e.key.startsWith('Arrow')) {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
        return; // Let the input handle it
      }
      const ids = selectionEngine.getSelectedIds();
      if (ids.length > 0) {
        const dx = e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0;
        const dy = e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0;
        if (dx !== 0 || dy !== 0) {
          commandEngine.executeTransaction(ids.map(id => {
            const comp = objectEngine.getObject(id) as SemanticObject;
            return {
              id: `cmd-nudge-${generateUUID().substring(0,8)}`,
              name: 'MoveComponent',
              payload: { componentId: id, x: (comp.properties.x || 0) + dx, y: (comp.properties.y || 0) + dy }
            };
          }).filter(c => c !== null));
          requestRedraw();
        }
      }
      e.preventDefault();
      return;
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
        return; // Let the input handle it
      }
      
      const ids = selectionEngine.getSelectedIds();
      if (ids.length > 0) {
        // Just directly call CommandEngine for deletion
        for (const id of ids) {
          try {
            commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteComponent', payload: { componentId: id } });
          } catch {
            try {
              commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteWire', payload: { wireId: id } });
            } catch { /* ignore */ }
          }
        }
        selectionEngine.clear();
        requestRedraw();
      }
      e.preventDefault();
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      summonOverlay.style.display = 'block';
      summonInput.value = '';
      summonInput.focus();
    } else if (e.key.toLowerCase() === 'r') {
      const selectedIds = selectionEngine.getSelectedIds();
      if (selectedIds.length > 0) {
        for (const id of selectedIds) {
          const comp = objectEngine.getObject(id) as SemanticObject;
          if (comp) {
            commandEngine.dispatch({
              id: `cmd-rot-${generateUUID().substring(0, 8)}`,
              name: 'RotateComponent',
              payload: {
                componentId: id,
                angle: ((comp.properties.rotation || 0) + 90) % 360
              }
            });
          }
        }
        requestRedraw();
      }
    } else if (e.key === 'Escape') {
      if (summonOverlay.style.display === 'block') {
        summonOverlay.style.display = 'none';
        canvas.focus();
      } else if (toolSystem.isWiring()) {
        toolSystem.cancelWiring();
        requestRedraw();
      } else {
        selectionEngine.clear();
        requestRedraw();
      }
    }
  });

  summonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const match = queryCatalog(summonInput.value);
      if (match) {
        const center = canvasEngine.screenToWorld({ x: canvas.width / 2, y: canvas.height / 2 });
        // Apply deterministic 30px offset per component placed
        const posX = center.x + componentsCount * 30 - 50; // shift slightly to center component
        const posY = center.y + componentsCount * 30 - 40;

        const newId = `comp-${componentsCount + 1}-${generateUUID().substring(0, 8)}`;
        const component: SemanticObject = {
          id: newId,
          type: match.type,
          name: match.name,
          ports: match.ports,
          pins: match.pins,
          properties: { x: posX, y: posY }
        };

        const result = commandEngine.dispatch({
          id: `cmd-summon-${componentsCount + 1}`,
          name: 'CreateComponent',
          payload: {
            layerId: 'layer-1',
            component
          }
        });

        if (result.success) {
          componentsCount++;
        }
      }
      summonOverlay.style.display = 'none';
      canvas.focus();
    }
  });

  // Canvas interaction (viewport pan and zoom)
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click selects/drags
      const worldPt = inputRouter.normalizeEvent(e, canvas);
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      toolSystem.handlePointerDown(worldPt, objectEngine, selectionEngine, geometryEngine, additive);
      requestRedraw();
    } else if (e.button === 2) {
      if (toolSystem.isWiring()) {
        toolSystem.cancelWiring();
        requestRedraw();
      } else {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
      e.preventDefault();
    } else if (e.button === 1) {
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const existing = document.getElementById('tinc-context-menu');
    if (existing) existing.remove();

    const worldPt = inputRouter.normalizeEvent(e, canvas);
    const allObjects = objectEngine.getProject().pages.flatMap((p: any) => p.layers.flatMap((l: any) => l.objects));
    const hitObj = allObjects.find((o: any) => Math.abs(o.position.x - worldPt.x) < 20 && Math.abs(o.position.y - worldPt.y) < 20);
    
    if (!hitObj) {
      selectionEngine.clear();
      requestRedraw();
      return;
    }
    
    if (!selectionEngine.isSelected(hitObj.id)) {
      selectionEngine.select(hitObj.id);
      requestRedraw();
    }

    const menu = document.createElement('div');
    menu.id = 'tinc-context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = 'var(--bg-surface)';
    menu.style.border = '1px solid #44475a';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '1000';
    menu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    menu.style.color = 'var(--text-primary)';
    menu.style.fontSize = '13px';
    menu.style.minWidth = '150px';

    const actions = [
      { label: 'Rotate (R)', action: () => {
        commandEngine.dispatch({ id: `cmd-rot-${generateUUID().substring(0, 8)}`, name: 'RotateComponent', payload: { componentId: hitObj.id, angle: 90 } });
      }},
      { label: 'Properties', action: () => {
        workbench.getRightSidebar().style.display = 'flex';
      }},
      { label: 'Delete (Del)', action: () => {
        try {
          commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteComponent', payload: { componentId: hitObj.id } });
        } catch {
          try {
            commandEngine.dispatch({ id: `cmd-${generateUUID().substring(0,8)}`, name: 'DeleteWire', payload: { wireId: hitObj.id } });
          } catch { /* ignore */ }
        }
        selectionEngine.clear();
      }}
    ];

    for (const act of actions) {
      const btn = document.createElement('div');
      btn.innerText = act.label;
      btn.style.padding = '6px 16px';
      btn.style.cursor = 'pointer';
      btn.addEventListener('mouseover', () => btn.style.background = 'var(--border)');
      btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
      btn.addEventListener('click', () => {
        act.action();
        menu.remove();
        requestRedraw();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);

    // Adjust position to prevent overflow
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 5}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 5}px`;
    }

    // Click anywhere else to close
    const closeHandler = () => {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  });

  canvas.addEventListener('mousemove', (e) => {
    const worldPt = inputRouter.normalizeEvent(e, canvas);
    toolSystem.handlePointerMove(worldPt, objectEngine, geometryEngine);

    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      // Adjust pan by viewport zoom factor
      const zoom = canvasEngine.getViewportState().zoom;
      canvasEngine.pan(-dx / zoom, -dy / zoom);
    }
    requestCanvasRedraw();
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine, additive);
      requestRedraw();
    }
    isPanning = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const oldZoom = canvasEngine.getViewportState().zoom;
    const newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    
    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = canvasEngine.screenToWorld(screenPt);
    
    canvasEngine.setZoom(newZoom);
    
    const cx = canvasEngine.getWidth() / 2;
    const cy = canvasEngine.getHeight() / 2;
    
    const newPanX = worldPt.x - (screenPt.x - cx) / newZoom;
    const newPanY = worldPt.y - (screenPt.y - cy) / newZoom;
    
    const state = canvasEngine.getViewportState();
    canvasEngine.pan(newPanX - state.panX, newPanY - state.panY);
    
    requestCanvasRedraw();
  }, { passive: false });

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer!.getData('application/tinc-component');
    if (type) {
      const match = CATALOG.find(c => c.type === type);
      if (match) {
        const pt = inputRouter.normalizeEvent(e as any, canvas);
        commandEngine.dispatch({
          id: `cmd-place-${generateUUID().substring(0,8)}`,
          name: 'CreateComponent',
          payload: {
            component: {
              id: `comp-${generateUUID().substring(0, 8)}`,
              type: match.type,
              name: match.name,
              properties: { x: pt.x - 50, y: pt.y - 40, rotation: 0 },
              ports: JSON.parse(JSON.stringify(match.ports)),
              pins: JSON.parse(JSON.stringify(match.pins))
            }
          }
        });
      }
    }
  });

  // Initial draw
  requestRedraw();

  return {
    objectEngine,
    canvasEngine,
    commandEngine,
    historyEngine,
    eventBus
  };
}
