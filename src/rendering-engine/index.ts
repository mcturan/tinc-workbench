import { ObjectEngine } from '../object-engine';
import { CanvasEngine } from '../canvas-engine';
import { GeometryEngine, COMPONENT_SIZES } from '../geometry-engine';
import { SelectionEngine } from '../selection-engine';
import { ToolSystem } from '../tool-system';
import { Page, SemanticObject } from '../types';
import { ConnectionHighlighter } from '../connection-intelligence';
import { getSymbol } from '../library/symbols/manager';

export class RenderingEngine {
  constructor(private geometryEngine: GeometryEngine) {}

  render(
    ctx: CanvasRenderingContext2D,
    objectEngine: ObjectEngine,
    canvasEngine: CanvasEngine,
    selectionEngine?: SelectionEngine,
    toolSystem?: ToolSystem,
    activePageId: string = 'page-1'
  ): void {
    const page = objectEngine.getObject(activePageId) as Page;
    if (!page) return;

    // Dimensions are already maintained by canvasEngine via window resize listeners
    // Do not read ctx.canvas.clientWidth here to avoid layout thrashing on mousemove
    const width = canvasEngine.getWidth();
    const height = canvasEngine.getHeight();

    // 1. Clear workspace background (relies on container's CSS background)
    // Save state before clearing, in case of transforms
    ctx.save();
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();

    // 2. Draw adaptive dot grid
    const zoom = canvasEngine.getViewportState().zoom;
    
    // Base spacing in world units
    let gridSpacing = 20;
    
    // Adapt grid spacing to zoom level to keep screen dots between 15px and 75px apart
    while (gridSpacing * zoom < 15) {
      gridSpacing *= 5; // e.g., 20 -> 100 -> 500
    }
    while (gridSpacing * zoom > 100) {
      gridSpacing /= 5; // e.g., 100 -> 20
    }

    const topLeft = canvasEngine.screenToWorld({ x: 0, y: 0 });
    const bottomRight = canvasEngine.screenToWorld({ x: width, y: height });

    const startX = Math.floor(topLeft.x / gridSpacing) * gridSpacing;
    const startY = Math.floor(topLeft.y / gridSpacing) * gridSpacing;
    const endX = Math.ceil(bottomRight.x / gridSpacing) * gridSpacing;
    const endY = Math.ceil(bottomRight.y / gridSpacing) * gridSpacing;

    ctx.fillStyle = '#44475a'; // var(--border)
    for (let x = startX; x <= endX; x += gridSpacing) {
      for (let y = startY; y <= endY; y += gridSpacing) {
        const screenPt = canvasEngine.worldToScreen({ x, y });
        ctx.fillRect(screenPt.x, screenPt.y, 1, 1);
      }
    }

    // 3. Draw placed components
    let componentCount = 0;
    for (const layer of page.layers) {
      if (!layer.visible) continue;
      for (const component of layer.objects) {
        componentCount++;
        this.renderComponent(ctx, component, canvasEngine, selectionEngine, toolSystem);
      }
    }

    if (componentCount === 0) {
      ctx.fillStyle = '#6272a4'; // var(--text-secondary)
      ctx.font = '500 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      const cx = width / 2;
      const cy = height / 2;
      
      ctx.fillText('Workspace is empty.', cx, cy - 30);
      
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillStyle = '#8be9fd'; // Standout color for hints
      ctx.fillText('Click + to add components', cx, cy + 10);
      ctx.fillText('Double-click anywhere', cx, cy + 30);
      ctx.fillText('Drag from Component Browser', cx, cy + 50);
      ctx.fillText('Press / to search', cx, cy + 70);
    }

    // 4. Draw committed wires
    for (const wire of objectEngine.getWires()) {
      ctx.strokeStyle = wire.style?.color || '#5294e2'; // Wire blue
      ctx.lineWidth = Math.max(2.0, (wire.style?.width || 2.0) * zoom);
      ctx.beginPath();
      let first = true;
      for (const segment of wire.segments) {
        const screenStart = canvasEngine.worldToScreen(segment.start);
        const screenEnd = canvasEngine.worldToScreen(segment.end);
        if (first) {
          ctx.moveTo(screenStart.x, screenStart.y);
          first = false;
        }
        ctx.lineTo(screenEnd.x, screenEnd.y);
      }
      ctx.stroke();
    }

    // 5. Draw transient wire preview (UX-009)
    const transientSegments = toolSystem?.getTransientWire();
    if (transientSegments && transientSegments.length > 0) {
      ctx.strokeStyle = '#00ff88'; // Active connection green preview
      ctx.lineWidth = Math.max(2.0, 2.0 * zoom);
      ctx.setLineDash([6 * zoom, 4 * zoom]);
      ctx.beginPath();
      let first = true;
      for (const segment of transientSegments) {
        const screenStart = canvasEngine.worldToScreen(segment.start);
        const screenEnd = canvasEngine.worldToScreen(segment.end);
        if (first) {
          ctx.moveTo(screenStart.x, screenStart.y);
          first = false;
        }
        ctx.lineTo(screenEnd.x, screenEnd.y);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Restore default stroke style
    }

    // 6. Draw drag selection box
    if (toolSystem && typeof (toolSystem as any).getDragSelectionRect === 'function') {
      const rect = (toolSystem as any).getDragSelectionRect();
      if (rect) {
        const screenPos = canvasEngine.worldToScreen({ x: rect.x, y: rect.y });
        ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.fillRect(screenPos.x, screenPos.y, rect.width * zoom, rect.height * zoom);
        ctx.strokeRect(screenPos.x, screenPos.y, rect.width * zoom, rect.height * zoom);
      }
    }
  }

  private renderComponent(
    ctx: CanvasRenderingContext2D,
    component: SemanticObject,
    canvasEngine: CanvasEngine,
    selectionEngine?: SelectionEngine,
    toolSystem?: ToolSystem
  ): void {
    // 1. Handle transient drag coordinates (UX-007)
    let compX = component.properties.x ?? 0;
    let compY = component.properties.y ?? 0;

    const dragInfo = toolSystem?.getDraggingState();
    if (dragInfo && dragInfo.id === component.id) {
      compX = dragInfo.x;
      compY = dragInfo.y;
    }

    // Create a temporary object with current coordinates for correct rendering
    const compToRender: SemanticObject = {
      ...component,
      properties: {
        ...component.properties,
        x: compX,
        y: compY,
      },
    };

    const bounds = this.geometryEngine.getComponentBounds(compToRender);
    const screenTopLeft = canvasEngine.worldToScreen({ x: bounds.x, y: bounds.y });
    const zoom = canvasEngine.getViewportState().zoom;
    const screenWidth = bounds.width * zoom;
    const screenHeight = bounds.height * zoom;

    // Fetch symbol definition to render custom graphics if they exist
    const symDef = getSymbol(compToRender.type);
    const variant = symDef?.variants[0];

    if (variant && variant.graphics && variant.graphics.length > 0) {
      for (const g of variant.graphics) {
        ctx.save();
        ctx.translate(screenTopLeft.x + g.transform.x * zoom, screenTopLeft.y + g.transform.y * zoom);
        ctx.rotate(g.transform.rotation * Math.PI / 180);

        ctx.lineWidth = Math.max(1, ('lineWidth' in g ? (g as any).lineWidth : 2) * zoom || 2 * zoom);
        ctx.strokeStyle = (g as any).color || '#ffffff';
        ctx.fillStyle = (g as any).fill || 'transparent';

        ctx.beginPath();
        if (g.kind === 'line') {
          ctx.moveTo(g.x1 * zoom, g.y1 * zoom);
          ctx.lineTo(g.x2 * zoom, g.y2 * zoom);
        } else if (g.kind === 'rect') {
          ctx.rect(0, 0, g.width * zoom, g.height * zoom);
        } else if (g.kind === 'circle') {
          ctx.arc(0, 0, g.radius * zoom, 0, Math.PI * 2);
        } else if (g.kind === 'arc') {
          ctx.arc(0, 0, g.radius * zoom, g.startAngle * Math.PI / 180, g.endAngle * Math.PI / 180);
        } else if (g.kind === 'polyline') {
          if (g.points.length > 0) {
            ctx.moveTo(g.points[0].x * zoom, g.points[0].y * zoom);
            for (let i = 1; i < g.points.length; i++) {
              ctx.lineTo(g.points[i].x * zoom, g.points[i].y * zoom);
            }
          }
        }

        if ((g as any).fill && (g as any).fill !== 'transparent') ctx.fill();
        ctx.stroke();

        if (g.kind === 'text') {
          ctx.fillStyle = (g as any).color || '#ffffff';
          ctx.font = `${Math.max(7, g.fontSize * zoom)}px "Inter", "Segoe UI", sans-serif`;
          ctx.textAlign = g.alignment as CanvasTextAlign;
          ctx.textBaseline = 'middle';
          ctx.fillText(g.text, 0, 0);
        }

        ctx.restore();
      }
    } else {
      // TINC Visual Component Standard (TVCS) rendering
      ctx.save();

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8 * zoom;
      ctx.shadowOffsetY = 4 * zoom;

      // Card Body
      ctx.fillStyle = '#282a36'; // TVCS Surface Color var(--bg-surface)
      ctx.beginPath();
      ctx.roundRect(screenTopLeft.x, screenTopLeft.y, screenWidth, screenHeight, 4 * zoom);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Header Area (Top 30% or so)
      ctx.fillStyle = '#44475a'; // var(--border)
      ctx.beginPath();
      ctx.roundRect(screenTopLeft.x, screenTopLeft.y, screenWidth, 32 * zoom, [4 * zoom, 4 * zoom, 0, 0]);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = '#6272a4'; // var(--text-secondary)
      ctx.lineWidth = Math.max(1, 1.5 * zoom);
      ctx.beginPath();
      ctx.roundRect(screenTopLeft.x, screenTopLeft.y, screenWidth, screenHeight, 4 * zoom);
      ctx.stroke();

      // Selection Highlight Overlay
      const isSelected = selectionEngine?.isSelected(component.id) ?? false;
      if (isSelected) {
        ctx.strokeStyle = '#bd93f9'; // TVCS Active/Selected Color var(--accent)
        ctx.lineWidth = Math.max(2, 3 * zoom);
        ctx.strokeRect(screenTopLeft.x, screenTopLeft.y, screenWidth, screenHeight);
      }

      // Component name label (Typography: Inter)
      ctx.fillStyle = '#f8f8f2'; // TVCS High Contrast Text var(--text-primary)
      ctx.font = `600 ${Math.max(9, 12 * zoom)}px "Inter", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(compToRender.name, screenTopLeft.x + screenWidth / 2, screenTopLeft.y + 8 * zoom);

      // Component type subtitle
      ctx.fillStyle = '#8be9fd'; // TVCS Accent Text
      ctx.font = `400 ${Math.max(7, 9 * zoom)}px "Inter", "Segoe UI", sans-serif`;
      ctx.fillText(compToRender.type, screenTopLeft.x + screenWidth / 2, screenTopLeft.y + 40 * zoom);
      
      ctx.restore();
    }

    // Render Pin and Port terminal hubs
    const allTerminals = [
      ...compToRender.ports.map((p) => ({ id: p.id, name: p.name })),
      ...compToRender.pins.map((p) => ({ id: p.id, name: p.name })),
    ];

    const size = COMPONENT_SIZES[compToRender.type] || { width: 100, height: 80 };

    for (const terminal of allTerminals) {
      const worldCoord = this.geometryEngine.getTerminalWorldCoordinate(compToRender, terminal.id);
      const screenCoord = canvasEngine.worldToScreen(worldCoord);

      // Terminal snap hover highlight overlay (UX-008)
      const hoverInfo = toolSystem?.getHoveredTerminal();
      const isHovered = hoverInfo && hoverInfo.componentId === component.id && hoverInfo.terminalId === terminal.id;

      if (isHovered) {
        let highlightColor = '#00ff88'; // Default hover green
        const valState = toolSystem?.getLiveValidationState();
        if (valState && valState.hoveredTerminalId === terminal.id) {
          const highlighter = new ConnectionHighlighter();
          highlightColor = highlighter.getColorForStatus(valState.status) || highlightColor;
        }

        ctx.fillStyle = highlightColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
        ctx.beginPath();
        ctx.arc(screenCoord.x, screenCoord.y, Math.max(4.5, 6.0 * zoom), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Standard terminal marker center circle
        ctx.fillStyle = '#e86a10'; // Vibrant connection orange
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 1.5 * zoom);
        ctx.beginPath();
        ctx.arc(screenCoord.x, screenCoord.y, Math.max(2.5, 3.5 * zoom), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Determine text alignments based on offset position
      const local = this.geometryEngine.getTerminalLocalCoordinate(compToRender.type, terminal.id);

      let textAlign: CanvasTextAlign = 'center';
      let offsetX = 0;
      let offsetY = 0;

      if (local.x === 0) {
        textAlign = 'left';
        offsetX = 8 * zoom;
      } else if (local.x === size.width) {
        textAlign = 'right';
        offsetX = -8 * zoom;
      } else if (local.y === 0) {
        textAlign = 'center';
        offsetY = 10 * zoom;
      } else {
        textAlign = 'center';
        offsetY = -10 * zoom;
      }

      ctx.fillStyle = '#9aa0a6';
      ctx.font = `500 ${Math.max(7, 8 * zoom)}px monospace`;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';
      ctx.fillText(terminal.name, screenCoord.x + offsetX, screenCoord.y + offsetY);
    }
  }
}
