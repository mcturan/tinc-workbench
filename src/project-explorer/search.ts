import { SemanticObject, Wire } from '../types';
import { globalRegistry } from '../component-library';
import { matchesProjectExplorerLibraryQuery } from '../library/integrations';

export class ExplorerSearch {
  matchesComponent(comp: SemanticObject, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const matchesId = comp.id.toLowerCase().includes(q);
    const matchesName = comp.name?.toLowerCase().includes(q) || comp.type.toLowerCase().includes(q);
    const metadata = globalRegistry.getById(comp.type);
    const matchesAlias = metadata?.aliases.some(a => a.toLowerCase().includes(q)) || false;
    const matchesLibrary = matchesProjectExplorerLibraryQuery(comp, query);

    return matchesId || matchesName || matchesAlias || matchesLibrary;
  }

  matchesWire(wire: Wire, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const matchesId = wire.id.toLowerCase().includes(q);
    const matchesConn = wire.logicalConnectionId.toLowerCase().includes(q);

    return matchesId || matchesConn;
  }
}
