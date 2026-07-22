/**
 * Physical Design Platform — Project Integration
 * PART 12: Integration with Project System, Explorer, Property Inspector, Library, AI
 */

import { BoardDocument, PhysicalObject, FootprintInstance, PhysicalLayer } from './types';
import { BoardManager } from './board';

// ── Explorer Integration ──────────────────────────────────────────────────────

export interface PhysicalDesignExplorerNode {
  id: string;
  label: string;
  kind: 'board' | 'layer-group' | 'layer' | 'footprint' | 'zone' | 'section';
  icon?: string;
  children?: PhysicalDesignExplorerNode[];
  boardId?: string;
  layerId?: string;
  objectId?: string;
  visible?: boolean;
  locked?: boolean;
  count?: number;
}

export function buildExplorerTree(board: BoardDocument): PhysicalDesignExplorerNode {
  const layerNodes: PhysicalDesignExplorerNode[] = board.layers.map((layer) => {
    const objectsOnLayer = board.objects.filter((o) => o.layerId === layer.id);
    return {
      id: `layer-${layer.id}`,
      label: layer.name,
      kind: 'layer',
      layerId: layer.id,
      boardId: board.id,
      visible: layer.visible,
      locked: layer.locked,
      count: objectsOnLayer.length,
    };
  });

  const fpNodes: PhysicalDesignExplorerNode[] = board.footprints.map((fp) => ({
    id: `fp-${fp.id}`,
    label: `${fp.reference} (${fp.value})`,
    kind: 'footprint',
    objectId: fp.id,
    boardId: board.id,
  }));

  return {
    id: `board-${board.id}`,
    label: board.name,
    kind: 'board',
    boardId: board.id,
    children: [
      {
        id: `${board.id}-layers`,
        label: 'Layers',
        kind: 'section',
        children: layerNodes,
        count: layerNodes.length,
      },
      {
        id: `${board.id}-footprints`,
        label: 'Footprints',
        kind: 'section',
        children: fpNodes,
        count: fpNodes.length,
      },
    ],
  };
}

// ── Property Inspector Integration ───────────────────────────────────────────

export type PropertyValue = string | number | boolean | null;

export interface PhysicalPropertyGroup {
  name: string;
  properties: PhysicalPropertyEntry[];
}

export interface PhysicalPropertyEntry {
  key: string;
  label: string;
  value: PropertyValue;
  type: 'string' | 'number' | 'boolean' | 'color' | 'unit' | 'enum';
  editable: boolean;
  unit?: string;
  options?: string[];
}

export function getObjectProperties(obj: PhysicalObject): PhysicalPropertyGroup[] {
  const baseProps: PhysicalPropertyEntry[] = [
    { key: 'id', label: 'ID', value: obj.id, type: 'string', editable: false },
    { key: 'kind', label: 'Kind', value: obj.kind, type: 'string', editable: false },
    { key: 'layerId', label: 'Layer', value: obj.layerId, type: 'string', editable: true },
    { key: 'locked', label: 'Locked', value: obj.locked, type: 'boolean', editable: true },
    { key: 'visible', label: 'Visible', value: obj.visible, type: 'boolean', editable: true },
    { key: 'netId', label: 'Net', value: obj.netId ?? null, type: 'string', editable: true },
  ];

  const groups: PhysicalPropertyGroup[] = [{ name: 'General', properties: baseProps }];

  switch (obj.kind) {
    case 'track': {
      groups.push({
        name: 'Track',
        properties: [
          { key: 'startX', label: 'Start X (nm)', value: obj.startX, type: 'number', editable: true, unit: 'nm' },
          { key: 'startY', label: 'Start Y (nm)', value: obj.startY, type: 'number', editable: true, unit: 'nm' },
          { key: 'endX', label: 'End X (nm)', value: obj.endX, type: 'number', editable: true, unit: 'nm' },
          { key: 'endY', label: 'End Y (nm)', value: obj.endY, type: 'number', editable: true, unit: 'nm' },
          { key: 'width', label: 'Width (nm)', value: obj.width, type: 'number', editable: true, unit: 'nm' },
        ],
      });
      break;
    }
    case 'via': {
      groups.push({
        name: 'Via',
        properties: [
          { key: 'viaType', label: 'Type', value: obj.viaType, type: 'enum', editable: true, options: ['through', 'blind', 'buried', 'micro'] },
          { key: 'diameter', label: 'Diameter (nm)', value: obj.diameter, type: 'number', editable: true, unit: 'nm' },
          { key: 'drillDiameter', label: 'Drill (nm)', value: obj.drillDiameter, type: 'number', editable: true, unit: 'nm' },
        ],
      });
      break;
    }
    case 'pad': {
      groups.push({
        name: 'Pad',
        properties: [
          { key: 'padNumber', label: 'Pad #', value: obj.padNumber, type: 'string', editable: true },
          { key: 'padShape', label: 'Shape', value: obj.padShape, type: 'enum', editable: true, options: ['circle', 'oval', 'rect', 'roundrect'] },
          { key: 'padType', label: 'Type', value: obj.padType, type: 'enum', editable: true, options: ['smd', 'thru-hole', 'connect', 'np-thru-hole'] },
          { key: 'sizeX', label: 'Size X (nm)', value: obj.sizeX, type: 'number', editable: true, unit: 'nm' },
          { key: 'sizeY', label: 'Size Y (nm)', value: obj.sizeY, type: 'number', editable: true, unit: 'nm' },
        ],
      });
      break;
    }
    case 'text': {
      groups.push({
        name: 'Text',
        properties: [
          { key: 'text', label: 'Text', value: obj.text, type: 'string', editable: true },
          { key: 'textType', label: 'Type', value: obj.textType, type: 'string', editable: false },
          { key: 'fontSizeUm', label: 'Font Size (µm)', value: obj.fontSizeUm, type: 'number', editable: true },
          { key: 'bold', label: 'Bold', value: obj.bold, type: 'boolean', editable: true },
          { key: 'italic', label: 'Italic', value: obj.italic, type: 'boolean', editable: true },
        ],
      });
      break;
    }
    default:
      break;
  }

  return groups;
}

