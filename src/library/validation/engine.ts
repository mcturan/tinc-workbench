import { SymbolDefinition } from '../types';
import { getDatasheet, listDatasheets } from '../datasheets/manager';
import { listSymbols } from '../symbols/manager';
import { listDevices } from '../devices/manager';
import { listFootprints } from '../footprints/manager';

export interface LibraryDiagnostic {
  type:
    | 'duplicate-id'
    | 'duplicate-name'
    | 'broken-mapping'
    | 'missing-symbol'
    | 'missing-footprint'
    | 'circular-inheritance'
    | 'version-conflict'
    | 'incomplete-metadata'
    | 'invalid-package'
    | 'missing-datasheet'
    | 'manufacturer-mismatch';
  severity: 'error' | 'warning';
  message: string;
  targetId: string;
}

export function validateLibrary(): LibraryDiagnostic[] {
  const diagnostics: LibraryDiagnostic[] = [];

  const symbols = listSymbols();
  const devices = listDevices();
  const footprints = listFootprints();
  const datasheets = listDatasheets();

  const allIds = new Set<string>();
  const symbolIds = new Set<string>(symbols.map(s => s.id));
  const footprintIds = new Set<string>(footprints.map(f => f.id));

  // 1. Duplicate IDs check across all types
  for (const sym of symbols) {
    if (allIds.has(sym.id)) {
      diagnostics.push({
        type: 'duplicate-id',
        severity: 'error',
        message: `Duplicate ID detected: Symbol '${sym.displayName}' shares ID ${sym.id}`,
        targetId: sym.id,
      });
    }
    allIds.add(sym.id);
  }

  for (const fp of footprints) {
    if (allIds.has(fp.id)) {
      diagnostics.push({
        type: 'duplicate-id',
        severity: 'error',
        message: `Duplicate ID detected: Footprint '${fp.name}' shares ID ${fp.id}`,
        targetId: fp.id,
      });
    }
    allIds.add(fp.id);
  }

  for (const dev of devices) {
    if (allIds.has(dev.id)) {
      diagnostics.push({
        type: 'duplicate-id',
        severity: 'error',
        message: `Duplicate ID detected: Device '${dev.name}' shares ID ${dev.id}`,
        targetId: dev.id,
      });
    }
    allIds.add(dev.id);
  }

  // 2. Duplicate names check
  const symbolNames = new Map<string, string>();
  for (const sym of symbols) {
    const key = `${sym.category}:${sym.displayName.toLowerCase()}`;
    if (symbolNames.has(key)) {
      diagnostics.push({
        type: 'duplicate-name',
        severity: 'warning',
        message: `Multiple symbols in category '${sym.category}' share display name '${sym.displayName}'`,
        targetId: sym.id,
      });
    }
    symbolNames.set(key, sym.id);
  }

  // 3. Circular Inheritance check in symbols
  for (const sym of symbols) {
    const visited = new Set<string>();
    let current: SymbolDefinition | undefined = sym;
    let circular = false;

    while (current && current.parentSymbolId) {
      if (visited.has(current.parentSymbolId)) {
        circular = true;
        break;
      }
      visited.add(current.id);
      current = symbols.find(s => s.id === current!.parentSymbolId);
    }

    if (circular) {
      diagnostics.push({
        type: 'circular-inheritance',
        severity: 'error',
        message: `Circular symbol inheritance detected in chain of '${sym.displayName}'`,
        targetId: sym.id,
      });
    }
  }

  // 4. Missing symbols / footprints check on devices
  for (const dev of devices) {
    for (const symId of dev.symbolIds) {
      if (!symbolIds.has(symId)) {
        diagnostics.push({
          type: 'missing-symbol',
          severity: 'error',
          message: `Device '${dev.name}' references non-existent Symbol ID '${symId}'`,
          targetId: dev.id,
        });
      }
    }

    for (const fpId of dev.footprintIds) {
      if (!footprintIds.has(fpId)) {
        diagnostics.push({
          type: 'missing-footprint',
          severity: 'error',
          message: `Device '${dev.name}' references non-existent Footprint ID '${fpId}'`,
          targetId: dev.id,
        });
      }
    }
  }

  // 5. Broken mappings check on devices
  for (const dev of devices) {
    // Collect all symbol pins for the device
    const symbolPinIds = new Set<string>();
    for (const symId of dev.symbolIds) {
      const sym = symbols.find(s => s.id === symId);
      if (sym) {
        // Collect pins from variants
        for (const variant of sym.variants || []) {
          for (const pin of variant.pins || []) {
            symbolPinIds.add(pin.id);
          }
        }
        // Collect pins from units
        for (const unit of sym.units || []) {
          for (const pin of unit.pins || []) {
            symbolPinIds.add(pin.id);
          }
        }
      }
    }

    // Collect footprint pads count
    let maxPads = 0;
    for (const fpId of dev.footprintIds) {
      const fp = footprints.find(f => f.id === fpId);
      if (fp) {
        maxPads = Math.max(maxPads, fp.padCount);
      }
    }

    for (const mapping of dev.pinMappings || []) {
      // Check symbolPinId
      if (symbolPinIds.size > 0 && !symbolPinIds.has(mapping.symbolPinId)) {
        diagnostics.push({
          type: 'broken-mapping',
          severity: 'error',
          message: `Pin mapping references non-existent symbol pin ID '${mapping.symbolPinId}' in Device '${dev.name}'`,
          targetId: dev.id,
        });
      }

      // Check pad ID (footprintPadId can be a string representing pad numbers e.g. "1", "2" or alpha "A1", "B2")
      const padNum = parseInt(mapping.footprintPadId, 10);
      if (!isNaN(padNum) && maxPads > 0 && padNum > maxPads) {
        diagnostics.push({
          type: 'broken-mapping',
          severity: 'error',
          message: `Pin mapping references pad '${mapping.footprintPadId}' exceeding footprint pad count (${maxPads}) in Device '${dev.name}'`,
          targetId: dev.id,
        });
      }
    }
  }

  // 6. Incomplete metadata checks
  for (const dev of devices) {
    const meta = dev.metadata;
    if (!meta) {
      diagnostics.push({
        type: 'incomplete-metadata',
        severity: 'warning',
        message: `Device '${dev.name}' has no metadata block`,
        targetId: dev.id,
      });
      continue;
    }

    if (!meta.commercial?.manufacturer || !meta.commercial?.mpn) {
      diagnostics.push({
        type: 'incomplete-metadata',
        severity: 'warning',
        message: `Device '${dev.name}' has incomplete commercial metadata (missing Manufacturer or MPN)`,
        targetId: dev.id,
      });
    }

    for (const part of dev.manufacturerParts || []) {
      if (
        meta.commercial?.manufacturer &&
        part.manufacturer &&
        part.manufacturer.toLowerCase() !== meta.commercial.manufacturer.toLowerCase()
      ) {
        diagnostics.push({
          type: 'manufacturer-mismatch',
          severity: 'warning',
          message: `Manufacturer part '${part.mpn}' does not match device commercial manufacturer '${meta.commercial.manufacturer}'`,
          targetId: dev.id,
        });
      }
    }

    if (!meta.mechanical?.packageType) {
      diagnostics.push({
        type: 'incomplete-metadata',
        severity: 'warning',
        message: `Device '${dev.name}' is missing mechanical package type`,
        targetId: dev.id,
      });
    }

    const datasheetRef = meta.documentation?.datasheet;
    if (datasheetRef && !isExternalReference(datasheetRef) && !getDatasheet(datasheetRef)) {
      diagnostics.push({
        type: 'missing-datasheet',
        severity: 'warning',
        message: `Device '${dev.name}' references missing datasheet '${datasheetRef}'`,
        targetId: dev.id,
      });
    }
  }

  // 7. Invalid package dimensions check on footprints
  for (const fp of footprints) {
    const dims = fp.packageDimensions;
    if (dims) {
      if (dims.height <= 0 || dims.width <= 0 || dims.length <= 0 || dims.weight < 0) {
        diagnostics.push({
          type: 'invalid-package',
          severity: 'error',
          message: `Footprint '${fp.name}' has invalid dimensions (width/height/length must be positive, weight non-negative)`,
          targetId: fp.id,
        });
      }
    }
  }

  for (const ds of datasheets) {
    if (!ds.title || !ds.url) {
      diagnostics.push({
        type: 'missing-datasheet',
        severity: 'warning',
        message: `Datasheet '${ds.id}' is missing title or URL`,
        targetId: ds.id,
      });
    }
  }

  return diagnostics;
}

function isExternalReference(value: string): boolean {
  return /^https?:\/\//.test(value) || /^file:\/\//.test(value) || value.includes('/');
}
