/**
 * Project System — Default Values
 */

import { ProjectSettings, ProjectMetadata, ProjectStatus } from './types';
import { generateUUID } from '../utils';

// ── Deep Merge ────────────────────────────────────────────────────────────────

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result: any = { ...base as any };
  for (const key of Object.keys(override as object)) {
    const v = (override as any)[key];
    if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
      result[key] = deepMerge(result[key] ?? {}, v);
    } else if (v !== undefined) {
      result[key] = v;
    }
  }
  return result as T;
}

// ── Default Settings ──────────────────────────────────────────────────────────

export function createDefaultSettings(overrides?: Partial<ProjectSettings>): ProjectSettings {
  const base: ProjectSettings = {
    units: 'mm',
    angleUnit: 'deg',
    grid: {
      size: 2.54,
      unit: 'mm',
      style: 'dots',
      visible: true,
    },
    snap: {
      enabled: true,
      threshold: 5,
      snapToGrid: true,
      snapToPins: true,
      snapToComponents: true,
    },
    theme: 'dark',
    pageDefaults: {
      width: 297,
      height: 210,
      unit: 'mm',
      orientation: 'landscape',
      borderStyle: 'none',
      titleBlock: true,
    },
    annotationRules: {
      prefix: '',
      startNumber: 1,
      scope: 'project',
      resetOnNewPage: false,
      hierarchicalSeparator: '/',
    },
    ercOptions: {
      runOnSave: false,
      runOnExport: true,
      severity: {},
      ignoredRules: [],
    },
    libraryPreferences: {
      searchPaths: [],
      defaultSymbolLib: '',
      defaultFootprintLib: '',
      preferredVendors: [],
    },
    netNamingPreferences: {
      autoNameNets: true,
      netPrefix: 'Net',
      powerNetPrefix: 'PWR',
      busExpansionSeparator: '_',
    },
    ruleProfileId: 'profile-default',
    customSettings: {},
  };

  return overrides ? deepMerge(base, overrides) : base;
}

// ── Default Metadata ──────────────────────────────────────────────────────────

export function createDefaultMetadata(
  name: string,
  overrides?: Partial<ProjectMetadata>
): ProjectMetadata {
  const now = new Date().toISOString();
  return {
    uuid: generateUUID(),
    name,
    description: '',
    author: '',
    company: '',
    version: '1.0.0',
    revision: 1,
    status: 'draft' as ProjectStatus,
    createdAt: now,
    modifiedAt: now,
    tags: [],
    customFields: {},
    ...overrides,
  };
}
