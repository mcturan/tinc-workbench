import { ComponentMetadata } from './types';

export class ComponentValidator {
  static validate(component: ComponentMetadata): void {
    if (!component) {
      throw new Error('Component metadata is null or undefined');
    }

    // 1. General validations
    if (!component.id || component.id.trim() === '') {
      throw new Error('Component ID cannot be empty');
    }
    if (!component.name || component.name.trim() === '') {
      throw new Error('Component name cannot be empty');
    }
    if (!component.tvcs?.categoryPath || component.tvcs.categoryPath.length === 0) {
      throw new Error(`Component validation failed: missing category path`);
    }
    if (!component.description || component.description.trim() === '') {
      throw new Error('Component description cannot be empty');
    }

    // 2. Visual validations
    if (!component.visual) {
      throw new Error('Visual metadata is missing');
    }
    if (component.visual.width <= 0 || component.visual.height <= 0) {
      throw new Error('Component visual dimensions must be positive numbers');
    }

    // 3. Geometry validations
    if (!component.geometry) {
      throw new Error('Geometry metadata is missing');
    }
    if (!component.geometry.boundingBox) {
      throw new Error('Bounding box is missing');
    }
    const bbox = component.geometry.boundingBox;
    if (bbox.width !== component.visual.width || bbox.height !== component.visual.height) {
      throw new Error('Bounding box dimensions must match visual dimensions');
    }

    // 4. Pin mapping and validations
    if (!component.geometry.pins || !component.electrical || !component.electrical.pins) {
      throw new Error('Pin definitions are missing');
    }
    const geomPinIds = component.geometry.pins ? component.geometry.pins.map((p) => p.id) : [];
    const elecPinIds = component.electrical.pins ? component.electrical.pins.map((p) => p.id) : [];

    const cat = component.tvcs?.categoryPath?.[0] || 'Uncategorized';
    if (cat !== 'Physical' && cat !== 'Mechanical') {
      if (component.electrical.pins.length === 0) {
        throw new Error(`Component validation failed: electrical components must have at least one pin`);
      }
    }

    // Check mapping 1:1 match
    const geomSet = new Set(geomPinIds);
    const elecSet = new Set(elecPinIds);

    if (geomSet.size !== geomPinIds.length) {
      throw new Error('Duplicate pin IDs in geometry definition');
    }
    if (elecSet.size !== elecPinIds.length) {
      throw new Error('Duplicate pin IDs in electrical definition');
    }

    for (const id of geomPinIds) {
      if (!elecSet.has(id)) {
        throw new Error(`Pin '${id}' defined in geometry but missing in electrical metadata`);
      }
    }
    for (const id of elecPinIds) {
      if (!geomSet.has(id)) {
        throw new Error(`Pin '${id}' defined in electrical but missing in geometry metadata`);
      }
    }

    // Electrical pin details
    for (const pin of component.electrical.pins) {
      if (!pin.id || pin.id.trim() === '') {
        throw new Error('Pin ID cannot be empty');
      }
      if (!pin.name || pin.name.trim() === '') {
        throw new Error(`Pin name cannot be empty for pin '${pin.id}'`);
      }
      if (!pin.electricalType || pin.electricalType.trim() === '') {
        throw new Error(`Electrical type cannot be empty for pin '${pin.id}'`);
      }
    }

    // 5. Unique checks within the component (aliases, keywords)
    const aliases = component.aliases || [];
    const keywords = component.keywords || [];

    const aliasSet = new Set<string>();
    for (const alias of aliases) {
      const lower = alias.toLowerCase().trim();
      if (!lower) {
        throw new Error('Empty aliases are not permitted');
      }
      if (aliasSet.has(lower)) {
        throw new Error(`Duplicate alias '${alias}' found in component '${component.id}'`);
      }
      aliasSet.add(lower);
    }

    const keywordSet = new Set<string>();
    for (const kw of keywords) {
      const lower = kw.toLowerCase().trim();
      if (!lower) {
        throw new Error('Empty keywords are not permitted');
      }
      if (keywordSet.has(lower)) {
        throw new Error(`Duplicate keyword '${kw}' found in component '${component.id}'`);
      }
      keywordSet.add(lower);
    }
  }

  // Enforce cross-component global uniqueness checks (called by registry)
  static validateRegistryUniqueness(
    components: ComponentMetadata[],
    newComponent: ComponentMetadata
  ): void {
    for (const comp of components) {
      if (comp.id.toLowerCase() === newComponent.id.toLowerCase()) {
        throw new Error(`Duplicate component ID '${newComponent.id}' already exists in registry`);
      }

      // Check duplicate aliases globally
      const newAliases = new Set(newComponent.aliases.map((a) => a.toLowerCase()));
      for (const alias of comp.aliases) {
        if (newAliases.has(alias.toLowerCase())) {
          throw new Error(`Duplicate global alias '${alias}' conflicts with component '${comp.id}'`);
        }
      }
    }
  }
}
