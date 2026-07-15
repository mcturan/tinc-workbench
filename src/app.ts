import { EventBus } from './event-bus';
import { ObjectEngine } from './object-engine';
import { HistoryEngine, CommandReverserReplayer } from './history-engine';
import { CommandEngine } from './command-engine';
import { GeometryEngine } from './geometry-engine';
import { CanvasEngine } from './canvas-engine';
import { RenderingEngine } from './rendering-engine';
import { SemanticObject } from './types';
import { generateUUID } from './utils';

// 1. Static Component Catalog
export const CATALOG: { type: string; name: string; aliases: string[]; ports: any[]; pins: any[] }[] = [
  {
    type: 'ESP32',
    name: 'ESP32 Development Board',
    aliases: ['esp32', 'esp'],
    ports: [],
    pins: [
      { id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }
    ]
  },
  {
    type: 'Relay Module',
    name: 'Single Channel Relay Module',
    aliases: ['relay', 'relay module'],
    ports: [
      { id: 'COM', name: 'COM', direction: 'passive', signalCategory: 'electrical' },
      { id: 'NO', name: 'NO', direction: 'passive', signalCategory: 'electrical' }
    ],
    pins: [
      { id: 'IN1', name: 'IN1', direction: 'input', signalCategory: 'digital' }
    ]
  },
  {
    type: '12V Power Supply',
    name: '12V DC Power Supply',
    aliases: ['power', 'power supply', 'psu', '12v'],
    ports: [
      { id: 'V+', name: 'V+', direction: 'passive', signalCategory: 'electrical' },
      { id: 'V-', name: 'V-', direction: 'passive', signalCategory: 'electrical' }
    ],
    pins: []
  },
  {
    type: 'Lamp',
    name: '12V Filament Lamp',
    aliases: ['lamp', 'light'],
    ports: [
      { id: '+', name: '+', direction: 'passive', signalCategory: 'electrical' },
      { id: '-', name: '-', direction: 'passive', signalCategory: 'electrical' }
    ],
    pins: []
  }
];

// Helper to match catalog query deterministically
export function queryCatalog(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return CATALOG.find(item =>
    item.type.toLowerCase() === q ||
    item.aliases.some(alias => alias === q)
  ) || null;
}

// 2. Application Bootstrap
export function bootstrapApp(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container #${containerId} not found`);
  }

  // Clear container
  container.innerHTML = '';

  // Setup DOM Elements
  const appShell = document.createElement('div');
  appShell.id = 'tinc-app-shell';
  appShell.style.position = 'relative';
  appShell.style.width = '100%';
  appShell.style.height = '100vh';
  appShell.style.overflow = 'hidden';
  appShell.style.fontFamily = '"Inter", sans-serif';

  const canvas = document.createElement('canvas');
  canvas.id = 'tinc-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  // Summon Overlay (UX-004)
  const summonOverlay = document.createElement('div');
  summonOverlay.id = 'tinc-summon-overlay';
  summonOverlay.style.position = 'absolute';
  summonOverlay.style.top = '25%';
  summonOverlay.style.left = '50%';
  summonOverlay.style.transform = 'translate(-50%, -50%)';
  summonOverlay.style.background = '#282a36';
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
  summonInput.style.background = '#1e1f29';
  summonInput.style.border = '1px solid #6272a4';
  summonInput.style.borderRadius = '4px';
  summonInput.style.color = '#f8f8f2';
  summonInput.style.padding = '8px 12px';
  summonInput.style.fontSize = '14px';
  summonInput.style.width = '280px';
  summonInput.style.outline = 'none';

  summonOverlay.appendChild(summonInput);
  appShell.appendChild(canvas);
  appShell.appendChild(summonOverlay);
  container.appendChild(appShell);

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
  function requestRedraw() {
    renderingEngine.render(ctx, objectEngine, canvasEngine, 'page-1');
  }

  // Subscribe to Event Bus to trigger redraws automatically (Observer pattern)
  eventBus.subscribe('command:executed', () => requestRedraw());
  eventBus.subscribe('history:undone', () => requestRedraw());
  eventBus.subscribe('history:redone', () => requestRedraw());

  // Listen to Window Resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasEngine.setViewportDimensions(canvas.width, canvas.height);
    requestRedraw();
  });

  // Setup Keyboard shortcut "/" to summon panel
  window.addEventListener('keydown', (e) => {
    if (e.key === '/') {
      e.preventDefault();
      summonOverlay.style.display = 'block';
      summonInput.value = '';
      summonInput.focus();
    } else if (e.key === 'Escape') {
      summonOverlay.style.display = 'none';
      canvas.focus();
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
    if (e.button === 1 || e.button === 2) { // Middle or Right click to pan
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      // Adjust pan by viewport zoom factor
      const zoom = canvasEngine.getViewportState().zoom;
      canvasEngine.pan(-dx / zoom, -dy / zoom);
      requestRedraw();
    }
  });

  canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('wheel', (e) => {
    const zoomFactor = 1.1;
    const oldZoom = canvasEngine.getViewportState().zoom;
    const newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    canvasEngine.setZoom(newZoom);
    requestRedraw();
  }, { passive: true });

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
