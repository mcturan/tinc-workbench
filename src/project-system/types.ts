/**
 * Project System — Core Type Definitions
 *
 * All types used by the Project System module.
 * These are additive — they do not replace any existing domain types.
 */

// ── Project Status ────────────────────────────────────────────────────────────

export type ProjectStatus = 'draft' | 'in-review' | 'released' | 'archived' | 'deprecated';

// ── Project Metadata ──────────────────────────────────────────────────────────

export interface ProjectMetadata {
  uuid: string;           // RFC 4122
  name: string;
  description: string;
  author: string;
  company: string;
  version: string;        // semver e.g. "1.2.3"
  revision: number;       // monotonically increasing integer
  status: ProjectStatus;
  createdAt: string;      // ISO 8601
  modifiedAt: string;     // ISO 8601
  tags: string[];
  customFields: Record<string, string>;
}

// ── Settings Types ────────────────────────────────────────────────────────────

export type LengthUnit = 'mm' | 'mil' | 'inch' | 'cm';
export type AngleUnit = 'deg' | 'rad';
export type GridStyle = 'dots' | 'lines' | 'none';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface GridSettings {
  size: number;
  unit: LengthUnit;
  style: GridStyle;
  visible: boolean;
}

export interface SnapSettings {
  enabled: boolean;
  threshold: number;          // in pixels
  snapToGrid: boolean;
  snapToPins: boolean;
  snapToComponents: boolean;
}

export interface PageDefaults {
  width: number;
  height: number;
  unit: LengthUnit;
  orientation: 'portrait' | 'landscape';
  borderStyle: string;
  titleBlock: boolean;
}

export interface AnnotationRules {
  prefix: string;
  startNumber: number;
  scope: 'page' | 'project';
  resetOnNewPage: boolean;
  hierarchicalSeparator: string;
}

export interface ERCOptions {
  runOnSave: boolean;
  runOnExport: boolean;
  severity: Record<string, 'error' | 'warning' | 'info'>;
  ignoredRules: string[];
}

export interface LibraryPreferences {
  searchPaths: string[];
  defaultSymbolLib: string;
  defaultFootprintLib: string;
  preferredVendors: string[];
}

export interface NetNamingPreferences {
  autoNameNets: boolean;
  netPrefix: string;
  powerNetPrefix: string;
  busExpansionSeparator: string;
}

export interface ProjectSettings {
  units: LengthUnit;
  angleUnit: AngleUnit;
  grid: GridSettings;
  snap: SnapSettings;
  theme: ThemePreference;
  pageDefaults: PageDefaults;
  annotationRules: AnnotationRules;
  ercOptions: ERCOptions;
  libraryPreferences: LibraryPreferences;
  netNamingPreferences: NetNamingPreferences;
  ruleProfileId?: string; // Links to RuleProfile.id
  customSettings: Record<string, any>;
}

// ── Document Management ───────────────────────────────────────────────────────

export type DocumentKind = 'schematic' | 'hierarchical-sheet' | 'pcb' | 'simulation' | 'bom' | 'unknown';
export type DocumentState = 'closed' | 'open' | 'modified' | 'readonly';

export interface DocumentMetadata {
  id: string;
  kind: DocumentKind;
  title: string;
  description: string;
  createdAt: string;
  modifiedAt: string;
  version: number;
  path: string;
  pageId?: string;        // Links to ObjectEngine Page
  readonly: boolean;
  dirty: boolean;
  state: DocumentState;
  tags: string[];
}

// ── Project Assets ────────────────────────────────────────────────────────────

export type AssetKind = 'image' | 'logo' | 'pdf' | 'datasheet-ref' | 'custom-symbol' | 'resource';

export interface ProjectAsset {
  id: string;
  kind: AssetKind;
  name: string;
  description: string;
  path: string;
  mimeType: string;
  fileSize?: number;
  hash?: string;
  linkedDocumentIds: string[];
  createdAt: string;
  tags: string[];
}

// ── Dependency Graph ──────────────────────────────────────────────────────────

export type DependencyKind =
  | 'sheet-ref'
  | 'hierarchy'
  | 'symbol-dep'
  | 'library-dep'
  | 'asset-dep'
  | 'net-ref';

export interface ProjectDependency {
  id: string;
  kind: DependencyKind;
  sourceId: string;
  targetId: string;
  label?: string;
  resolved: boolean;
}

export interface DependencyDiagnostic {
  type: 'missing' | 'circular' | 'orphan';
  severity: 'error' | 'warning';
  message: string;
  involvedIds: string[];
}

// ── Annotation Framework ──────────────────────────────────────────────────────

export interface AnnotationEntry {
  id: string;
  reference: string;   // e.g. 'R1', 'U2'
  prefix: string;
  number: number;
  pageId?: string;
  documentId?: string;
  objectId?: string;
}

// ── Cross Reference ───────────────────────────────────────────────────────────

export interface CrossReference {
  objectId: string;
  reference: string;
  sheetNumber: string;
  pageId: string;
  documentId?: string;
  netIds: string[];
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ProjectValidationIssueType =
  | 'duplicate-reference'
  | 'duplicate-uuid'
  | 'missing-document'
  | 'broken-hierarchy'
  | 'missing-asset'
  | 'invalid-settings'
  | 'orphan-dependency'
  | 'circular-dependency';

export interface ProjectValidationIssue {
  type: ProjectValidationIssueType;
  severity: 'error' | 'warning' | 'info';
  message: string;
  targetId?: string;
}

// ── Persistence Snapshot ──────────────────────────────────────────────────────

export interface ProjectSystemSnapshot {
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  documents: DocumentMetadata[];
  assets: ProjectAsset[];
  dependencies: ProjectDependency[];
  annotations: AnnotationEntry[];
}
