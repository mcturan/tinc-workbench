import { FootprintEditorWorkspace } from '../src/physical-design/footprint-editor';
import { CommandEngine } from '../src/command-engine';
import { ObjectEngine } from '../src/object-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { PCBFootprintDefinition, PadObject, GraphicObject, TextObject } from '../src/physical-design/types';

describe('Footprint Editor Workspace', () => {
  let objectEngine: ObjectEngine;
  let historyEngine: HistoryEngine;
  let eventBus: EventBus;
  let commandEngine: CommandEngine;
  let editor: FootprintEditorWorkspace;

  beforeEach(() => {
    eventBus = new EventBus();
    objectEngine = new ObjectEngine('test-proj', 'Test Project');
    historyEngine = new HistoryEngine(eventBus, null as any); // mock reverser
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
    editor = new FootprintEditorWorkspace(commandEngine);
  });

  it('should initialize and load a footprint', () => {
    const fp: PCBFootprintDefinition = {
      id: 'fp-1',
      name: 'Test Footprint',
      tags: [],
      pads: [],
      graphics: [],
      texts: [],
      anchor: { x: 0, y: 0 }
    };

    editor.loadFootprint(fp);
    const saved = editor.saveFootprint();
    expect(saved.id).toBe('fp-1');
    expect(saved.name).toBe('Test Footprint');
    
    const val = editor.validate();
    expect(val.errors).toContain('Missing reference designator text');
    expect(val.valid).toBe(false);
  });

  it('should validate overlapping pads and missing drills', () => {
    const fp: PCBFootprintDefinition = {
      id: 'fp-2',
      name: 'Invalid Footprint',
      tags: [],
      pads: [
        {
          id: 'pad-1',
          kind: 'pad',
          layerId: 'F.Cu',
          transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
          visible: true,
          locked: false,
          selected: false,
          padNumber: '1',
          padShape: 'circle',
          padType: 'thru-hole',
          sizeX: 1000000,
          sizeY: 1000000,
          drillDiameter: 0 // invalid drill
        },
        {
          id: 'pad-2',
          kind: 'pad',
          layerId: 'F.Cu',
          transform: { x: 100, y: 0, rotation: 0, mirrorX: false, mirrorY: false }, // overlapping with pad-1
          visible: true,
          locked: false,
          selected: false,
          padNumber: '2',
          padShape: 'circle',
          padType: 'smd',
          sizeX: 1000000,
          sizeY: 1000000
        }
      ],
      graphics: [],
      texts: [
        {
          id: 'ref',
          kind: 'text',
          layerId: 'F.Silkscreen',
          transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
          visible: true,
          locked: false,
          selected: false,
          text: 'REF**',
          textType: 'reference',
          fontSizeUm: 1000,
          bold: false,
          italic: false,
          mirrored: false,
          justification: 'center'
        }
      ],
      anchor: { x: 0, y: 0 }
    };

    editor.loadFootprint(fp);
    const val = editor.validate();
    
    expect(val.valid).toBe(false);
    expect(val.errors.some(e => e.includes('invalid drill diameter'))).toBe(true);
    expect(val.errors.some(e => e.includes('overlaps'))).toBe(true);
    expect(val.errors.some(e => e.includes('Missing reference'))).toBe(false);
  });
});
