import { DeviceWorkspaceManager } from '../device-workspace/manager';
import { DeviceWorkspaceEditor } from '../device-workspace/editor';
import { DeviceWorkspaceRenderer } from '../device-workspace/renderer';
import { PhysicalViewportManager } from '../physical-design/viewport';
import { CommandEngine } from '../command-engine';
import { PhysicalSelectionEngine } from '../physical-design/selection';
import { SpatialIndex } from '../physical-design/spatial-index';
import { DeviceObject } from '../device-workspace/types';
import { fromNm } from '../physical-design/types';
import { DevicePropertyAdapter } from '../device-workspace/property-adapter';

export class DeviceWorkspaceUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private manager: DeviceWorkspaceManager;
  private editor: DeviceWorkspaceEditor;
  private renderer: DeviceWorkspaceRenderer;
  private viewport: PhysicalViewportManager;
  private selectionEngine: PhysicalSelectionEngine;
  private propertyAdapter: DevicePropertyAdapter;
  private isVisible: boolean = false;

  constructor(
    private container: HTMLElement,
    private commandEngine: CommandEngine
  ) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
    
    // Style the canvas wrapper
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '1';
    
    // Property Adapter still needed but we don't own the UI sidebar anymore
    this.manager = new DeviceWorkspaceManager();
    this.commandEngine.setDeviceManager(this.manager);
    this.propertyAdapter = new DevicePropertyAdapter(this.manager, this.commandEngine);
    
    this.selectionEngine = new PhysicalSelectionEngine((id) => this.manager.getObject(id) as any, new SpatialIndex());
    this.viewport = new PhysicalViewportManager(this.canvas.width, this.canvas.height);
    this.editor = new DeviceWorkspaceEditor(
      this.manager,
      this.commandEngine,
      this.selectionEngine,
      new SpatialIndex()
    );
    this.renderer = new DeviceWorkspaceRenderer(this.canvas, this.ctx, this.viewport, this.manager.getRuntime());
    
    this.setupEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Create some default items for the foundation
    this.initializeDefaultWorkspace();

    // Setup animation loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      const deltaMs = time - lastTime;
      lastTime = time;
      
      this.manager.getRuntime().update(deltaMs);
      
      if (this.isVisible) {
        // Only force render if there are animations or runtime state updates
        this.scheduleRender(); 
      }
      
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  private initializeDefaultWorkspace(): void {
    const layerId = this.manager.getWorkspace().layers[0].id;
    
    this.commandEngine.dispatch({
      id: `cmd-${Date.now()}-1`,
      name: 'CreateDeviceObject',
      payload: {
        layerId,
        object: {
          id: 'board-1',
          kind: 'breadboard',
          layerId,
          transform: { x: 50000000, y: 50000000, rotation: 0, mirrorX: false, mirrorY: false },
          visible: true,
          locked: false,
          selected: false,
          size: 'full',
          width: 165000000, // 165mm
          height: 55000000  // 55mm
        } as DeviceObject
      }
    });

    this.commandEngine.dispatch({
      id: `cmd-${Date.now()}-2`,
      name: 'CreateDeviceObject',
      payload: {
        layerId,
        object: {
          id: 'module-1',
          kind: 'module',
          layerId,
          transform: { x: 100000000, y: 120000000, rotation: 0, mirrorX: false, mirrorY: false },
          visible: true,
          locked: false,
          selected: false,
          moduleType: 'Arduino Uno',
          width: 68600000, // 68.6mm
          height: 53400000 // 53.4mm
        } as DeviceObject
      }
    });
  }

  public show(): void {
    this.container.style.display = 'block';
    this.isVisible = true;
    this.resize();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  private updateInspector(): void {
    // Left empty. Future: forward this to the unified workbench PropertyInspector.
  }

  private resize(): void {
    if (!this.isVisible) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.viewport.setDimensions(rect.width, rect.height);
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (!this.isVisible) return;
    requestAnimationFrame(() => {
      this.renderer.render(this.manager.getWorkspace());
    });
  }

  private setupEvents(): void {
    // Zoom control
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewport.zoomAtScreenPoint(factor, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      this.scheduleRender();
    });

    let isPanning = false;
    let isDragging = false;
    let hasDragged = false;
    let lastX = 0;
    let lastY = 0;
    const dragStartPositions = new Map<string, {x: number, y: number}>();

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (e.button === 0) {
        // Selection & Dragging Logic
        const vp = this.viewport.getState();
        const rect = this.canvas.getBoundingClientRect();
        const scale = 1 / 10000;
        
        const worldX = ((e.clientX - rect.left) - vp.panX) / vp.zoom / scale;
        const worldY = ((e.clientY - rect.top) - vp.panY) / vp.zoom / scale;
        
        let clickedId: string | null = null;
        for (const layer of this.manager.getWorkspace().layers) {
          if (!layer.visible) continue;
          for (const obj of layer.objects) {
            const objX = obj.transform.x * scale;
            const objY = obj.transform.y * scale;
            const objW = (obj as any).width * scale || 20;
            const objH = (obj as any).height * scale || 20;
            
            if (worldX * scale >= objX && worldX * scale <= objX + objW &&
                worldY * scale >= objY && worldY * scale <= objY + objH) {
              clickedId = obj.id;
            }
          }
        }
        
        if (clickedId) {
          if (e.shiftKey) {
            if (this.selectionEngine.isSelected(clickedId)) {
              this.selectionEngine.deselect(clickedId);
            } else {
              this.selectionEngine.selectSingle(clickedId, true);
            }
          } else {
            if (!this.selectionEngine.isSelected(clickedId)) {
              this.selectionEngine.selectSingle(clickedId);
            }
          }
          
          // Setup drag
          isDragging = true;
          hasDragged = false;
          lastX = e.clientX;
          lastY = e.clientY;
          dragStartPositions.clear();
          
          // If alt is pressed during click, duplicate the selection
          if (e.ctrlKey || e.metaKey) {
            const newIds = [];
            for (const id of this.selectionEngine.getSelectedIds()) {
              const obj = this.manager.getObject(id);
              if (obj) {
                const newObj = JSON.parse(JSON.stringify(obj));
                newObj.id = `dev-obj-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                const layerId = this.manager.getWorkspace().layers[0].id;
                this.commandEngine.dispatch({
                  id: `cmd-${Date.now()}-dup-${newObj.id}`,
                  name: 'CreateDeviceObject',
                  payload: { layerId, object: newObj }
                });
                newIds.push(newObj.id);
                dragStartPositions.set(newObj.id, { x: newObj.transform.x, y: newObj.transform.y });
              }
            }
            this.selectionEngine.clearSelection();
            newIds.forEach(id => this.selectionEngine.selectSingle(id, true));
          } else {
            for (const id of this.selectionEngine.getSelectedIds()) {
              const obj = this.manager.getObject(id);
              if (obj) dragStartPositions.set(id, { x: obj.transform.x, y: obj.transform.y });
            }
          }
        } else {
          this.selectionEngine.clearSelection();
          // Selection Box could be implemented here
        }
        
        this.updateInspector();
        this.scheduleRender();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isVisible) return;
      
      if (isPanning) {
        this.viewport.panByScreen(lastX - e.clientX, lastY - e.clientY);
        lastX = e.clientX;
        lastY = e.clientY;
        this.scheduleRender();
      } else if (isDragging) {
        hasDragged = true;
        const vp = this.viewport.getState();
        const scale = 1 / 10000;
        
        const deltaNmX = (e.clientX - lastX) / vp.zoom / scale;
        const deltaNmY = (e.clientY - lastY) / vp.zoom / scale;
        
        const pitchNm = 2540000; // 2.54mm pitch
        
        for (const [id, _startPos] of Array.from(dragStartPositions.entries())) {
          const obj = this.manager.getObject(id);
          if (obj) {
            let newX = obj.transform.x + deltaNmX;
            let newY = obj.transform.y + deltaNmY;
            
            if (!e.shiftKey) {
              newX = Math.round(newX / pitchNm) * pitchNm;
              newY = Math.round(newY / pitchNm) * pitchNm;
            }
            
            // Temporary direct update for smooth dragging (bypassing command engine for performance)
            obj.transform.x = newX;
            obj.transform.y = newY;
          }
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
        this.scheduleRender();
      }
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      if (isDragging && hasDragged) {
        // Commit drag via CommandEngine
        for (const [id, startPos] of Array.from(dragStartPositions.entries())) {
          const obj = this.manager.getObject(id);
          if (obj) {
            this.commandEngine.dispatch({
              id: `cmd-${Date.now()}-move-${id}`,
              name: 'UpdateDeviceObject',
              payload: {
                objectId: id,
                updates: { transform: { ...obj.transform } },
                reverseUpdates: { transform: { ...obj.transform, x: startPos.x, y: startPos.y } }
              }
            });
          }
        }
        this.updateInspector();
      }
      isDragging = false;
      hasDragged = false;
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;
      const ids = this.selectionEngine.getSelectedIds();
      
      // View Controls
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.viewport.centerOn({ x: 50000000, y: 50000000 }); // Center roughly on origin
        this.viewport.setZoom(1);
        this.scheduleRender();
        return;
      }
      
      if (ids.length === 0) return;

      const pitchNm = 2540000; // 2.54mm

      if (e.key.toLowerCase() === 'r') {
        const payload: any[] = [];
        for (const id of ids) {
          const obj = this.manager.getObject(id);
          if (obj) {
            payload.push({
              type: 'UPDATE_DEVICE_OBJECT',
              objectId: id,
              updates: { transform: { ...obj.transform, rotation: (obj.transform.rotation + 90) % 360 } },
              reverseUpdates: { transform: { ...obj.transform } }
            });
          }
        }
        if (payload.length > 0) {
           payload.forEach(p => {
             this.commandEngine.dispatch({
               id: `cmd-${Date.now()}-rot-${p.objectId}`,
               name: 'UpdateDeviceObject',
               payload: { 
                 objectId: p.objectId, 
                 updates: p.updates, 
                 reverseUpdates: p.reverseUpdates 
               }
             });
           });
           this.updateInspector();
           this.scheduleRender();
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? pitchNm * 10 : pitchNm;
        let dx = 0; let dy = 0;
        if (e.key === 'ArrowUp') dy = -delta;
        if (e.key === 'ArrowDown') dy = delta;
        if (e.key === 'ArrowLeft') dx = -delta;
        if (e.key === 'ArrowRight') dx = delta;
        
        ids.forEach(id => {
          const obj = this.manager.getObject(id);
          if (obj) {
            this.commandEngine.dispatch({
               id: `cmd-${Date.now()}-nudge-${id}`,
               name: 'UpdateDeviceObject',
               payload: {
                 objectId: id,
                 updates: { transform: { ...obj.transform, x: obj.transform.x + dx, y: obj.transform.y + dy } },
                 reverseUpdates: { transform: { ...obj.transform } }
               }
            });
          }
        });
        this.updateInspector();
        this.scheduleRender();
      }
    });
  }

  public getManager(): DeviceWorkspaceManager {
    return this.manager;
  }
}