export function getLayerProperties(layer: PhysicalLayer): PhysicalPropertyGroup[] {
  return [
    {
      name: 'Layer',
      properties: [
        { key: 'id', label: 'ID', value: layer.id, type: 'string', editable: false },
        { key: 'name', label: 'Name', value: layer.name, type: 'string', editable: true },
        { key: 'kind', label: 'Kind', value: layer.kind, type: 'string', editable: false },
        { key: 'side', label: 'Side', value: layer.side, type: 'string', editable: false },
        { key: 'color', label: 'Color', value: layer.color, type: 'color', editable: true },
        { key: 'opacity', label: 'Opacity', value: layer.opacity, type: 'number', editable: true },
        { key: 'visible', label: 'Visible', value: layer.visible, type: 'boolean', editable: true },
        { key: 'locked', label: 'Locked', value: layer.locked, type: 'boolean', editable: true },
        { key: 'order', label: 'Order', value: layer.order, type: 'number', editable: false },
      ],
    },
  ];
}

// ── AI Integration ────────────────────────────────────────────────────────────

export interface PhysicalDesignAIContext {
  boardSummary: string;
  layerCount: number;
  objectCount: number;
  footprintCount: number;
  stackupSummary: string;
  activeLayerName: string;
  ruleCount: number;
}

export function buildAIContext(board: BoardDocument): PhysicalDesignAIContext {
  const activeLayer = board.layers.find((l) => l.id === board.activeLayerId);
  return {
    boardSummary: `Board "${board.name}" (UUID: ${board.uuid})`,
    layerCount: board.layers.length,
    objectCount: board.objects.length,
    footprintCount: board.footprints.length,
    stackupSummary: `${board.stackup.copperLayers}-layer stackup, ${board.stackup.totalThicknessUm} µm total`,
    activeLayerName: activeLayer?.name ?? 'unknown',
    ruleCount: board.rules.length,
  };
}

// ── Project System Integration ────────────────────────────────────────────────

export interface PhysicalDocumentDescriptor {
  boardId: string;
  boardName: string;
  uuid: string;
  createdAt: string;
  modifiedAt: string;
  layerCount: number;
  objectCount: number;
  copperLayers: number;
  boardThicknessMm: number;
}

export function describeBoard(board: BoardDocument): PhysicalDocumentDescriptor {
  return {
    boardId: board.id,
    boardName: board.name,
    uuid: board.uuid,
    createdAt: board.createdAt,
    modifiedAt: board.modifiedAt,
    layerCount: board.layers.length,
    objectCount: board.objects.length,
    copperLayers: board.stackup.copperLayers,
    boardThicknessMm: board.stackup.totalThicknessUm / 1000,
  };
}

// ── Library Integration ───────────────────────────────────────────────────────

export interface FootprintLibraryEntry {
  id: string;
  libraryId: string;
  name: string;
  description: string;
  tags: string[];
  padCount: number;
  boundingBoxMm: { width: number; height: number };
}

export function describeFootprintLibrary(entries: FootprintLibraryEntry[]): string {
  return entries
    .map((e) => `${e.libraryId}:${e.name} (${e.padCount} pads, ${e.boundingBoxMm.width}x${e.boundingBoxMm.height} mm)`)
    .join('\n');
}
