/**
 * Public Library Ecosystem API.
 *
 * This module layers catalog, package, storage, cache, search, validation, and
 * integration helpers over the existing component-library registry without
 * replacing that lower-level API.
 */
export * from './types';
export * from './catalog';
export * from './metadata';
export * from './package-manager';
export * from './storage';
export * from './integrations';
export * from './cache/manager';
export * from './usage/manager';
export * from './devices/manager';
export * from './symbols/manager';
export * from './footprints/manager';
export * from './datasheets/manager';
export * from './search/engine';
export * from './validation/engine';
export * from './versioning/engine';
export * from './import-export/interfaces';
export * from './import-export/kicad';
