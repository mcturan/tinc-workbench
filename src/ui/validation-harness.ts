import { EventBus } from '../event-bus';
import { ObjectEngine } from '../object-engine';
import { HistoryEngine } from '../history-engine';
import { CommandEngine } from '../command-engine';
import { GeometryEngine } from '../geometry-engine';
import { CanvasEngine } from '../canvas-engine';
import { RenderingEngine } from '../rendering-engine';
import { InputRouter } from '../input-router';
import { SelectionEngine } from '../selection-engine';
import { ToolSystem } from '../tool-system';
import { SemanticObject } from '../types';
import { generateUUID } from '../utils';
import { CATALOG } from '../app';
import { globalSearch } from '../component-library';

function getEl(id: string): any {
  if (typeof document !== 'undefined') {
    return document.getElementById(id) || {
      innerText: '',
      style: {},
      appendChild: () => {},
      className: '',
    };
  }
  return {
    innerText: '',
    style: {},
    appendChild: () => {},
    className: '',
  };
}

export class ValidationHarness {
  // Timing State
  private startTime: number | null = null;
  private timerInterval: any = null;
  private isFinished = false;

  private firstPlacementTime: number | null = null;
  private fourthPlacementTime: number | null = null;
  private firstWireTime: number | null = null;
  private fourthWireTime: number | null = null;
  private firstMoveTime: number | null = null;

  private placementCount = 0;
  private connectionCount = 0;

  // DOM Elements
  private timerValEl = getEl('timer-value');
  private logContainer = getEl('log-container');
  private signOffEl = getEl('sign-off');

  private statusPlacement1 = getEl('status-placement-1');
  private valPlacement1 = getEl('val-placement-1');

  private statusPlacement4 = getEl('status-placement-4');
  private valPlacement4 = getEl('val-placement-4');

  private statusWire1 = getEl('status-wire-1');
  private valWire1 = getEl('val-wire-1');

  private statusWire4 = getEl('status-wire-4');
  private valWire4 = getEl('val-wire-4');

  private statusMove1 = getEl('status-move-1');
  private valMove1 = getEl('val-move-1');

  constructor(private eventBus: EventBus) {
    this.setupEventBusSubscribers();
  }

  private log(message: string): void {
    const timeStr = this.startTime
      ? `[${((Date.now() - this.startTime) / 1000).toFixed(2)}s] `
      : '[00.00s] ';
    if (typeof document !== 'undefined') {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-time">${timeStr}</span> ${message}`;
      if (this.logContainer && typeof this.logContainer.appendChild === 'function') {
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
      }
    }
  }

