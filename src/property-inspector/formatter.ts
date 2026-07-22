import { SemanticObject } from '../types';
import { ComponentMetadata } from '../component-library/types';
import { LibraryMetadataRecord } from '../library/metadata';
import { ComponentDisplayData, PinDisplayData } from './types';

export class PropertyFormatter {
  formatComponent(obj: SemanticObject, metadata?: ComponentMetadata | LibraryMetadataRecord): ComponentDisplayData {
    const pins: PinDisplayData[] = [];

    if (metadata && 'electrical' in metadata) {
      for (const pinDef of metadata.electrical.pins) {
        pins.push({
          id: pinDef.id,
          name: pinDef.name,
          aliases: pinDef.aliases || [],
          electricalType: this.formatLabel(pinDef.electricalType),
          direction: this.formatLabel(pinDef.direction),
          voltageDomain: pinDef.voltageDomain,
        });
      }
    } else if (metadata) {
      for (const pinId of metadata.electricalPins) {
        pins.push({
          id: pinId,
          name: pinId,
          aliases: [],
          electricalType: 'Unspecified',
          direction: 'Unspecified',
          voltageDomain: undefined,
        });
      }
    } else {
      const allPortsPins = [...obj.ports, ...obj.pins];
      for (const p of allPortsPins) {
        pins.push({
          id: p.id,
          name: p.name,
          aliases: [],
          electricalType: this.formatLabel(p.signalCategory || 'unspecified'),
          direction: this.formatLabel(p.direction || 'unspecified'),
          voltageDomain: undefined,
        });
      }
    }

    const isComponentMetadata = metadata && 'knowledge' in metadata;
    const isLibraryMetadata = metadata && 'source' in metadata;

    return {
      id: obj.id,
      name: obj.name || metadata?.name || obj.type,
      category: (isComponentMetadata ? metadata.tvcs?.categoryPath?.[0] : isLibraryMetadata ? metadata.category : undefined) || 'unspecified',
      description: metadata?.description || 'No description available.',
      pins,
      notes: isComponentMetadata ? metadata.knowledge.notes : [],
      warnings: isComponentMetadata ? metadata.knowledge.warnings : [],
      applications: isComponentMetadata ? metadata.knowledge.applications : [],
      tags: isComponentMetadata ? metadata.keywords : isLibraryMetadata ? metadata.tags : [],
      documentation: isLibraryMetadata ? metadata.documentation : [],
    };
  }

  private formatLabel(str: string): string {
    if (!str) return 'Unspecified';
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
