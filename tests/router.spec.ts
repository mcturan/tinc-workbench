import { Router } from '../src/physical-design/router';

describe('Interactive Router State Machine', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('should initialize in idle state', () => {
    const state = router.getState();
    expect(state.phase).toBe('idle');
    expect(state.currentLayer).toBe('F.Cu');
    expect(state.cornerMode).toBe('45');
    expect(state.segments.length).toBe(0);
    expect(state.vias.length).toBe(0);
    expect(state.activeNetId).toBeNull();
  });

  it('should transition to selecting-source on START_ROUTING', () => {
    router.dispatch({ type: 'START_ROUTING' });
    expect(router.getState().phase).toBe('selecting-source');
  });

  it('should transition to routing when a source is selected', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc', position: { x: 10, y: 10 } }
    });

    const state = router.getState();
    expect(state.phase).toBe('routing');
    expect(state.sourceId).toBe('pad-1');
    expect(state.activeNetId).toBe('net-vcc');
    expect(state.cursorPosition).toEqual({ x: 10, y: 10 });
  });

  it('should cycle corner modes during routing', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc' }
    });

    expect(router.getState().cornerMode).toBe('45');

    router.dispatch({ type: 'CYCLE_CORNER_MODE' });
    expect(router.getState().cornerMode).toBe('90');

    router.dispatch({ type: 'CYCLE_CORNER_MODE' });
    expect(router.getState().cornerMode).toBe('free');

    router.dispatch({ type: 'CYCLE_CORNER_MODE' });
    expect(router.getState().cornerMode).toBe('45');
  });

  it('should return to idle on CANCEL', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({ type: 'CANCEL' });
    expect(router.getState().phase).toBe('idle');

    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc' }
    });
    router.dispatch({ type: 'CANCEL' });
    expect(router.getState().phase).toBe('idle');
  });

  it('should update cursor position during routing', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc', position: { x: 0, y: 0 } }
    });

    router.dispatch({
      type: 'MOVE_CURSOR',
      payload: { position: { x: 100, y: 50 } }
    });

    expect(router.getState().cursorPosition).toEqual({ x: 100, y: 50 });
  });

  it('should generate transient segments during MOVE_CURSOR based on corner mode', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc', position: { x: 0, y: 0 } }
    });

    // Default mode is 45
    router.dispatch({
      type: 'MOVE_CURSOR',
      payload: { position: { x: 100, y: 50 } }
    });
    let state = router.getState();
    expect(state.segments.length).toBe(2);
    // 45 degree mode should go diagonal then straight
    // Math: minD = 50, so mid is (50, 50). Segments: (0,0)->(50,50) and (50,50)->(100,50)
    expect(state.segments[0].startX).toBe(0);
    expect(state.segments[0].startY).toBe(0);
    expect(state.segments[0].endX).toBe(50);
    expect(state.segments[0].endY).toBe(50);
    expect(state.segments[1].startX).toBe(50);
    expect(state.segments[1].startY).toBe(50);
    expect(state.segments[1].endX).toBe(100);
    expect(state.segments[1].endY).toBe(50);

    // Switch to 90
    router.dispatch({ type: 'CYCLE_CORNER_MODE' });
    state = router.getState();
    expect(state.segments.length).toBe(2);
    // 90 degree mode (X then Y): (0,0)->(100,0) and (100,0)->(100,50)
    expect(state.segments[0].endX).toBe(100);
    expect(state.segments[0].endY).toBe(0);

    // Switch to free
    router.dispatch({ type: 'CYCLE_CORNER_MODE' });
    state = router.getState();
    expect(state.segments.length).toBe(1);
    expect(state.segments[0].startX).toBe(0);
    expect(state.segments[0].startY).toBe(0);
    expect(state.segments[0].endX).toBe(100);
    expect(state.segments[0].endY).toBe(50);
  });

  it('should handle CLICK to fix segments and continue routing', () => {
    router.dispatch({ type: 'START_ROUTING' });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc', position: { x: 0, y: 0 } }
    });

    router.dispatch({ type: 'MOVE_CURSOR', payload: { position: { x: 100, y: 50 } } });
    router.dispatch({ type: 'CLICK' });

    const state = router.getState();
    expect(state.fixedSegments.length).toBe(2); // 45 degree mode
    expect(state.segments.length).toBe(0);
    expect(state.startPoint).toEqual({ x: 100, y: 50 });
  });

  it('should handle CHANGE_LAYER by dropping a via and fixing segments', () => {
    router.dispatch({ type: 'START_ROUTING', payload: { layer: 'F.Cu' } });
    router.dispatch({
      type: 'SELECT_SOURCE',
      payload: { sourceId: 'pad-1', netId: 'net-vcc', layer: 'F.Cu', position: { x: 0, y: 0 } }
    });

    router.dispatch({ type: 'MOVE_CURSOR', payload: { position: { x: 100, y: 50 } } });
    router.dispatch({ type: 'CHANGE_LAYER', payload: { layer: 'B.Cu' } });

    const state = router.getState();
    expect(state.fixedSegments.length).toBe(2);
    expect(state.segments.length).toBe(0);
    expect(state.vias.length).toBe(1);
    expect(state.vias[0].startLayer).toBe('F.Cu');
    expect(state.vias[0].endLayer).toBe('B.Cu');
    expect(state.vias[0].x).toBe(100);
    expect(state.vias[0].y).toBe(50);
    expect(state.currentLayer).toBe('B.Cu');
    expect(state.startPoint).toEqual({ x: 100, y: 50 });
  });
});
