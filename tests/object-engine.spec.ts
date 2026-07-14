import { ObjectEngine } from '../src/object-engine';
import { Project, Page, Layer, SemanticObject, LogicalConnection, Wire } from '../src/types';

describe('Object Engine Registry and Integrity Tests', () => {
  let objectEngine: ObjectEngine;

  beforeEach(() => {
    objectEngine = new ObjectEngine('proj-1', 'Test Project');
  });

  const validateUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  };

  // Test 1 & 2 & 3: deletePage behavior
  it('1. should remove Page, Layers, SemanticObjects, Ports, and Pins from registry on deletePage', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [{ id: 'pin-1', name: 'A', direction: 'input', signalCategory: 'digital' }],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    expect(objectEngine.getObject('page-1')).toBeDefined();
    expect(objectEngine.getObject('layer-1')).toBeDefined();
    expect(objectEngine.getObject('comp-1')).toBeDefined();
    expect(objectEngine.getObject('port-1')).toBeDefined();
    expect(objectEngine.getObject('pin-1')).toBeDefined();

    objectEngine.deletePage('page-1');

    expect(objectEngine.getObject('page-1')).toBeUndefined();
    expect(objectEngine.getObject('layer-1')).toBeUndefined();
    expect(objectEngine.getObject('comp-1')).toBeUndefined();
    expect(objectEngine.getObject('port-1')).toBeUndefined();
    expect(objectEngine.getObject('pin-1')).toBeUndefined();
  });

  it('2. should remove deleted terminal IDs from terminal index state indirectly on deletePage', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    // Deleting the page cleans terminals
    objectEngine.deletePage('page-1');

    // Add a connection referencing the old deleted port-1 must fail since port-1 is evicted from terminal state
    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };

    expect(() => {
      objectEngine.addLogicalConnection(conn);
    }).toThrow('Endpoint reference violation: target ID port-1 not found in ports/pins index');
  });

  it('3. should fail deletePage with referenced terminals and missing resolved coordinates leaving previous graph fully intact', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    // Should fail because no coordinates supplied for port-1
    expect(() => {
      objectEngine.deletePage('page-1');
    }).toThrow('Reference integrity violation: Port/Pin port-1 is referenced by connection conn-1, but no resolved coordinate was provided.');

    // Validate page & children remain fully intact
    expect(objectEngine.getObject('page-1')).toBeDefined();
    expect(objectEngine.getObject('layer-1')).toBeDefined();
    expect(objectEngine.getObject('comp-1')).toBeDefined();
    expect(objectEngine.getObject('port-1')).toBeDefined();
  });

  // Test 4 & 5 & 6: deleteLayer behavior
  it('4. should remove Layer, SemanticObjects, Ports, and Pins from registry on deleteLayer', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [{ id: 'pin-1', name: 'A', direction: 'input', signalCategory: 'digital' }],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    objectEngine.deleteLayer('layer-1');

    expect(objectEngine.getObject('layer-1')).toBeUndefined();
    expect(objectEngine.getObject('comp-1')).toBeUndefined();
    expect(objectEngine.getObject('port-1')).toBeUndefined();
    expect(objectEngine.getObject('pin-1')).toBeUndefined();
  });

  it('5. should fail deleteLayer with referenced terminals and missing resolved coordinates leaving previous graph fully intact', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    expect(() => {
      objectEngine.deleteLayer('layer-1');
    }).toThrow('Reference integrity violation: Port/Pin port-1 is referenced by connection conn-1, but no resolved coordinate was provided.');

    // Stays intact
    expect(objectEngine.getObject('layer-1')).toBeDefined();
    expect(objectEngine.getObject('comp-1')).toBeDefined();
  });

  it('6. should successfully deleteLayer and convert referenced PORT/PIN endpoints to FLOATING using resolved coordinates', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    objectEngine.deleteLayer('layer-1', { 'port-1': { x: 100, y: 200 } });

    const updatedConn = objectEngine.getLogicalConnection('conn-1');
    expect(updatedConn).toBeDefined();
    expect(updatedConn!.source.type).toBe('FLOATING');
    expect((updatedConn!.source as any).coordinate).toEqual({ x: 100, y: 200 });
  });

  // Test 7: canonical entity discrimination
  it('7. should use canonical entity kinds instead of structural property presence checks', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);

    // Let's modify properties on page to look like a Wire:
    // If it used duck-typing, this would break getEntityKind or confuse operations.
    const fakeWireShapePage = page as any;
    fakeWireShapePage.logicalConnectionId = 'some-conn-id';
    fakeWireShapePage.segments = [];

    // cloneObjects should identify it correctly by ID. It will look up kinds Map and reject Page cloning.
    expect(() => {
      objectEngine.cloneObjects(['page-1']);
    }).toThrow('Cloning entity kind Page is not supported');
  });

  // Test 8: cloneObjects rejects missing IDs
  it('8. should reject clone requests with missing IDs explicitly', () => {
    expect(() => {
      objectEngine.cloneObjects(['nonexistent-id']);
    }).toThrow('Clone target ID nonexistent-id not found');
  });

  // Test 9: cloneObjects rejects unsupported entity kinds
  it('9. should reject clone requests of unsupported kinds explicitly', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);

    expect(() => {
      objectEngine.cloneObjects(['page-1']);
    }).toThrow('Cloning entity kind Page is not supported');
  });

  // Test 10: failed clone validation leaves state unchanged
  it('10. should leave all live state unchanged if clone validation fails', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    // Create a wire with valid reference
    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    const wire: Wire = {
      id: 'wire-1',
      logicalConnectionId: 'conn-1',
      segments: [],
    };
    objectEngine.addWire(wire);

    // Let's hack wire-1 to reference a nonexistent connection so that cloning it fails validation
    wire.logicalConnectionId = 'nonexistent-conn';

    const previousRegistrySize = (objectEngine as any).registry.size;

    expect(() => {
      objectEngine.cloneObjects(['wire-1']);
    }).toThrow('Cloned wire references non-existent logicalConnectionId: nonexistent-conn');

    // Confirm state remains unchanged
    expect((objectEngine as any).registry.size).toBe(previousRegistrySize);
  });

  // Test 11 & 16: cloned SemanticObject is present in canonical Layer.objects list (no orphans)
  it('11 & 16. should insert cloned SemanticObjects into the same canonical Layer tree as their originals to prevent orphans', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const clonedIds = objectEngine.cloneObjects(['comp-1']);
    const clonedId = clonedIds[0];

    const layer = objectEngine.getObject('layer-1') as Layer;
    const clone = objectEngine.getObject(clonedId) as SemanticObject;

    expect(layer.objects).toContain(clone); // Present in Layer objects!
    expect(clone).toBeDefined(); // Present in Registry!
  });

  // Test 12: cloned port/pin IDs are globally registered and unique
  it('12. should globally register cloned Port and Pin IDs to ensure uniqueness', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const clonedIds = objectEngine.cloneObjects(['comp-1']);
    const clone = objectEngine.getObject(clonedIds[0]) as SemanticObject;

    const clonedPortId = clone.ports[0].id;

    // Check that it exists in the registry
    expect(objectEngine.getObject(clonedPortId)).toBeDefined();

    // Verify it blocks collision attempts
    const collidingPage: Page = {
      id: clonedPortId,
      name: 'Colliding Page',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    expect(() => {
      objectEngine.addPage(collidingPage);
    }).toThrow(`ID collision: ${clonedPortId} already exists`);
  });

  // Test 13: cloned LogicalConnection endpoints rewrite
  it('13. should rewrite cloned LogicalConnection endpoints to cloned Port/Pin IDs when cloned together', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    const clonedIds = objectEngine.cloneObjects(['comp-1', 'conn-1']);

    const clonedComp = objectEngine.getObject(clonedIds[0]) as SemanticObject;
    const clonedConn = objectEngine.getObject(clonedIds[1]) as LogicalConnection;

    expect(clonedConn.source.type).toBe('PORT');
    expect((clonedConn.source as any).targetId).toBe(clonedComp.ports[0].id); // Rewritten correctly!
  });

  // Test 14: cloned Wire logicalConnectionId rewrites
  it('14. should rewrite cloned Wire logicalConnectionId to the cloned LogicalConnection ID when cloned together', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    const wire: Wire = {
      id: 'wire-1',
      logicalConnectionId: 'conn-1',
      segments: [],
    };
    objectEngine.addWire(wire);

    const clonedIds = objectEngine.cloneObjects(['conn-1', 'wire-1']);

    const clonedConnId = clonedIds[0];
    const clonedWire = objectEngine.getObject(clonedIds[1]) as Wire;

    expect(clonedWire.logicalConnectionId).toBe(clonedConnId); // Rewritten correctly!
  });

  // Test 15: cloning a Wire without cloning its LogicalConnection
  it('15. should preserve the original connection reference when cloning a Wire alone if the original connection exists', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'port-1' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };
    objectEngine.addLogicalConnection(conn);

    const wire: Wire = {
      id: 'wire-1',
      logicalConnectionId: 'conn-1',
      segments: [],
    };
    objectEngine.addWire(wire);

    const clonedIds = objectEngine.cloneObjects(['wire-1']);
    const clonedWire = objectEngine.getObject(clonedIds[0]) as Wire;

    expect(clonedWire.logicalConnectionId).toBe('conn-1'); // Preserved!
  });

  // Test 17: Clone ID is UUID v4
  it('17. should generate clone IDs conforming to UUID rules', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Page 1',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          locked: false,
          objects: [
            {
              id: 'comp-1',
              type: 'resistor',
              name: 'R1',
              ports: [{ id: 'port-1', name: '1', direction: 'passive', signalCategory: 'analog' }],
              pins: [],
              properties: {},
            }
          ]
        }
      ],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);
    objectEngine.addLayer('page-1', page.layers[0]);
    objectEngine.addComponent('layer-1', page.layers[0].objects[0]);

    const clonedIds = objectEngine.cloneObjects(['comp-1']);
    validateUUID(clonedIds[0]);
  });

  // Test 18: Global uniqueness still passes
  it('18. should verify global cross-category ID uniqueness is still enforced', () => {
    const page: Page = {
      id: 'duplicate-id',
      name: 'Page 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };
    objectEngine.addPage(page);

    const page2: Page = {
      id: 'duplicate-id',
      name: 'Page 2',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    expect(() => {
      objectEngine.addPage(page2);
    }).toThrow('ID collision: duplicate-id already exists');
  });

  // Test 19: hydration atomicity still passes
  it('19. should verify hydration atomicity is still enforced', () => {
    const project: Project = {
      id: 'proj-1',
      name: 'Proj 1',
      pages: [],
    };
    const conn: LogicalConnection = {
      id: 'conn-1',
      source: { type: 'PORT', targetId: 'nonexistent-port' },
      target: { type: 'FLOATING', coordinate: { x: 0, y: 0 } },
      netId: 'net-1',
    };

    expect(() => {
      objectEngine.loadProjectGraph(project, [conn], []);
    }).toThrow('Endpoint reference violation: target ID nonexistent-port not found');
  });

  // Test 20: pre-existing Task 001-004 tests remain passing
  it('20. should verify pre-existing Task 004 CRUD behavior is preserved', () => {
    const page: Page = {
      id: 'page-1',
      name: 'Schematic Page 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    };

    objectEngine.addPage(page);
    expect(objectEngine.getObject('page-1')).toEqual(page);
  });
});
