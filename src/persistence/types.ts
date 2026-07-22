import { Project, Wire, LogicalConnection } from '../types';
import { ModuleDefinition, ModuleInstance } from '../hierarchy/types';
import { NetLabel } from '../net-labels/types';
import {
  Bus,
  BusEntry,
  BusTap,
  BusJunction,
  SchematicConnector,
  NoConnectMarker,
  AnnotationObject,
  Junction,
  NetClass
} from '../pro-schematic/types';
import { LibraryData } from '../library/import-export/interfaces';

export interface ProjectFileMetadata {
  projectName: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  applicationVersion: string;
}

export interface ProjectFileFormat {
  version: string;
  metadata: ProjectFileMetadata;
  project: Project;
  wires: Wire[];
  connections: LogicalConnection[];
  history?: any;
  modules?: ModuleDefinition[];
  moduleInstances?: ModuleInstance[];
  labels?: NetLabel[];
  buses?: Bus[];
  busEntries?: BusEntry[];
  busTaps?: BusTap[];
  busJunctions?: BusJunction[];
  connectors?: SchematicConnector[];
  noConnectMarkers?: NoConnectMarker[];
  annotations?: AnnotationObject[];
  junctions?: Junction[];
  netClasses?: NetClass[];
  library?: LibraryData;
  workshop?: any;
}

export interface PersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
