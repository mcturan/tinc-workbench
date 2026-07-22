import { ObjectEngine } from '../object-engine';
import { SelectionEngine } from '../selection-engine';
import { CanvasEngine } from '../canvas-engine';
import { GeometryEngine } from '../geometry-engine';
import { ExplorerTreeBuilder } from './tree';
import { ExplorerRenderer } from './renderer';
import { ExplorerController } from './controller';
import { Panel } from '../ui/components/panel';

export class ProjectExplorer {
  private treeBuilder = new ExplorerTreeBuilder();
  private renderer = new ExplorerRenderer();
  private controller: ExplorerController;
  private selectedIds: string[] = [];
  private searchQuery: string = '';
  private isVisible = true;
  private onSelectionChangedCb: ((ids: string[]) => void) | null = null;
  public panel: Panel;

  constructor(
    private parent: HTMLElement,
    private objectEngine: ObjectEngine,
    private selectionEngine: SelectionEngine,
    private canvasEngine: CanvasEngine,
    private geometryEngine: GeometryEngine,
    private boardManager?: any
  ) {
    this.panel = new Panel('Project Explorer');
    this.parent.appendChild(this.panel.element);
    this.controller = new ExplorerController(
      objectEngine,
      selectionEngine,
      canvasEngine,
      geometryEngine,
      (ids) => {
        this.selectedIds = [...ids];
        if (this.onSelectionChangedCb) {
          this.onSelectionChangedCb(ids);
        }
        this.refresh();
      }
    );
  }

  show(): void {
    this.isVisible = true;
    this.panel.element.style.display = 'flex';
  }

  hide(): void {
    this.isVisible = false;
    this.panel.element.style.display = 'none';
  }

  onSelectionChanged(cb: (ids: string[]) => void): void {
    this.onSelectionChangedCb = cb;
  }

  refresh(): void {
    if (!this.isVisible) return;

    const rootNode = this.treeBuilder.buildTree(
      this.objectEngine,
      this.selectedIds,
      this.searchQuery,
      this.boardManager
    );

    this.renderer.render(
      this.panel.content,
      rootNode,
      (id, type) => this.controller.handleNodeClick(id, type),
      (id, type) => this.controller.handleNodeDblClick(id, type),
      (id, currentExpand) => {
        this.treeBuilder.setExpanded(id, !currentExpand);
        this.refresh();
      },
      (e, id, type) => {
        // Future context menu implementation
      },
      (sourceId, targetId) => {
        // Basic drag and drop check, currently we just prevent invalid moves implicitly
        console.log(`Dropped ${sourceId} onto ${targetId}`);
      }
    );
  }

  setProject(objectEngine: ObjectEngine): void {
    this.objectEngine = objectEngine;
    this.controller = new ExplorerController(
      objectEngine,
      this.selectionEngine,
      this.canvasEngine,
      this.geometryEngine,
      (ids) => {
        this.selectedIds = [...ids];
        if (this.onSelectionChangedCb) {
          this.onSelectionChangedCb(ids);
        }
        this.refresh();
      }
    );
    this.refresh();
  }

  setSelection(selectedIds: string[]): void {
    this.selectedIds = [...selectedIds];
    this.refresh();
  }

  setBoardManager(bm: any): void {
    this.boardManager = bm;
    this.refresh();
  }

  clear(): void {
    this.selectedIds = [];
    this.searchQuery = '';
    this.refresh();
  }

  focusObject(objId: string, canvasEngine?: CanvasEngine): void {
    this.controller.focusObject(objId, canvasEngine);
  }

  search(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }
}
