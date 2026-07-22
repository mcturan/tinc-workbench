import { LibraryAdapter, LibraryData } from './interfaces';
import { SymbolDefinition, FootprintDefinition, SymbolUnit, SymbolPin } from '../types';

export class KiCadLibraryAdapter implements LibraryAdapter {
  formatName = 'KiCad' as const;

  importLibrary(data: string): LibraryData {
    const symbols: SymbolDefinition[] = [];
    const footprints: FootprintDefinition[] = [];

    try {
      if (data.includes('(kicad_symbol_lib') || data.includes('(symbol')) {
        symbols.push(...this.parseKiCadSymbols(data));
      } else if (data.includes('(footprint') || data.includes('(module')) {
        footprints.push(...this.parseKiCadFootprints(data));
      } else {
        throw new Error('Unsupported KiCad format: Could not find (kicad_symbol_lib) or (footprint) blocks.');
      }
    } catch (err: any) {
      console.warn('KiCad Import Error:', err.message);
      throw err;
    }

    return {
      version: '1.0.0',
      symbols,
      devices: [],
      footprints
    };
  }

  exportLibrary(libraryData: LibraryData): string {
    throw new Error('Export to KiCad is not supported in this sprint.');
  }

  private parseKiCadSymbols(data: string): SymbolDefinition[] {
    const symbols: SymbolDefinition[] = [];
    const symbolRegex = /\(symbol\s+"([^"]+)"[\s\S]*?\)\s*\)/g;
    
    let match;
    while ((match = symbolRegex.exec(data)) !== null) {
      const symbolName = match[2];
      const block = match[0];
      
      const pins: SymbolPin[] = [];
      const pinRegex = /\(pin\s+(\w+)\s+(\w+)[\s\S]*?\(name\s+"([^"]*)"[\s\S]*?\(number\s+"([^"]*)"/g;
      let pinMatch;
      while ((pinMatch = pinRegex.exec(block)) !== null) {
        pins.push({
          id: pinMatch[5], // number
          name: pinMatch[4] || pinMatch[5],
          number: pinMatch[5],
          x: 0,
          y: 0,
          length: 5,
          direction: this.mapKiCadDirection(pinMatch[3])
        });
      }

      const unit: SymbolUnit = {
        id: `unit_${symbolName}`,
        name: symbolName,
        pins
      };

      const newSym: SymbolDefinition = {
        id: `kicad_sym_${symbolName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        displayName: symbolName,
        internalName: symbolName,
        description: 'Imported from KiCad',
        category: 'Imported',
        subcategory: '',
        tags: [],
        aliases: [],
        keywords: [],
        version: '1.0',
        author: 'Unknown',
        license: 'Unknown',
        creationDate: new Date().toISOString(),
        lastModificationDate: new Date().toISOString(),
        deprecationState: 'active',
        variants: [],
        units: [unit],
        alternateViews: []
      };

      symbols.push(newSym);
    }

    if (symbols.length === 0) {
      throw new Error('Unsupported or malformed KiCad symbol library. Could not parse individual symbols.');
    }

    return symbols;
  }

  private parseKiCadFootprints(data: string): FootprintDefinition[] {
    const footprints: FootprintDefinition[] = [];
    if (data.trim().startsWith('(footprint') || data.trim().startsWith('(module')) {
      const nameMatch = data.match(/\(?:footprint|module\)\s+"([^"]+)"/);
      const footprintName = nameMatch ? nameMatch[1] : 'Unknown_Footprint';
      
      const padRegex = /\(pad\s+"([^"]*)"\s+(\w+)\s+(\w+)[\s\S]*?\(at\s+([^\s]+)\s+([^\s)]+)/g;
      let padCount = 0;
      let isSMD = false;

      let padMatch;
      while ((padMatch = padRegex.exec(data)) !== null) {
        padCount++;
        if (padMatch[3].toLowerCase() === 'smd') isSMD = true;
      }

      const fp: FootprintDefinition = {
        id: `kicad_fp_${footprintName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        name: footprintName,
        description: 'Imported from KiCad',
        packageDimensions: {
          height: 0,
          width: 0,
          length: 0,
          weight: 0
        },
        padCount,
        mountType: isSMD ? 'SMD' : 'THT',
        ipcMetadata: {},
        courtyardMetadata: {},
        keepoutMetadata: {}
      };

      footprints.push(fp);
    } else {
      throw new Error('Unsupported or malformed KiCad footprint format.');
    }

    return footprints;
  }

  private mapKiCadDirection(dir: string): any {
    switch (dir.toLowerCase()) {
      case 'input': return 'input';
      case 'output': return 'output';
      case 'bidirectional': return 'bidirectional';
      case 'tri_state': return 'tri-state';
      case 'passive': return 'passive';
      case 'power_in': return 'power_input';
      case 'power_out': return 'power_output';
      default: return 'unspecified';
    }
  }
}
