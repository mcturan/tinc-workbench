import { DeviceWorkspaceState, DeviceObject } from './types';
import { PhysicalViewportManager } from '../physical-design/viewport';
import { RuntimeEngine } from './runtime';

export class DeviceWorkspaceRenderer {
  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private viewport: PhysicalViewportManager,
    private runtime?: RuntimeEngine
  ) {}

  public render(workspace: DeviceWorkspaceState): void {
    this.ctx.save();
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const vp = this.viewport.getState();
    
    // Apply viewport transform
    this.ctx.translate(vp.panX, vp.panY);
    this.ctx.scale(vp.zoom, vp.zoom);

    if (workspace.grid.enabled) {
      this.drawGrid(workspace.grid.pitchX, workspace.grid.pitchY);
    }

    for (const layer of workspace.layers) {
      if (!layer.visible) continue;
      for (const obj of layer.objects) {
        if (!obj.visible) continue;
        this.renderObject(obj);
      }
    }

    if (this.runtime) {
      this.renderRuntimeOverlay(workspace, this.runtime);
    }

    this.ctx.restore();
  }

  private drawGrid(pitchX: number, pitchY: number): void {
    // Basic dot grid
    const vp = this.viewport.getState();
    const invZoom = 1 / vp.zoom;
    
    const startX = -vp.panX * invZoom;
    const startY = -vp.panY * invZoom;
    const endX = startX + this.canvas.width * invZoom;
    const endY = startY + this.canvas.height * invZoom;

    // NM to Pixels conversion factor: assuming 1 pixel = 10000nm for grid drawing scale
    const scale = 1 / 10000;
    
    this.ctx.fillStyle = '#333333';
    
    const gridSpacingPxX = pitchX * scale;
    const gridSpacingPxY = pitchY * scale;

    if (gridSpacingPxX * vp.zoom < 5) return; // Don't draw if too dense

    for (let x = Math.floor(startX / pitchX) * pitchX; x < endX; x += pitchX) {
      for (let y = Math.floor(startY / pitchY) * pitchY; y < endY; y += pitchY) {
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, 1 * invZoom, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private renderObject(obj: DeviceObject): void {
    const scale = 1 / 10000;
    this.ctx.save();
    this.ctx.translate(obj.transform.x * scale, obj.transform.y * scale);
    this.ctx.rotate((obj.transform.rotation * Math.PI) / 180);

    // Subtle shadows for objects
    if (obj.kind !== 'wire') {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
    }

    if (obj.kind === 'enclosure') {
      this.ctx.fillStyle = '#222222';
      this.ctx.strokeStyle = '#555555';
      this.ctx.lineWidth = 2;
      
      // Draw rounded rect
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, obj.width * scale, obj.height * scale, 10);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowColor = 'transparent'; // Turn off shadow for internal details
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px "Inter", "Segoe UI", sans-serif';
      this.ctx.fillText(obj.label, 10, 24);

      this.ctx.fillStyle = '#111111';
      for (const hole of obj.mountingHoles) {
        this.ctx.beginPath();
        this.ctx.arc(hole.x * scale, hole.y * scale, hole.diameter * scale / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }
    } else if (obj.kind === 'perfboard') {
      this.ctx.fillStyle = '#C89454'; // Perfboard brownish/yellow
      this.ctx.fillRect(0, 0, obj.width * scale, obj.height * scale);
      this.ctx.shadowColor = 'transparent';
      
      this.ctx.fillStyle = obj.view === 'top' ? '#E1A95F' : '#b5838d';
      const padColor = '#C19A6B'; // Copper color
      for (let r = 0; r < obj.rows; r++) {
        for (let c = 0; c < obj.cols; c++) {
          const px = (c + 1) * obj.pitch * scale;
          const py = (r + 1) * obj.pitch * scale;
          this.ctx.fillStyle = padColor;
          this.ctx.beginPath();
          this.ctx.arc(px, py, (obj.pitch * 0.4) * scale, 0, Math.PI * 2);
          this.ctx.fill();
          
          this.ctx.fillStyle = '#1a1a1a'; // Hole
          this.ctx.beginPath();
          this.ctx.arc(px, py, (obj.pitch * 0.15) * scale, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      if (obj.showNumbering) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        for (let c = 0; c < obj.cols; c++) {
          this.ctx.fillText(String(c + 1), (c + 1) * obj.pitch * scale - 4, 12);
        }
        for (let r = 0; r < obj.rows; r++) {
          this.ctx.fillText(String.fromCharCode(65 + r), 4, (r + 1) * obj.pitch * scale + 4);
        }
      }
    } else if (obj.kind === 'breadboard') {
      this.ctx.fillStyle = '#F5F5F5'; // Off-white
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, obj.width * scale, obj.height * scale, 8);
      this.ctx.fill();
      
      this.ctx.shadowColor = 'transparent';
      this.ctx.strokeStyle = '#E0E0E0';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Power rails line
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.beginPath(); this.ctx.moveTo(10, 15); this.ctx.lineTo(obj.width * scale - 10, 15); this.ctx.stroke();
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.beginPath(); this.ctx.moveTo(10, 30); this.ctx.lineTo(obj.width * scale - 10, 30); this.ctx.stroke();

      this.ctx.fillStyle = '#2A2A2A'; // Hole color
      const pitchPx = 2540000 * scale;
      for (let x = pitchPx * 2; x < obj.width * scale - pitchPx; x += pitchPx) {
        for (let y = pitchPx * 2; y < obj.height * scale - pitchPx * 2; y += pitchPx) {
          if (y > pitchPx * 6 && y < pitchPx * 9) continue; // Gap
          this.ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
    } else if (obj.kind === 'module') {
      const isArduino = obj.moduleType.includes('Arduino');
      const isESP = obj.moduleType.includes('ESP');
      const isDisplay = obj.moduleType.includes('OLED') || obj.moduleType.includes('LCD');
      
      if (isArduino) this.ctx.fillStyle = '#00878F'; // Arduino Teal
      else if (isESP) this.ctx.fillStyle = '#2C2C2C'; // ESP Black
      else if (isDisplay) this.ctx.fillStyle = '#111111';
      else this.ctx.fillStyle = '#1A5B2E'; // Generic PCB Green

      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, obj.width * scale, obj.height * scale, 5);
      this.ctx.fill();
      
      this.ctx.shadowColor = 'transparent';
      
      // Chips & Connectors
      if (isArduino) {
        // USB Port
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.fillRect(0, 5, 12, 10);
        // MCU
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(obj.width * scale / 2 - 10, obj.height * scale / 2 - 10, 20, 20);
      } else if (isESP) {
        // RF Shield
        this.ctx.fillStyle = '#D3D3D3';
        this.ctx.fillRect(5, 5, 15, 20);
      } else if (isDisplay) {
        // Screen area
        this.ctx.fillStyle = '#0a2239'; // Dark blueish
        this.ctx.fillRect(5, 5, obj.width * scale - 10, obj.height * scale - 10);
      }

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px "Inter", sans-serif';
      this.ctx.fillText(obj.moduleType, 15, obj.height * scale - 10);

      // Render pins/connection points
      if (obj.connectionPoints) {
        for (const pt of obj.connectionPoints) {
          this.ctx.fillStyle = '#FFD700';
          this.ctx.beginPath();
          this.ctx.arc(pt.x * scale, pt.y * scale, 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    } else if (obj.kind === 'wire') {
      this.ctx.strokeStyle = obj.color;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      if (obj.points.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(obj.points[0].x * scale, obj.points[0].y * scale);
        for (let i = 1; i < obj.points.length; i++) {
          this.ctx.lineTo(obj.points[i].x * scale, obj.points[i].y * scale);
        }
        this.ctx.stroke();
        
        // Cleaner junction rendering
        this.ctx.fillStyle = obj.color;
        for (let i = 0; i < obj.points.length; i++) {
          this.ctx.beginPath();
          this.ctx.arc(obj.points[i].x * scale, obj.points[i].y * scale, 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      // Wire label
      if (obj.label && obj.points.length > 0) {
        const midPt = obj.points[Math.floor(obj.points.length / 2)];
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px "Inter", sans-serif';
        
        // Add label background
        const textWidth = this.ctx.measureText(obj.label).width;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(midPt.x * scale + 2, midPt.y * scale - 14, textWidth + 6, 14);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(obj.label, midPt.x * scale + 5, midPt.y * scale - 4);
      }
    }

    if (obj.selected) {
      this.ctx.strokeStyle = '#0ea5e9'; // Modern blue highlight
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeRect(-2, -2, (obj as any).width * scale + 4 || 0, (obj as any).height * scale + 4 || 0);
      this.ctx.setLineDash([]);
      
      // Resize/Rotate handles
      if (obj.kind !== 'wire') {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#0ea5e9';
        this.ctx.beginPath();
        this.ctx.arc((obj as any).width * scale + 10, (obj as any).height * scale / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  private renderRuntimeOverlay(workspace: DeviceWorkspaceState, runtime: RuntimeEngine): void {
    const scale = 1 / 10000;
    
    for (const layer of workspace.layers) {
      if (!layer.visible) continue;
      for (const obj of layer.objects) {
        if (!obj.visible || obj.kind === 'wire') continue;
        
        const state = runtime.getState(obj.id);
        if (!state) continue;

        this.ctx.save();
        this.ctx.translate(obj.transform.x * scale, obj.transform.y * scale);
        this.ctx.rotate((obj.transform.rotation * Math.PI) / 180);

        // State glow/outline
        if (state.state === 'error') {
          this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
          this.ctx.lineWidth = 4;
          this.ctx.strokeRect(-2, -2, (obj as any).width * scale + 4, (obj as any).height * scale + 4);
        } else if (state.state === 'warning') {
          this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'; // Orange
          this.ctx.lineWidth = 4;
          this.ctx.strokeRect(-2, -2, (obj as any).width * scale + 4, (obj as any).height * scale + 4);
        } else if (state.state === 'active') {
          this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Green
          this.ctx.lineWidth = 4;
          this.ctx.strokeRect(-2, -2, (obj as any).width * scale + 4, (obj as any).height * scale + 4);
        } else if (state.state === 'powered') {
          this.ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
          this.ctx.shadowBlur = 15;
          this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; // Blue
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(0, 0, (obj as any).width * scale, (obj as any).height * scale);
        }

        // Render Status Indicators
        const indicatorX = (obj as any).width * scale + 5;
        let indicatorY = 10;
        for (const indicator of state.indicators) {
          if (!indicator.active) continue;
          
          this.ctx.beginPath();
          this.ctx.arc(indicatorX, indicatorY, 6, 0, Math.PI * 2);
          
          if (indicator.color) {
            this.ctx.fillStyle = indicator.color;
          } else {
            switch(indicator.type) {
              case 'power': this.ctx.fillStyle = '#ef4444'; break;
              case 'serial': this.ctx.fillStyle = '#3b82f6'; break;
              case 'wifi': this.ctx.fillStyle = '#10b981'; break;
              case 'bluetooth': this.ctx.fillStyle = '#2563eb'; break;
              case 'error': this.ctx.fillStyle = '#ef4444'; break;
              case 'warning': this.ctx.fillStyle = '#f59e0b'; break;
              default: this.ctx.fillStyle = '#ffffff';
            }
          }
          
          this.ctx.fill();
          
          // Icon placeholder
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = '8px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(indicator.type.charAt(0).toUpperCase(), indicatorX, indicatorY + 3);
          
          indicatorY += 16;
        }

        // Render Animations
        if (state.animations) {
          for (const anim of state.animations) {
            const ax = anim.x !== undefined ? anim.x * scale : ((obj as any).width * scale / 2);
            const ay = anim.y !== undefined ? anim.y * scale : ((obj as any).height * scale / 2);
            
            this.ctx.save();
            this.ctx.translate(ax, ay);
            
            if (anim.type === 'led') {
              this.ctx.beginPath();
              this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
              this.ctx.fillStyle = `rgba(239, 68, 68, ${anim.value})`;
              this.ctx.shadowColor = `rgba(239, 68, 68, ${anim.value})`;
              this.ctx.shadowBlur = 10;
              this.ctx.fill();
              
              // Draw LED casing
              this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
              this.ctx.lineWidth = 1;
              this.ctx.stroke();
            } else if (anim.type === 'servo' || anim.type === 'rotary' || anim.type === 'potentiometer') {
              // Draw rotating knob/horn
              this.ctx.rotate(anim.value * Math.PI * 2); // value is 0.0 to 1.0 mapping to 0 to 360 deg
              this.ctx.beginPath();
              this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
              this.ctx.fillStyle = '#333333';
              this.ctx.fill();
              
              this.ctx.beginPath();
              this.ctx.moveTo(0, 0);
              this.ctx.lineTo(0, -6);
              this.ctx.strokeStyle = '#ffffff';
              this.ctx.lineWidth = 2;
              this.ctx.stroke();
            } else if (anim.type === 'fan') {
              this.ctx.rotate(anim.value * Math.PI * 2);
              this.ctx.beginPath();
              this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
              this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
              this.ctx.fill();
              // Cross lines for fan blades
              this.ctx.beginPath();
              this.ctx.moveTo(-15, 0); this.ctx.lineTo(15, 0);
              this.ctx.moveTo(0, -15); this.ctx.lineTo(0, 15);
              this.ctx.strokeStyle = '#222';
              this.ctx.lineWidth = 4;
              this.ctx.stroke();
            } else if (anim.type === 'button') {
              this.ctx.beginPath();
              this.ctx.arc(0, 0, anim.value > 0.5 ? 4 : 6, 0, Math.PI * 2);
              this.ctx.fillStyle = anim.value > 0.5 ? '#991b1b' : '#ef4444';
              this.ctx.fill();
            } else if (anim.type === 'switch') {
              this.ctx.fillStyle = '#111';
              this.ctx.fillRect(-5, -10, 10, 20);
              this.ctx.fillStyle = '#ccc';
              // Toggle switch position
              const ty = anim.value > 0.5 ? -8 : 2;
              this.ctx.fillRect(-3, ty, 6, 6);
            }
            
            this.ctx.restore();
          }
        }

        this.ctx.restore();
      }
    }
  }
}
