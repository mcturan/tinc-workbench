import { SymbolDefinition, DeviceDefinition, FootprintDefinition, DatasheetReference } from '../types';

export interface LibraryData {
  version: string;
  symbols: SymbolDefinition[];
  devices: DeviceDefinition[];
  footprints: FootprintDefinition[];
  datasheets?: DatasheetReference[];
}

export interface LibraryAdapter {
  formatName: 'TINC' | 'KiCad' | 'Eagle' | 'Altium' | 'JSON' | 'YAML';
  importLibrary(data: string): LibraryData;
  exportLibrary(libraryData: LibraryData): string;
}

export class JsonLibraryAdapter implements LibraryAdapter {
  formatName = 'JSON' as const;

  importLibrary(data: string): LibraryData {
    const parsed = JSON.parse(data);
    return {
      version: parsed.version || '1.0.0',
      symbols: parsed.symbols || [],
      devices: parsed.devices || [],
      footprints: parsed.footprints || [],
      datasheets: parsed.datasheets || [],
    };
  }

  exportLibrary(libraryData: LibraryData): string {
    return JSON.stringify(libraryData, null, 2);
  }
}

export class YamlLibraryAdapter implements LibraryAdapter {
  formatName = 'YAML' as const;

  importLibrary(data: string): LibraryData {
    const jsonPayload = data
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n')
      .trim();

    if (jsonPayload.startsWith('{')) {
      return new JsonLibraryAdapter().importLibrary(jsonPayload);
    }

    const versionMatch = jsonPayload.match(/^version:\s*["']?([^"'\n]+)["']?/m);
    return {
      version: versionMatch?.[1]?.trim() || '1.0.0',
      symbols: parseJsonBlock<SymbolDefinition>(jsonPayload, 'symbols'),
      devices: parseJsonBlock<DeviceDefinition>(jsonPayload, 'devices'),
      footprints: parseJsonBlock<FootprintDefinition>(jsonPayload, 'footprints'),
      datasheets: parseJsonBlock<DatasheetReference>(jsonPayload, 'datasheets'),
    };
  }

  exportLibrary(libraryData: LibraryData): string {
    return [
      `version: ${libraryData.version}`,
      'symbols:',
      ...formatJsonBlock(libraryData.symbols),
      'devices:',
      ...formatJsonBlock(libraryData.devices),
      'footprints:',
      ...formatJsonBlock(libraryData.footprints),
      'datasheets:',
      ...formatJsonBlock(libraryData.datasheets || []),
      '',
    ].join('\n');
  }
}

function formatJsonBlock(values: unknown[]): string[] {
  if (values.length === 0) return ['  []'];
  return values.map((value) => `  - ${JSON.stringify(value)}`);
}

function parseJsonBlock<T>(data: string, key: string): T[] {
  const lines = data.split('\n');
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return [];

  const values: T[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line.trim())) break;
    const trimmed = line.trim();
    if (trimmed === '[]') return [];
    if (trimmed.startsWith('- ')) {
      values.push(JSON.parse(trimmed.slice(2)) as T);
    }
  }
  return values;
}

// Future KiCad Adapter Interface
// Future Eagle Adapter Interface
export class EagleLibraryAdapter implements LibraryAdapter {
  formatName = 'Eagle' as const;

  importLibrary(_data: string): LibraryData {
    throw new Error('Eagle importer is an interface stub. External parser required.');
  }

  exportLibrary(_libraryData: LibraryData): string {
    throw new Error('Eagle exporter is an interface stub. External serializer required.');
  }
}

// Future Altium Adapter Interface
export class AltiumLibraryAdapter implements LibraryAdapter {
  formatName = 'Altium' as const;

  importLibrary(_data: string): LibraryData {
    throw new Error('Altium importer is an interface stub. External parser required.');
  }

  exportLibrary(_libraryData: LibraryData): string {
    throw new Error('Altium exporter is an interface stub. External serializer required.');
  }
}
