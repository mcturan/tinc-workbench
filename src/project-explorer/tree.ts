import { ObjectEngine } from '../object-engine';
import { ExplorerNode } from './types';
import { ExplorerSearch } from './search';
import { listLabels, listSignals } from '../net-labels';
import { listBuses } from '../pro-schematic/bus/manager';
import { listConnectors } from '../pro-schematic/connectors/manager';
import { listAnnotations } from '../pro-schematic/annotation/manager';
import { listNetClasses } from '../pro-schematic/netclass/manager';

export class ExplorerTreeBuilder {
  private expandedStates = new Map<string, boolean>();
  private searchHelper = new ExplorerSearch();

  setExpanded(id: string, isExpanded: boolean): void {
    this.expandedStates.set(id, isExpanded);
  }

  isExpanded(id: string): boolean {
    if (this.expandedStates.has(id)) {
      return this.expandedStates.get(id)!;
    }
    return true; // default to expanded
  }

  buildTree(
    objectEngine: ObjectEngine,
    selectedIds: string[],
    searchQuery: string = '',
    boardManager?: any
  ): ExplorerNode {
    const project = objectEngine.getProject();
    const selectedSet = new Set(selectedIds);

    const rootNode: ExplorerNode = {
      id: project.id,
      name: project.name || 'Project',
      type: 'project',
      icon: '📁',
      parentId: null,
      children: [],
      isExpanded: this.isExpanded(project.id),
      isSelected: selectedIds.includes(project.id),
    };

    // --- LOGICAL SECTIONS ---
    const designNode = this.createLogicalFolder('logical-design', 'Design', '📐', project.id);
    const buildNode = this.createLogicalFolder('logical-build', 'Build', '🔨', project.id);
    const workshopNode = this.createLogicalFolder('logical-workshop', 'Workshop', '🛠️', project.id);
    const intelligenceNode = this.createLogicalFolder('logical-intelligence', 'Intelligence', '🧠', project.id);
    const docsNode = this.createLogicalFolder('logical-documentation', 'Documentation', '📚', project.id);

    // --- DESIGN ---
    const schematicsNode = this.createCategoryFolder('design-schematics', 'Schematics', '📄', designNode.id);
    const symbolsNode = this.createCategoryFolder('design-symbols', 'Symbols', '🧩', designNode.id);
    const footprintsNode = this.createCategoryFolder('design-footprints', 'Footprints', '👣', designNode.id);
    const pcbNode = this.createCategoryFolder('design-pcb', 'PCB', '🔲', designNode.id);

    // Populate Schematics
    for (const page of project.pages) {
      if (searchQuery && !page.name.toLowerCase().includes(searchQuery.toLowerCase()) && !this.pageHasMatches(page, searchQuery, objectEngine)) {
        continue;
      }

      const sheetNode: ExplorerNode = {
        id: page.id,
        name: page.name || 'Sheet',
        type: 'sheet',
        icon: '📄',
        parentId: schematicsNode.id,
        children: [],
        isExpanded: this.isExpanded(page.id),
        isSelected: selectedSet.has(page.id),
      };

      // Extract components and wires from the page
      for (const layer of page.layers) {
        for (const comp of layer.objects) {
          if (searchQuery && !this.searchHelper.matchesComponent(comp, searchQuery)) continue;
          sheetNode.children.push({
            id: comp.id,
            name: comp.name || comp.type,
            type: 'component',
            icon: '🎛️',
            parentId: page.id,
            children: [],
            isExpanded: false,
            isSelected: selectedSet.has(comp.id),
          });
        }
      }

      const wires = objectEngine.getWires();
      for (const wire of wires) {
        if (searchQuery && !this.searchHelper.matchesWire(wire, searchQuery)) continue;
        sheetNode.children.push({
          id: wire.id,
          name: `Wire (${wire.id.substring(0, 8)})`,
          type: 'wire',
          icon: '〰️',
          parentId: page.id,
          children: [],
          isExpanded: false,
          isSelected: selectedSet.has(wire.id),
        });
      }

      schematicsNode.children.push(sheetNode);
    }

    // Populate Global Signals, Buses, Connectors, NetClasses under Schematics for logical grouping
    const signals = listSignals();
    if (signals.length > 0) {
      const signalsFolder = this.createCategoryFolder('folder-global-signals', 'Global Signals', '⚡', schematicsNode.id);
      for (const sig of signals) {
        if (searchQuery && !sig.name.toLowerCase().includes(searchQuery.toLowerCase())) continue;
        signalsFolder.children.push({
          id: sig.name,
          name: `${sig.name} (${sig.scope})`,
          type: 'global-signal',
          icon: '⚡',
          parentId: signalsFolder.id,
          children: [],
          isExpanded: false,
          isSelected: selectedSet.has(sig.name),
        });
      }
      if (signalsFolder.children.length > 0) schematicsNode.children.push(signalsFolder);
    }

    const buses = listBuses();
    if (buses.length > 0) {
      const busesFolder = this.createCategoryFolder('folder-buses', 'Buses', '🚌', schematicsNode.id);
      for (const bus of buses) {
        if (searchQuery && !bus.name.toLowerCase().includes(searchQuery.toLowerCase())) continue;
        busesFolder.children.push({
          id: bus.id,
          name: bus.name,
          type: 'bus',
          icon: '🚌',
          parentId: busesFolder.id,
          children: [],
          isExpanded: false,
          isSelected: selectedSet.has(bus.id),
        });
      }
      if (busesFolder.children.length > 0) schematicsNode.children.push(busesFolder);
    }

    // Populate PCB if available
    if (boardManager) {
      const board = boardManager.getActiveBoard();
      if (board) {
        const boardNode: ExplorerNode = {
          id: board.id,
          name: board.name || 'PCB Layout',
          type: 'board',
          icon: '🔲',
          parentId: pcbNode.id,
          children: [],
          isExpanded: this.isExpanded(board.id),
          isSelected: selectedSet.has(board.id),
        };
        const layersFolder: ExplorerNode = {
          id: `layers-${board.id}`,
          name: `Layers (${board.layers.length})`,
          type: 'category-folder',
          icon: '📁',
          parentId: board.id,
          children: board.layers.map((layer: any) => ({
            id: layer.id,
            name: `${layer.name} (${layer.kind})`,
            type: 'layer',
            icon: '🥞',
            parentId: `layers-${board.id}`,
            children: [],
            isExpanded: false,
            isSelected: selectedSet.has(layer.id),
          })),
          isExpanded: this.isExpanded(`layers-${board.id}`),
          isSelected: false,
        };
        boardNode.children.push(layersFolder);

        const footprintsFolder: ExplorerNode = {
          id: `footprints-${board.id}`,
          name: `Footprints (${board.footprints.length})`,
          type: 'category-folder',
          icon: '📁',
          parentId: board.id,
          children: board.footprints.map((fp: any) => ({
            id: fp.id,
            name: `${fp.reference} (${fp.value})`,
            type: 'footprint',
            icon: '🎛️',
            parentId: `footprints-${board.id}`,
            children: [],
            isExpanded: false,
            isSelected: selectedSet.has(fp.id),
          })),
          isExpanded: this.isExpanded(`footprints-${board.id}`),
          isSelected: false,
        };
        boardNode.children.push(footprintsFolder);

        const tracks = board.objects.filter((o: any) => o.kind === 'track');
        if (tracks.length > 0) {
          const tracksFolder: ExplorerNode = {
            id: `tracks-${board.id}`,
            name: `Tracks (${tracks.length})`,
            type: 'category-folder',
            icon: '📁',
            parentId: board.id,
            children: tracks.map((t: any) => ({
              id: t.id,
              name: `Track (${t.width}nm, ${t.netId || 'No Net'})`,
              type: 'track',
              icon: '〰️',
              parentId: `tracks-${board.id}`,
              children: [],
              isExpanded: false,
              isSelected: selectedSet.has(t.id),
            })),
            isExpanded: this.isExpanded(`tracks-${board.id}`),
            isSelected: false,
          };
          boardNode.children.push(tracksFolder);
        }

        const vias = board.objects.filter((o: any) => o.kind === 'via');
        if (vias.length > 0) {
          const viasFolder: ExplorerNode = {
            id: `vias-${board.id}`,
            name: `Vias (${vias.length})`,
            type: 'category-folder',
            icon: '📁',
            parentId: board.id,
            children: vias.map((v: any) => ({
              id: v.id,
              name: `${v.viaType.toUpperCase()} Via (${v.diameter}/${v.drillDiameter}nm)`,
              type: 'via',
              icon: '🕳️',
              parentId: `vias-${board.id}`,
              children: [],
              isExpanded: false,
              isSelected: selectedSet.has(v.id),
            })),
            isExpanded: this.isExpanded(`vias-${board.id}`),
            isSelected: false,
          };
          boardNode.children.push(viasFolder);
        }

        const zones = board.objects.filter((o: any) => o.kind === 'zone');
        if (zones.length > 0) {
          const zonesFolder: ExplorerNode = {
            id: `zones-${board.id}`,
            name: `Zones (${zones.length})`,
            type: 'category-folder',
            icon: '📁',
            parentId: board.id,
            children: zones.map((z: any) => ({
              id: z.id,
              name: `${z.zoneType} Zone (${z.netId || 'No Net'})`,
              type: 'zone',
              icon: '🗺️',
              parentId: `zones-${board.id}`,
              children: [],
              isExpanded: false,
              isSelected: selectedSet.has(z.id),
            })),
            isExpanded: this.isExpanded(`zones-${board.id}`),
            isSelected: false,
          };
          boardNode.children.push(zonesFolder);
        }

        pcbNode.children.push(boardNode);
      }
    }

    designNode.children.push(schematicsNode, symbolsNode, footprintsNode, pcbNode);

    // --- BUILD ---
    const deviceWorkspaceNode = this.createCategoryFolder('build-device-workspace', 'Device Workspace', '🖥️', buildNode.id);
    const breadboardsNode = this.createCategoryFolder('build-breadboards', 'Breadboards', '🧲', buildNode.id);
    const perfboardsNode = this.createCategoryFolder('build-perfboards', 'Perfboards', '🕳️', buildNode.id);
    const assembliesNode = this.createCategoryFolder('build-assemblies', 'Assemblies', '📦', buildNode.id);
    buildNode.children.push(deviceWorkspaceNode, breadboardsNode, perfboardsNode, assembliesNode);

    // --- WORKSHOP ---
    const inventoryNode = this.createCategoryFolder('workshop-inventory', 'Inventory', '📋', workshopNode.id);
    const storageNode = this.createCategoryFolder('workshop-storage', 'Storage', '🗄️', workshopNode.id);
    const componentsNode = this.createCategoryFolder('workshop-components', 'Components', '🎛️', workshopNode.id);
    workshopNode.children.push(inventoryNode, storageNode, componentsNode);

    // --- INTELLIGENCE ---
    const dashboardNode: ExplorerNode = { id: 'intel-dashboard', name: 'Dashboard', type: 'document', icon: '📊', parentId: intelligenceNode.id, children: [], isExpanded: false, isSelected: selectedSet.has('intel-dashboard') };
    const healthNode: ExplorerNode = { id: 'intel-health', name: 'Health', type: 'document', icon: '❤️', parentId: intelligenceNode.id, children: [], isExpanded: false, isSelected: selectedSet.has('intel-health') };
    const statsNode: ExplorerNode = { id: 'intel-statistics', name: 'Statistics', type: 'document', icon: '📈', parentId: intelligenceNode.id, children: [], isExpanded: false, isSelected: selectedSet.has('intel-statistics') };
    intelligenceNode.children.push(dashboardNode, healthNode, statsNode);

    // --- DOCUMENTATION ---
    const notesNode = this.createCategoryFolder('docs-notes', 'Notes', '📝', docsNode.id);
    const datasheetsNode = this.createCategoryFolder('docs-datasheets', 'Datasheets', '📑', docsNode.id);
    const imagesNode = this.createCategoryFolder('docs-images', 'Images', '🖼️', docsNode.id);
    docsNode.children.push(notesNode, datasheetsNode, imagesNode);

    // Append to root
    rootNode.children.push(designNode, buildNode, workshopNode, intelligenceNode, docsNode);

    return rootNode;
  }

  private createLogicalFolder(id: string, name: string, icon: string, parentId: string): ExplorerNode {
    return {
      id,
      name,
      type: 'logical-folder',
      icon,
      parentId,
      children: [],
      isExpanded: this.isExpanded(id),
      isSelected: false,
    };
  }

  private createCategoryFolder(id: string, name: string, icon: string, parentId: string): ExplorerNode {
    return {
      id,
      name,
      type: 'category-folder',
      icon,
      parentId,
      children: [],
      isExpanded: this.isExpanded(id),
      isSelected: false,
    };
  }

  private pageHasMatches(page: any, query: string, objectEngine: ObjectEngine): boolean {
    const q = query.toLowerCase();
    for (const layer of page.layers) {
      for (const comp of layer.objects) {
        if (this.searchHelper.matchesComponent(comp, query)) return true;
      }
    }
    const wires = objectEngine.getWires();
    for (const wire of wires) {
      if (this.searchHelper.matchesWire(wire, query)) return true;
    }
    return false;
  }
}
