import { ObjectEngine } from '../object-engine';
import { CanvasEngine } from '../canvas-engine';
import { GeometryEngine, COMPONENT_SIZES } from '../geometry-engine';
import { Page, SemanticObject } from '../types';

export class RenderingEngine {
  constructor(private geometryEngine: GeometryEngine) {}

  render(
    ctx: CanvasRenderingContext2D,
    objectEngine: ObjectEngine,
    canvasEngine: CanvasEngine,
    activePageId: string
  ): void {
    const page = objectEngine.getObject(activePageId) as Page;
    if (!page) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    canvasEngine.setViewportDimensions(width, height);

    // 1. Draw workspace background
    ctx.fillStyle = '#18191e'; // Sleek dark slate background
    ctx.fillRect(0, 0, width, height);

    // 2. Draw infinite dot grid
    const gridSpacing = 20;

    const topLeft = canvasEngine.screenToWorld({ x: 0, y: 0 });
    const bottomRight = canvasEngine.screenToWorld({ x: width, y: height });

    const startX = Math.floor(topLeft.x / gridSpacing) * gridSpacing;
    const startY = Math.floor(topLeft.y / gridSpacing) * gridSpacing;
    const endX = Math.ceil(bottomRight.x / gridSpacing) * gridSpacing;
    const endY = Math.ceil(bottomRight.y / gridSpacing) * gridSpacing;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let x = startX; x <= endX; x += gridSpacing) {
      for (let y = startY; y <= endY; y += gridSpacing) {
        const screenPt = canvasEngine.worldToScreen({ x, y });
        ctx.fillRect(screenPt.x - 1, screenPt.y - 1, 2, 2);
      }
    }

    // 3. Draw placed components
    for (const layer of page.layers) {
      if (!layer.visible) continue;
      for (const component of layer.objects) {
        this.renderComponent(ctx, component, canvasEngine);
      }
    }
  }

  private renderComponent(
    ctx: CanvasRenderingContext2D,
    component: SemanticObject,
    canvasEngine: CanvasEngine
  ): void {
    const bounds = this.geometryEngine.getComponentBounds(component);
    const screenTopLeft = canvasEngine.worldToScreen({ x: bounds.x, y: bounds.y });
    const zoom = canvasEngine.getViewportState().zoom;
    const screenWidth = bounds.width * zoom;
    const screenHeight = bounds.height * zoom;

    // Visual card outline and body
    ctx.fillStyle = '#21232b'; // Dark contrast element background
    ctx.strokeStyle = '#434756'; // Subtle border outline
    ctx.lineWidth = Math.max(1, 2 * zoom);

    ctx.beginPath();
    ctx.rect(screenTopLeft.x, screenTopLeft.y, screenWidth, screenHeight);
    ctx.fill();
    ctx.stroke();

    // Component name label
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.max(9, 11 * zoom)}px "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(component.name, screenTopLeft.x + screenWidth / 2, screenTopLeft.y + 12 * zoom);

    // Component type subtitle
    ctx.fillStyle = '#7a7e8b';
    ctx.font = `${Math.max(7, 8 * zoom)}px "Inter", "Segoe UI", sans-serif`;
    ctx.fillText(`(${component.type})`, screenTopLeft.x + screenWidth / 2, screenTopLeft.y + 26 * zoom);

    // Render Pin and Port terminal hubs
    const allTerminals = [
      ...component.ports.map((p) => ({ id: p.id, name: p.name })),
      ...component.pins.map((p) => ({ id: p.id, name: p.name })),
    ];

    const size = COMPONENT_SIZES[component.type] || { width: 100, height: 80 };

    for (const terminal of allTerminals) {
      const worldCoord = this.geometryEngine.getTerminalWorldCoordinate(component, terminal.id);
      const screenCoord = canvasEngine.worldToScreen(worldCoord);

      // Terminal marker center circle
      ctx.fillStyle = '#e86a10'; // Vibrant connection orange
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 1.5 * zoom);
      ctx.beginPath();
      ctx.arc(screenCoord.x, screenCoord.y, Math.max(2.5, 3.5 * zoom), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Determine text alignments based on offset position
      const local = this.geometryEngine.getTerminalLocalCoordinate(component.type, terminal.id);

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
