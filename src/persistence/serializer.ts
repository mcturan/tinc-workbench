import { ObjectEngine } from '../object-engine';
import { ProjectFileFormat, ProjectFileMetadata } from './types';
import { CANONICAL_VERSION } from './project-format';
import { listModules, listInstances } from '../hierarchy';
import { listLabels } from '../net-labels';
import { listBuses, listBusEntries, listBusTaps, listBusJunctions } from '../pro-schematic/bus/manager';
import { listConnectors, listNoConnectMarkers } from '../pro-schematic/connectors/manager';
import { listAnnotations } from '../pro-schematic/annotation/manager';
import { listJunctions } from '../pro-schematic/junction/engine';
import { listNetClasses } from '../pro-schematic/netclass/manager';
import { createLibrarySnapshot } from '../library/storage';
import { globalWorkshopManager } from '../workshop-manager';

export class PersistenceSerializer {
  serialize(
    objectEngine: ObjectEngine,
    metadataOverrides?: Partial<ProjectFileMetadata>
  ): string {
    const project = objectEngine.getProject();
    const connections = objectEngine.getConnections();
    const wires = objectEngine.getWires();

    const metadata: ProjectFileMetadata = {
      projectName: project.name || 'Untitled Project',
      author: 'Unknown Author',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      applicationVersion: '1.0.0',
      ...metadataOverrides,
    };

    const fileFormat: ProjectFileFormat = {
      version: CANONICAL_VERSION,
      metadata,
      project,
      wires,
      connections,
      modules: listModules(),
      moduleInstances: listInstances(),
      labels: listLabels(),
      buses: listBuses(),
      busEntries: listBusEntries(),
      busTaps: listBusTaps(),
      busJunctions: listBusJunctions(),
      connectors: listConnectors(),
      noConnectMarkers: listNoConnectMarkers(),
      annotations: listAnnotations(),
      junctions: listJunctions(),
      netClasses: listNetClasses(),
      library: createLibrarySnapshot().library,
      workshop: globalWorkshopManager.getState(),
    };

    return JSON.stringify(fileFormat, null, 2);
  }
}
