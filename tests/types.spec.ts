import { Wire, PortEndpoint, PinEndpoint, FloatingEndpoint } from '../src/types/domain';

describe('Shared Domain Types and Contracts Tests', () => {
  it('should compile and validate valid PORT endpoints', () => {
    const port: PortEndpoint = {
      type: 'PORT',
      targetId: 'comp-1:port-A',
    };
    expect(port.type).toBe('PORT');
    expect(port.targetId).toBe('comp-1:port-A');
    // The TypeScript compiler prevents assigning coordinate:
    // const invalidPort: PortEndpoint = { type: 'PORT', targetId: 'comp-1', coordinate: { x: 0, y: 0 } };
  });

  it('should compile and validate valid PIN endpoints', () => {
    const pin: PinEndpoint = {
      type: 'PIN',
      targetId: 'comp-2:pin-Y',
    };
    expect(pin.type).toBe('PIN');
    expect(pin.targetId).toBe('comp-2:pin-Y');
  });

  it('should compile and validate valid FLOATING endpoints', () => {
    const floating: FloatingEndpoint = {
      type: 'FLOATING',
      coordinate: { x: 100, y: 150 },
    };
    expect(floating.type).toBe('FLOATING');
    expect(floating.coordinate.x).toBe(100);
    expect(floating.coordinate.y).toBe(150);
  });

  it('should enforce that Wires own only segments and no netId or endpoints', () => {
    const wire: Wire = {
      id: 'wire-1',
      logicalConnectionId: 'conn-1',
      segments: [
        { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        { start: { x: 10, y: 0 }, end: { x: 10, y: 20 } }
      ]
    };

    expect(wire.id).toBe('wire-1');
    expect(wire.logicalConnectionId).toBe('conn-1');
    expect(wire.segments.length).toBe(2);
    expect(wire.segments[0].start).toEqual({ x: 0, y: 0 });

    // Statically check that wire has no netId or endpoints:
    const wireKeys = Object.keys(wire);
    expect(wireKeys).not.toContain('netId');
    expect(wireKeys).not.toContain('endpoints');
    expect(wireKeys).not.toContain('vertices');
  });
});