  private startTimer(): void {
    if (this.startTime !== null) return;
    this.startTime = Date.now();
    this.log('Timer started on first action.');
    this.timerInterval = setInterval(() => {
      if (this.startTime && !this.isFinished) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.timerValEl.innerText = elapsed.toFixed(2);
      }
    }, 30);
  }

  reset(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.startTime = null;
    this.isFinished = false;
    this.firstPlacementTime = null;
    this.fourthPlacementTime = null;
    this.firstWireTime = null;
    this.fourthWireTime = null;
    this.firstMoveTime = null;
    this.placementCount = 0;
    this.connectionCount = 0;

    this.timerValEl.innerText = '00.00';
    this.logContainer.innerHTML = '<div class="log-entry">Harness reset. Waiting for first action...</div>';
    this.signOffEl.innerText = 'Verdict: UNVALIDATED';
    this.signOffEl.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
    this.signOffEl.style.color = '#f59e0b';
    this.signOffEl.style.borderColor = '#f59e0b';

    // Reset status elements
    const cards = [
      { status: this.statusPlacement1, val: this.valPlacement1 },
      { status: this.statusPlacement4, val: this.valPlacement4 },
      { status: this.statusWire1, val: this.valWire1 },
      { status: this.statusWire4, val: this.valWire4 },
      { status: this.statusMove1, val: this.valMove1 },
    ];
    for (const card of cards) {
      card.status.className = 'metric-status status-pending';
      card.status.innerText = 'Pending';
      card.val.innerText = '-';
    }
  }

  triggerFirstAction(): void {
    if (this.startTime === null) {
      this.startTimer();
    }
  }

  private setupEventBusSubscribers(): void {
    this.eventBus.subscribe('command:executed', (ev) => {
      this.triggerFirstAction();
      const delta = ev.payload.delta;
      if (!delta) return;

      // Scan through applied forward actions
      for (const action of delta.forward) {
        if (action.type === 'CREATE_COMPONENT') {
          this.placementCount++;
          this.log(`Component placed: ${action.component.name} (${action.component.type})`);
          this.checkPlacements();
        } else if (action.type === 'CREATE_CONNECTION') {
          this.connectionCount++;
          this.log(`Logical Connection committed: ${action.connection.source.targetId} -> ${action.connection.target.targetId}`);
          this.checkWires();
        } else if (action.type === 'MOVE_COMPONENT') {
          this.log(`Component moved: ${action.componentId} to (${action.x}, ${action.y})`);
          this.checkMove();
        }
      }
    }, { sync: true });
  }

  private checkPlacements(): void {
    if (this.startTime === null) return;
    const elapsed = (Date.now() - this.startTime) / 1000;

    if (this.placementCount === 1 && this.firstPlacementTime === null) {
      this.firstPlacementTime = elapsed;
      this.valPlacement1.innerText = `${elapsed.toFixed(2)}s`;
      if (elapsed <= 5.0) {
        this.statusPlacement1.className = 'metric-status status-pass';
        this.statusPlacement1.innerText = 'Pass';
      } else {
        this.statusPlacement1.className = 'metric-status status-fail';
        this.statusPlacement1.innerText = 'Fail';
      }
    }

    if (this.placementCount === 4 && this.fourthPlacementTime === null) {
      this.fourthPlacementTime = elapsed;
      this.valPlacement4.innerText = `${elapsed.toFixed(2)}s`;
      if (elapsed <= 15.0) {
        this.statusPlacement4.className = 'metric-status status-pass';
        this.statusPlacement4.innerText = 'Pass';
      } else {
        this.statusPlacement4.className = 'metric-status status-fail';
        this.statusPlacement4.innerText = 'Fail';
      }
      this.evaluateFinalVerdict();
    }
  }

  private checkWires(): void {
    if (this.startTime === null) return;
    const elapsed = (Date.now() - this.startTime) / 1000;

    if (this.connectionCount === 1 && this.firstWireTime === null) {
      this.firstWireTime = elapsed;
      this.valWire1.innerText = `${elapsed.toFixed(2)}s`;
      if (elapsed <= 25.0) {
        this.statusWire1.className = 'metric-status status-pass';
        this.statusWire1.innerText = 'Pass';
      } else {
        this.statusWire1.className = 'metric-status status-fail';
        this.statusWire1.innerText = 'Fail';
      }
    }

    if (this.connectionCount === 4 && this.fourthWireTime === null) {
      this.fourthWireTime = elapsed;
      this.valWire4.innerText = `${elapsed.toFixed(2)}s`;
      if (elapsed <= 50.0) {
        this.statusWire4.className = 'metric-status status-pass';
        this.statusWire4.innerText = 'Pass';
      } else {
        this.statusWire4.className = 'metric-status status-fail';
        this.statusWire4.innerText = 'Fail';
      }
      this.evaluateFinalVerdict();
    }
  }

  private checkMove(): void {
    if (this.startTime === null) return;
    const elapsed = (Date.now() - this.startTime) / 1000;

    if (this.firstMoveTime === null) {
      this.firstMoveTime = elapsed;
      this.valMove1.innerText = `${elapsed.toFixed(2)}s`;
      if (elapsed <= 55.0) {
        this.statusMove1.className = 'metric-status status-pass';
        this.statusMove1.innerText = 'Pass';
      } else {
        this.statusMove1.className = 'metric-status status-fail';
        this.statusMove1.innerText = 'Fail';
      }
      this.evaluateFinalVerdict();
    }
  }

  private evaluateFinalVerdict(): void {
    // If all tasks are completed, evaluate final sign-off
    const allDone =
      this.fourthPlacementTime !== null &&
      this.fourthWireTime !== null &&
      this.firstMoveTime !== null;

    if (allDone) {
      this.isFinished = true;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      const allPassed =
        this.firstPlacementTime! <= 5.0 &&
        this.fourthPlacementTime! <= 15.0 &&
        this.firstWireTime! <= 25.0 &&
        this.fourthWireTime! <= 50.0 &&
        this.firstMoveTime! <= 55.0;

      if (allPassed) {
        this.signOffEl.innerText = 'Verdict: SUCCESS (UNVALIDATED)';
        this.signOffEl.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        this.signOffEl.style.color = '#10b981';
        this.signOffEl.style.borderColor = '#10b981';
        this.log('VALIDATION COMPLETED: All milestones met within limits.');
      } else {
        this.signOffEl.innerText = 'Verdict: TIMEOUT / FAILED';
        this.signOffEl.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        this.signOffEl.style.color = '#ef4444';
        this.signOffEl.style.borderColor = '#ef4444';
        this.log('VALIDATION FAILED: One or more targets exceeded limit.');
      }
    }
  }
}

