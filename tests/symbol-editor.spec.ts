import { SymbolEditorWorkspace } from '../src/symbol-editor/workspace';
import { CommandEngine } from '../src/command-engine';
import { ObjectEngine } from '../src/object-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { SymbolDefinition } from '../src/library/types';
import { SymbolPropertyAdapter } from '../src/symbol-editor/property-adapter';

describe('Symbol Editor Workspace', () => {
  let objectEngine: ObjectEngine;
  let historyEngine: HistoryEngine;
  let eventBus: EventBus;
  let commandEngine: CommandEngine;
  let editor: SymbolEditorWorkspace;

  beforeEach(() => {
    eventBus = new EventBus();
    objectEngine = new ObjectEngine('test-proj', 'Test Project');
    historyEngine = new HistoryEngine(eventBus, null as any);
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
    editor = new SymbolEditorWorkspace(commandEngine);
  });

  it('should initialize and load a symbol', () => {
    const sym: SymbolDefinition = {
      id: 'sym-1',
      displayName: 'Test Symbol',
      internalName: 'test_symbol',
      description: 'A test symbol',
      category: 'test',
      subcategory: '',
      tags: [],
      aliases: [],
      keywords: [],
      version: '1.0',
      author: 'Test',
      license: 'MIT',
      creationDate: '',
      lastModificationDate: '',
      deprecationState: 'active',
      units: [],
      alternateViews: [],
      variants: [
        {
          id: 'v1',
          name: 'Default',
          pins: [],
          graphics: []
        }
      ]
    };

    editor.loadSymbol(sym, 0);
    const saved = editor.saveSymbol();
    expect(saved.id).toBe('sym-1');
    expect(saved.name).toBe('Test Symbol');
    
    const val = editor.validate();
    expect(val.errors).toContain('Symbol is empty');
    expect(val.errors).toContain('Missing reference prefix text');
    expect(val.valid).toBe(false);
  });

  it('should validate duplicate pins and missing names', () => {
    const sym: SymbolDefinition = {
      id: 'sym-2',
      displayName: 'Test Symbol 2',
      internalName: 'test_symbol_2',
      description: 'A test symbol 2',
      category: 'test',
      subcategory: '',
      tags: [],
      aliases: [],
      keywords: [],
      version: '1.0',
      author: 'Test',
      license: 'MIT',
      creationDate: '',
      lastModificationDate: '',
      deprecationState: 'active',
      units: [],
      alternateViews: [],
      variants: [
        {
          id: 'v1',
          name: 'Default',
          pins: [
            { id: 'p1', name: '', direction: 'input', number: '1' },
            { id: 'p2', name: 'GND', direction: 'power_input', number: '1' }
          ],
          graphics: [
            {
              id: 'text-1',
              kind: 'text',
              text: 'R?',
              textType: 'reference',
              fontSize: 10,
              alignment: 'center',
              visible: true,
              transform: { x: 0, y: 0, rotation: 0 }
            }
          ]
        }
      ]
    };

    editor.loadSymbol(sym, 0);
    const val = editor.validate();
    
    expect(val.valid).toBe(false);
    expect(val.errors.some(e => e.includes('Duplicate pin number: 1'))).toBe(true);
    expect(val.errors.some(e => e.includes('missing a name'))).toBe(true);
  });

  it('should generate property groups via SymbolPropertyAdapter', () => {
    const sym: SymbolDefinition = {
      id: 'sym-3',
      displayName: 'Adapter Test',
      internalName: 'adapter_test',
      description: 'Test description',
      category: 'test',
      subcategory: '',
      tags: [],
      aliases: [],
      keywords: [],
      version: '1.0',
      author: 'Test',
      license: 'MIT',
      creationDate: '',
      lastModificationDate: '',
      deprecationState: 'active',
      units: [],
      alternateViews: [],
      variants: [
        {
          id: 'v1',
          name: 'Default',
          pins: [
            { id: 'pin-123', name: 'VCC', direction: 'power_input', number: '8' }
          ],
          graphics: []
        }
      ]
    };

    editor.loadSymbol(sym, 0);
    const adapter = new SymbolPropertyAdapter(editor);
    
    // Select root
    const rootProps = adapter.getProperties(['sym-3']);
    expect(rootProps.length).toBeGreaterThan(0);
    expect(rootProps[0].name).toBe('Symbol Definition');
    
    // Select pin
    const pinProps = adapter.getProperties(['pin-123']);
    expect(pinProps.length).toBeGreaterThan(0);
    expect(pinProps[0].name).toBe('Pin Properties');
  });
});
