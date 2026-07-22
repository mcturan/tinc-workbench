import { ObjectEngine } from '../object-engine';
import { PersistenceValidator } from './validator';
import { clearModules, createModule, clearInstances, instantiateModule } from '../hierarchy';
import { clearLabels, createLabel } from '../net-labels';
import { clearBuses, createBus, createBusEntry, createBusTap, createBusJunction } from '../pro-schematic/bus/manager';
import { clearConnectors, createConnector, clearNoConnectMarkers, createNoConnectMarker } from '../pro-schematic/connectors/manager';
import { clearAnnotations, createAnnotation } from '../pro-schematic/annotation/manager';
import { clearJunctions, createJunction } from '../pro-schematic/junction/engine';
import { clearNetClasses, createNetClass, assignNetToClass } from '../pro-schematic/netclass/manager';
import { hydrateLibraryData } from '../library/storage';
import { globalWorkshopManager } from '../workshop-manager';

export class PersistenceDeserializer {
  private validator = new PersistenceValidator();

  deserialize(content: string, targetEngine: ObjectEngine): { success: boolean; error?: string } {
    const valResult = this.validator.validate(content);
    if (!valResult.isValid || !valResult.data) {
      return { success: false, error: valResult.error };
    }

    const data = valResult.data;
    try {
      if (data.library) {
        hydrateLibraryData(data.library);
      }
      if (data.workshop) {
        globalWorkshopManager.loadState(data.workshop);
      }

      targetEngine.loadProjectGraph(data.project, data.connections, data.wires);

      clearModules();
      if (data.modules) {
        for (const m of data.modules) {
          createModule(m.id, m.name, m.description, m.version, m.ports, m.schematic, m.metadata);
        }
      }

      clearInstances();
      if (data.moduleInstances) {
        for (const inst of data.moduleInstances) {
          instantiateModule(inst.id, inst.moduleId, inst.parentInstanceId, inst.name, inst.properties, inst.transform);
        }
      }

      clearLabels();
      if (data.labels) {
        for (const l of data.labels) {
          createLabel(l.id, l.name, l.scope, l.position, l.targetObjectId, l.targetPinId, l.metadata);
        }
      }

      clearBuses();
      if (data.buses) {
        for (const b of data.buses) {
          createBus(b.id, b.name, b.segments, b.metadata);
        }
      }

      if (data.busEntries) {
        for (const e of data.busEntries) {
          createBusEntry(e.id, e.busId, e.netName, e.position, e.angle);
        }
      }

      if (data.busTaps) {
        for (const t of data.busTaps) {
          createBusTap(t.id, t.busId, t.netName, t.position);
        }
      }

      if (data.busJunctions) {
        for (const bj of data.busJunctions) {
          createBusJunction(bj.id, bj.busId, bj.position);
        }
      }

      clearConnectors();
      if (data.connectors) {
        for (const conn of data.connectors) {
          createConnector(conn.id, conn.name, conn.scope, conn.position, conn.targetObjectId, conn.targetPinId, conn.metadata);
        }
      }

      clearNoConnectMarkers();
      if (data.noConnectMarkers) {
        for (const nc of data.noConnectMarkers) {
          createNoConnectMarker(nc.id, nc.targetObjectId, nc.targetPinId, nc.position);
        }
      }

      clearAnnotations();
      if (data.annotations) {
        for (const anno of data.annotations) {
          createAnnotation(anno);
        }
      }

      clearJunctions();
      if (data.junctions) {
        for (const j of data.junctions) {
          createJunction(j);
        }
      }

      clearNetClasses();
      if (data.netClasses) {
        for (const nc of data.netClasses) {
          createNetClass(nc.name, nc.width, nc.clearance, nc.color, nc.priority, nc.metadata);
          for (const net of nc.nets) {
            assignNetToClass(net, nc.name);
          }
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Hydration failure: ${e.message}` };
    }
  }
}
