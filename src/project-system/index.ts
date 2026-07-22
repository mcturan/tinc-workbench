/**
 * Project System — Public API
 *
 * Clean, documented exports. All public interfaces are re-exported from here.
 */

// Core types
export * from './types';

// Default factories
export * from './defaults';

// Subsystem managers
export * from './metadata-manager';
export * from './settings-manager';
export * from './document-registry';
export * from './asset-manager';
export * from './dependency-graph';
export * from './annotation-framework';
export * from './cross-reference-engine';

// Validation and persistence
export * from './project-validator';
export * from './project-persistence';

// Integration adapters
export * from './explorer-adapter';
export * from './property-adapter';
export * from './ai-adapter';

// Central facade
export * from './project-manager';

// Templates
export * from './templates/manager';