// Instantiate validation harness application shell
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('twb-canvas') as HTMLCanvasElement;
  const summonOverlay = document.getElementById('summon-overlay') as HTMLDivElement;
  const summonInput = document.getElementById('summon-input') as HTMLInputElement;
  const summonSuggestions = document.getElementById('summon-suggestions') as HTMLDivElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

  // Initialize Core Engines
  const eventBus = new EventBus();
  const objectEngine = new ObjectEngine('project-v1', 'TINC Validation Project');
  const reverserReplayer = {
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

  // Instantiate Harness Tracker
  const harness = new ValidationHarness(eventBus);

  // Setup Canvas Dimensions
  function resizeCanvas() {
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;
    canvasEngine.setViewportDimensions(canvas.width, canvas.height);
    requestRedraw();
  }

  const ctx = canvas.getContext('2d')!;
  function requestRedraw() {
    renderingEngine.render(ctx, objectEngine, canvasEngine, selectionEngine, toolSystem, 'page-1');
  }

  // Event bus redraw triggers
  eventBus.subscribe('command:executed', () => requestRedraw(), { sync: true });
  eventBus.subscribe('history:undone', () => requestRedraw(), { sync: true });
  eventBus.subscribe('history:redone', () => requestRedraw(), { sync: true });

  // Add Default Page and Default Layer via transactions
  const pageId = 'page-1';
  const layerId = 'layer-1';

  commandEngine.executeTransaction([
    {
      id: `cmd-init-page-${generateUUID().substring(0, 8)}`,
      name: 'CreatePage',
      payload: {
        page: {
          id: pageId,
          name: 'Main Page',
          layers: [],
          viewport: { zoom: 1.0, panX: 0, panY: 0 },
        },
      },
    },
    {
      id: `cmd-init-layer-${generateUUID().substring(0, 8)}`,
      name: 'CreateLayer',
      payload: {
        pageId,
        layer: {
          id: layerId,
          name: 'Base Layer',
          visible: true,
          locked: false,
          objects: [],
        },
      },
    },
  ]);

  // Window Resize
  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 100);

  // Reset button trigger
  btnReset.addEventListener('click', () => {
    // Recreate project state
    objectEngine.clear();
    historyEngine.clear();
    selectionEngine.clear();

    commandEngine.executeTransaction([
      {
        id: `cmd-init-page-${generateUUID().substring(0, 8)}`,
        name: 'CreatePage',
        payload: {
          page: {
            id: pageId,
            name: 'Main Page',
            layers: [],
            viewport: { zoom: 1.0, panX: 0, panY: 0 },
          },
        },
      },
      {
        id: `cmd-init-layer-${generateUUID().substring(0, 8)}`,
        name: 'CreateLayer',
        payload: {
          pageId,
          layer: {
            id: layerId,
            name: 'Base Layer',
            visible: true,
            locked: false,
            objects: [],
          },
        },
      },
    ]);

    harness.reset();
    requestRedraw();
  });

  // Summoning Panel Logic (UX-004)
  let suggestionList: any[] = [];
  let selectedIndex = -1;

  function handleSummonInput() {
    const val = summonInput.value.toLowerCase().trim();
    if (!val) {
      summonSuggestions.innerHTML = '';
      suggestionList = [];
      selectedIndex = -1;
      return;
    }

    const searchResults = globalSearch.search(val);
    suggestionList = searchResults.map(match => {
      return CATALOG.find(item => item.type === match.id);
    }).filter((item): item is NonNullable<typeof item> => !!item);

    summonSuggestions.innerHTML = '';
    selectedIndex = suggestionList.length > 0 ? 0 : -1;

    suggestionList.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = `summon-item${idx === selectedIndex ? ' selected' : ''}`;
      div.innerText = `${item.name} (${item.type})`;
      div.addEventListener('click', () => {
        summonComponent(item);
      });
      summonSuggestions.appendChild(div);
    });
  }

  function summonComponent(catalogItem: any) {
    // Start timing on summoning action
    harness.triggerFirstAction();

    const worldCenter = canvasEngine.screenToWorld({
      x: canvasEngine.getWidth() / 2,
      y: canvasEngine.getHeight() / 2,
    });

    const compId = `comp-${generateUUID().substring(0, 8)}`;
    const component: SemanticObject = {
      id: compId,
      type: catalogItem.type,
      name: `${catalogItem.name}_${compId.substring(5, 9)}`,
      ports: catalogItem.ports.map((p: any) => ({ ...p, id: `port-${generateUUID().substring(0, 8)}` })),
      pins: catalogItem.pins.map((p: any) => ({ ...p, id: `pin-${generateUUID().substring(0, 8)}` })),
      properties: {
        x: Math.round(worldCenter.x / 20) * 20,
        y: Math.round(worldCenter.y / 20) * 20,
      },
    };

    commandEngine.dispatch({
      id: `cmd-summon-${generateUUID().substring(0, 8)}`,
      name: 'CreateComponent',
      payload: {
        layerId,
        component,
      },
    });

    summonOverlay.style.display = 'none';
    canvas.focus();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== summonInput) {
      e.preventDefault();
      harness.triggerFirstAction();
      summonOverlay.style.display = 'block';
      summonInput.value = '';
      summonSuggestions.innerHTML = '';
      suggestionList = [];
      selectedIndex = -1;
      summonInput.focus();
    } else if (e.key === 'Escape') {
      if (summonOverlay.style.display === 'block') {
        summonOverlay.style.display = 'none';
        canvas.focus();
      } else if (toolSystem.isWiring()) {
        toolSystem.cancelWiring();
        requestRedraw();
      }
    }
  });

  summonInput.addEventListener('input', handleSummonInput);

  summonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestionList.length) {
        summonComponent(suggestionList[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      summonOverlay.style.display = 'none';
      canvas.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestionList.length > 0) {
        selectedIndex = (selectedIndex + 1) % suggestionList.length;
        updateSuggestionHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestionList.length > 0) {
        selectedIndex = (selectedIndex - 1 + suggestionList.length) % suggestionList.length;
        updateSuggestionHighlight();
      }
    }
  });

  function updateSuggestionHighlight() {
    Array.from(summonSuggestions.children).forEach((child, idx) => {
      child.className = `summon-item${idx === selectedIndex ? ' selected' : ''}`;
    });
  }

  // Pointer interactions
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', (e) => {
    harness.triggerFirstAction();
    if (e.button === 0) {
      const worldPt = inputRouter.normalizeEvent(e, canvas);
      toolSystem.handlePointerDown(worldPt, objectEngine, selectionEngine, geometryEngine, e.shiftKey);
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
  });

  canvas.addEventListener('mousemove', (e) => {
    const worldPt = inputRouter.normalizeEvent(e, canvas);
    toolSystem.handlePointerMove(worldPt, objectEngine, geometryEngine);

    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      const zoom = canvasEngine.getViewportState().zoom;
      canvasEngine.pan(-dx / zoom, -dy / zoom);
    }
    requestRedraw();
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine, e.shiftKey);
      requestRedraw();
    }
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
  });
}
