import { ProjectFileFormat } from './types';
import { SUPPORTED_VERSIONS } from './project-format';
import { globalRegistry } from '../component-library';
import { getLibraryMetadata } from '../library/metadata';

export class PersistenceValidator {
  validate(content: string): { isValid: boolean; error?: string; data?: ProjectFileFormat } {
    let data: ProjectFileFormat;
    try {
      data = JSON.parse(content);
    } catch (e: any) {
      return { isValid: false, error: `Malformed JSON: ${e.message}` };
    }

    if (!data.version || !data.metadata || !data.project || !data.wires || !data.connections) {
      return { isValid: false, error: 'Missing required top-level project file sections' };
    }

    if (!SUPPORTED_VERSIONS.includes(data.version)) {
      return { isValid: false, error: `Unsupported project format version: ${data.version}` };
    }

    const allIds = new Set<string>();

    if (data.project.pages) {
      for (const page of data.project.pages) {
        if (page.layers) {
          for (const layer of page.layers) {
            if (layer.objects) {
              for (const obj of layer.objects) {
                if (allIds.has(obj.id)) {
                  return { isValid: false, error: `Duplicate object ID detected: ${obj.id}` };
                }
                allIds.add(obj.id);

                const isModuleInFile = data.modules?.some((m) => m.id === obj.type);
                const metadata = globalRegistry.getById(obj.type);
                const libraryMetadata = data.library?.devices?.some((device) => device.id === obj.type) || getLibraryMetadata(obj.type);
                if (!metadata && !libraryMetadata && !isModuleInFile) {
                  return { isValid: false, error: `Missing component definition/metadata in Component Library for type: ${obj.type}` };
                }
              }
            }
          }
        }
      }
    }

    for (const conn of data.connections) {
      if (allIds.has(conn.id)) {
        return { isValid: false, error: `Duplicate connection ID detected: ${conn.id}` };
      }
      allIds.add(conn.id);
    }

    for (const wire of data.wires) {
      if (allIds.has(wire.id)) {
        return { isValid: false, error: `Duplicate wire ID detected: ${wire.id}` };
      }
      allIds.add(wire.id);
    }

    if (data.labels) {
      for (const l of data.labels) {
        if (allIds.has(l.id)) {
          return { isValid: false, error: `Duplicate label ID detected: ${l.id}` };
        }
        allIds.add(l.id);
      }
    }

    if (data.buses) {
      for (const b of data.buses) {
        if (allIds.has(b.id)) {
          return { isValid: false, error: `Duplicate bus ID detected: ${b.id}` };
        }
        allIds.add(b.id);
      }
    }

    if (data.busEntries) {
      for (const e of data.busEntries) {
        if (allIds.has(e.id)) {
          return { isValid: false, error: `Duplicate bus entry ID detected: ${e.id}` };
        }
        allIds.add(e.id);
      }
    }

    if (data.busTaps) {
      for (const t of data.busTaps) {
        if (allIds.has(t.id)) {
          return { isValid: false, error: `Duplicate bus tap ID detected: ${t.id}` };
        }
        allIds.add(t.id);
      }
    }

    if (data.busJunctions) {
      for (const bj of data.busJunctions) {
        if (allIds.has(bj.id)) {
          return { isValid: false, error: `Duplicate bus junction ID detected: ${bj.id}` };
        }
        allIds.add(bj.id);
      }
    }

    if (data.connectors) {
      for (const c of data.connectors) {
        if (allIds.has(c.id)) {
          return { isValid: false, error: `Duplicate connector ID detected: ${c.id}` };
        }
        allIds.add(c.id);
      }
    }

    if (data.noConnectMarkers) {
      for (const nc of data.noConnectMarkers) {
        if (allIds.has(nc.id)) {
          return { isValid: false, error: `Duplicate no-connect marker ID detected: ${nc.id}` };
        }
        allIds.add(nc.id);
      }
    }

    if (data.annotations) {
      for (const a of data.annotations) {
        if (allIds.has(a.id)) {
          return { isValid: false, error: `Duplicate annotation ID detected: ${a.id}` };
        }
        allIds.add(a.id);
      }
    }

    if (data.junctions) {
      for (const j of data.junctions) {
        if (allIds.has(j.id)) {
          return { isValid: false, error: `Duplicate junction ID detected: ${j.id}` };
        }
        allIds.add(j.id);
      }
    }

    return { isValid: true, data };
  }
}
