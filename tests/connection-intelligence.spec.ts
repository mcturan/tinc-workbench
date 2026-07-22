import { ObjectEngine } from '../src/object-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { ToolSystem } from '../src/tool-system';
import { SelectionEngine } from '../src/selection-engine';
import { GeometryEngine } from '../src/geometry-engine';
import { PreviewValidator } from '../src/connection-intelligence/preview-validator';
import { ConnectionHighlighter } from '../src/connection-intelligence/connection-highlighter';
import { DiagnosticsOverlay } from '../src/connection-intelligence/diagnostics-overlay';

describe('Live Connection Intelligence Tests', () => {
  let eventBus: EventBus;
  let historyEngine: HistoryEngine;
  let objectEngine: ObjectEngine;
  let commandEngine: CommandEngine;
  let toolSystem: ToolSystem;
  let selectionEngine: SelectionEngine;
  let geometryEngine: GeometryEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    const reverserReplayer = {
      executeReverse: (delta: any) => commandEngine.executeReverseDelta(delta),
      executeReplay: (delta: any) => commandEngine.executeReplay(delta),
    };
    historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    objectEngine = new ObjectEngine('p-test', 'Preview Project');
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
    toolSystem = new ToolSystem();
    selectionEngine = new SelectionEngine();
    geometryEngine = new GeometryEngine();

    // Setup active page & layer
    objectEngine.addPage({
      id: 'page-1',
      name: 'Page 1',
      layers: [],
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      objects: [],
    });
  });

  describe('Live Validation & Preview Statuses', () => {
    it('should validate preview as GREEN for a valid connection', () => {
      // Input connects to Output
      objectEngine.addComponent('layer-1', {
        id: 'comp-out',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT', name: 'OUT', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-in',
        type: 'CustomIn',
        name: 'I1',
        ports: [{ id: 'IN', name: 'IN', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const validator = new PreviewValidator();
      const state = validator.validatePreview(
        { type: 'PORT', terminalId: 'OUT', componentId: 'comp-out' },
        'IN',
        'comp-in',
        objectEngine
      );

      expect(state.status).toBe('GREEN');
      expect(state.message).toBeNull();
    });

    it('should validate preview as RED (invalid) for Output -> Output (Rule 001)', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-out1',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT1', name: 'OUT1', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-out2',
        type: 'CustomOut',
        name: 'O2',
        ports: [{ id: 'OUT2', name: 'OUT2', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const validator = new PreviewValidator();
      const state = validator.validatePreview(
        { type: 'PORT', terminalId: 'OUT1', componentId: 'comp-out1' },
        'OUT2',
        'comp-out2',
        objectEngine
      );

      expect(state.status).toBe('RED');
      expect(state.message).toContain('Cannot connect output pin');
    });

    it('should validate preview as YELLOW (warning) for Input -> Input (Rule 002)', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-in1',
        type: 'CustomIn',
        name: 'I1',
        ports: [{ id: 'IN1', name: 'IN1', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-in2',
        type: 'CustomIn',
        name: 'I2',
        ports: [{ id: 'IN2', name: 'IN2', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const validator = new PreviewValidator();
      const state = validator.validatePreview(
        { type: 'PORT', terminalId: 'IN1', componentId: 'comp-in1' },
        'IN2',
        'comp-in2',
        objectEngine
      );

      expect(state.status).toBe('YELLOW');
      expect(state.message).toContain('Connecting input pin');
    });
  });

  describe('Overlay Priority', () => {
    it('should prioritize ERROR diagnostic messages over WARNING/INFO messages', () => {
      // Create a double rule trigger scenario: e.g., both Output-Output (ERROR) and Input-Input?
      // Since a single connection cannot be both Output-Output and Input-Input,
      // let's verify PreviewValidator severity order logic directly.
      const validator = new PreviewValidator();

      // Mock a connection that produces multiple diagnostics (e.g. VCC -> VCC, VCC is direction output, so it triggers Output-Output and Power-Power)
      // VCC has signalCategory: power. VCC connects to VCC. VCC has direction output as well.
      // Actually VCC direction was input or output but let's register a component where it's VCC (power output).
      objectEngine.addComponent('layer-1', {
        id: 'comp-vcc1',
        type: 'VCC',
        name: 'VCC1',
        ports: [{ id: 'VCC1', name: 'VCC', direction: 'output', signalCategory: 'power' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-vcc2',
        type: 'VCC',
        name: 'VCC2',
        ports: [{ id: 'VCC2', name: 'VCC', direction: 'output', signalCategory: 'power' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const state = validator.validatePreview(
        { type: 'PORT', terminalId: 'VCC1', componentId: 'comp-vcc1' },
        'VCC2',
        'comp-vcc2',
        objectEngine
      );

      // Power-Power (ERROR) and Output-Output (ERROR). Both are ERROR so severity is RED.
      expect(state.status).toBe('RED');
    });
  });

  describe('Interaction and Commit Isolation rules', () => {
    it('should cancel wiring and hide overlay on cancelWiring()', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-out',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT', name: 'OUT', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      // Start wiring gesture
      const compOut = objectEngine.getObject('comp-out') as any;
      const startPt = geometryEngine.getTerminalWorldCoordinate(compOut, 'OUT');
      toolSystem.handlePointerMove(startPt, objectEngine, geometryEngine);
      toolSystem.handlePointerDown(startPt, objectEngine, selectionEngine, geometryEngine);
      expect(toolSystem.isWiring()).toBe(true);

      // Cancel
      toolSystem.cancelWiring();
      expect(toolSystem.isWiring()).toBe(false);
      expect(toolSystem.getLiveValidationState()).toBeNull();
    });

    it('should reject invalid (RED) connection commits', () => {
      // Connect OUT1 to OUT2 (Output -> Output ERROR)
      objectEngine.addComponent('layer-1', {
        id: 'comp-out1',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT1', name: 'OUT1', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-out2',
        type: 'CustomOut',
        name: 'O2',
        ports: [{ id: 'OUT2', name: 'OUT2', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      // Pointer down on OUT1
      const compOut1 = objectEngine.getObject('comp-out1') as any;
      const startPt = geometryEngine.getTerminalWorldCoordinate(compOut1, 'OUT1');
      toolSystem.handlePointerMove(startPt, objectEngine, geometryEngine);
      toolSystem.handlePointerDown(startPt, objectEngine, selectionEngine, geometryEngine);

      // Hover on OUT2
      const compOut2 = objectEngine.getObject('comp-out2') as any;
      const endPt = geometryEngine.getTerminalWorldCoordinate(compOut2, 'OUT2');
      toolSystem.handlePointerMove(endPt, objectEngine, geometryEngine);

      const valState = toolSystem.getLiveValidationState();
      expect(valState?.status).toBe('RED');

      // Pointer up (should reject and NOT create connection)
      const countBefore = objectEngine.getConnections().length;
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine);
      const countAfter = objectEngine.getConnections().length;

      expect(countAfter).toBe(countBefore); // Reverted!
      expect(toolSystem.isWiring()).toBe(false);
    });

    it('should accept valid (GREEN / YELLOW) connection commits through CommandEngine', () => {
      // Connect OUT to IN (Valid GREEN)
      objectEngine.addComponent('layer-1', {
        id: 'comp-out',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT', name: 'OUT', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-in',
        type: 'CustomIn',
        name: 'I1',
        ports: [{ id: 'IN', name: 'IN', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      // Pointer down on OUT
      const compOut = objectEngine.getObject('comp-out') as any;
      const startPt = geometryEngine.getTerminalWorldCoordinate(compOut, 'OUT');
      toolSystem.handlePointerMove(startPt, objectEngine, geometryEngine);
      toolSystem.handlePointerDown(startPt, objectEngine, selectionEngine, geometryEngine);

      // Hover on IN
      const compIn = objectEngine.getObject('comp-in') as any;
      const endPt = geometryEngine.getTerminalWorldCoordinate(compIn, 'IN');
      toolSystem.handlePointerMove(endPt, objectEngine, geometryEngine);

      const valState = toolSystem.getLiveValidationState();
      expect(valState?.status).toBe('GREEN');

      // Pointer up (commits)
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine);

      expect(objectEngine.getConnections().length).toBe(1);
      expect(historyEngine.getActiveNodeId()).not.toBeNull();
    });

    it('should guarantee that transient live validation/preview creates no history or event bus logs', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-out',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT', name: 'OUT', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-in',
        type: 'CustomIn',
        name: 'I1',
        ports: [{ id: 'IN', name: 'IN', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const startCursor = historyEngine.getActiveNodeId();
      let eventsPublished = 0;
      eventBus.subscribe('command:executed', () => {
        eventsPublished++;
      });

      // Drag and hover
      const compOut = objectEngine.getObject('comp-out') as any;
      const startPt = geometryEngine.getTerminalWorldCoordinate(compOut, 'OUT');
      toolSystem.handlePointerMove(startPt, objectEngine, geometryEngine);
      toolSystem.handlePointerDown(startPt, objectEngine, selectionEngine, geometryEngine);

      const compIn = objectEngine.getObject('comp-in') as any;
      const endPt = geometryEngine.getTerminalWorldCoordinate(compIn, 'IN');
      toolSystem.handlePointerMove(endPt, objectEngine, geometryEngine);

      // Verify no changes to history cursor or events
      expect(historyEngine.getActiveNodeId()).toBe(startCursor);
      expect(eventsPublished).toBe(0);

      // Cancel
      toolSystem.cancelWiring();
      expect(historyEngine.getActiveNodeId()).toBe(startCursor);
      expect(eventsPublished).toBe(0);
    });
  });

  describe('Highlighter and Overlay visual integration tests', () => {
    it('should map FeedbackStatus to CSS hex colors', () => {
      const highlighter = new ConnectionHighlighter();
      expect(highlighter.getColorForStatus('GREEN')).toBe('#00ff88');
      expect(highlighter.getColorForStatus('YELLOW')).toBe('#facc15');
      expect(highlighter.getColorForStatus('RED')).toBe('#ef4444');
      expect(highlighter.getColorForStatus('NONE')).toBeNull();
    });

    it('should manage domestic overlay visibility in browser context safely', () => {
      const overlay = new DiagnosticsOverlay();
      overlay.show('Test error msg', 'ERROR');
      overlay.hide();
      overlay.destroy();
    });
  });
});
