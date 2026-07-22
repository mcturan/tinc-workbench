/**
 * Project System — Settings Manager
 *
 * Manages strongly-typed, serializable project settings.
 * Settings are deeply cloned on get() to prevent external mutation.
 */

import {
  ProjectSettings,
  GridSettings,
  SnapSettings,
  ERCOptions,
  LibraryPreferences,
  NetNamingPreferences,
  AnnotationRules,
  PageDefaults,
  LengthUnit,
  ThemePreference,
} from './types';
import { createDefaultSettings } from './defaults';

export class SettingsManager {
  private settings: ProjectSettings;

  constructor(initial?: Partial<ProjectSettings>) {
    this.settings = createDefaultSettings(initial);
  }

  get(): ProjectSettings {
    return JSON.parse(JSON.stringify(this.settings)) as ProjectSettings;
  }

  patch(patch: Partial<ProjectSettings>): void {
    this.settings = { ...this.settings, ...patch };
  }

  setUnits(units: LengthUnit): void {
    this.settings.units = units;
  }

  setTheme(theme: ThemePreference): void {
    this.settings.theme = theme;
  }

  updateGrid(grid: Partial<GridSettings>): void {
    this.settings.grid = { ...this.settings.grid, ...grid };
  }

  updateSnap(snap: Partial<SnapSettings>): void {
    this.settings.snap = { ...this.settings.snap, ...snap };
  }

  updatePageDefaults(pd: Partial<PageDefaults>): void {
    this.settings.pageDefaults = { ...this.settings.pageDefaults, ...pd };
  }

  updateAnnotationRules(ar: Partial<AnnotationRules>): void {
    this.settings.annotationRules = { ...this.settings.annotationRules, ...ar };
  }

  updateERCOptions(opts: Partial<ERCOptions>): void {
    this.settings.ercOptions = { ...this.settings.ercOptions, ...opts };
  }

  addIgnoredERCRule(ruleId: string): void {
    if (!this.settings.ercOptions.ignoredRules.includes(ruleId)) {
      this.settings.ercOptions.ignoredRules = [...this.settings.ercOptions.ignoredRules, ruleId];
    }
  }

  removeIgnoredERCRule(ruleId: string): void {
    this.settings.ercOptions.ignoredRules = this.settings.ercOptions.ignoredRules.filter(r => r !== ruleId);
  }

  updateLibraryPreferences(lp: Partial<LibraryPreferences>): void {
    this.settings.libraryPreferences = { ...this.settings.libraryPreferences, ...lp };
  }

  addLibrarySearchPath(path: string): void {
    if (!this.settings.libraryPreferences.searchPaths.includes(path)) {
      this.settings.libraryPreferences.searchPaths = [
        ...this.settings.libraryPreferences.searchPaths,
        path,
      ];
    }
  }

  removeLibrarySearchPath(path: string): void {
    this.settings.libraryPreferences.searchPaths =
      this.settings.libraryPreferences.searchPaths.filter(p => p !== path);
  }

  updateNetNaming(nn: Partial<NetNamingPreferences>): void {
    this.settings.netNamingPreferences = { ...this.settings.netNamingPreferences, ...nn };
  }

  setCustomSetting(key: string, value: any): void {
    this.settings.customSettings = { ...this.settings.customSettings, [key]: value };
  }

  getCustomSetting(key: string): any {
    return this.settings.customSettings[key];
  }

  validate(): string[] {
    const errors: string[] = [];
    if (this.settings.grid.size <= 0) errors.push('Grid size must be positive');
    if (this.settings.snap.threshold < 0) errors.push('Snap threshold must be non-negative');
    if (this.settings.pageDefaults.width <= 0) errors.push('Page width must be positive');
    if (this.settings.pageDefaults.height <= 0) errors.push('Page height must be positive');
    if (this.settings.annotationRules.startNumber < 0)
      errors.push('Annotation start number must be non-negative');
    return errors;
  }

  restore(snapshot: ProjectSettings): void {
    this.settings = JSON.parse(JSON.stringify(snapshot)) as ProjectSettings;
  }

  reset(): void {
    this.settings = createDefaultSettings();
  }
}
