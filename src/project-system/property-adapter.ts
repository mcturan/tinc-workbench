/**
 * Project System — Property Adapter
 *
 * Produces structured Property Inspector data for project metadata,
 * settings, documents, and assets.
 */

import { MetadataManager } from './metadata-manager';
import { SettingsManager } from './settings-manager';
import { DocumentRegistry } from './document-registry';
import { AssetManager } from './asset-manager';

export interface PropertyField {
  key: string;
  label: string;
  value: any;
  type: 'text' | 'number' | 'boolean' | 'select' | 'list' | 'date';
  readonly?: boolean;
  options?: string[];
}

export interface PropertyGroup {
  label: string;
  fields: PropertyField[];
}

export class PropertyAdapter {
  getProjectProperties(metaManager: MetadataManager): PropertyGroup[] {
    const meta = metaManager.get();
    return [
      {
        label: 'Project Identity',
        fields: [
          { key: 'uuid', label: 'UUID', value: meta.uuid, type: 'text', readonly: true },
          { key: 'name', label: 'Name', value: meta.name, type: 'text' },
          { key: 'description', label: 'Description', value: meta.description, type: 'text' },
          { key: 'version', label: 'Version', value: meta.version, type: 'text' },
          { key: 'revision', label: 'Revision', value: meta.revision, type: 'number', readonly: true },
          {
            key: 'status',
            label: 'Status',
            value: meta.status,
            type: 'select',
            options: ['draft', 'in-review', 'released', 'archived', 'deprecated'],
          },
        ],
      },
      {
        label: 'Authorship',
        fields: [
          { key: 'author', label: 'Author', value: meta.author, type: 'text' },
          { key: 'company', label: 'Company', value: meta.company, type: 'text' },
          { key: 'createdAt', label: 'Created', value: meta.createdAt, type: 'date', readonly: true },
          { key: 'modifiedAt', label: 'Modified', value: meta.modifiedAt, type: 'date', readonly: true },
        ],
      },
      {
        label: 'Tags',
        fields: [{ key: 'tags', label: 'Tags', value: meta.tags, type: 'list' }],
      },
    ];
  }

  getSettingsProperties(settingsManager: SettingsManager): PropertyGroup[] {
    const s = settingsManager.get();
    return [
      {
        label: 'General',
        fields: [
          {
            key: 'units',
            label: 'Units',
            value: s.units,
            type: 'select',
            options: ['mm', 'mil', 'inch', 'cm'],
          },
          {
            key: 'angleUnit',
            label: 'Angle Unit',
            value: s.angleUnit,
            type: 'select',
            options: ['deg', 'rad'],
          },
          {
            key: 'theme',
            label: 'Theme',
            value: s.theme,
            type: 'select',
            options: ['light', 'dark', 'system'],
          },
        ],
      },
      {
        label: 'Grid',
        fields: [
          { key: 'grid.size', label: 'Grid Size', value: s.grid.size, type: 'number' },
          {
            key: 'grid.unit',
            label: 'Grid Unit',
            value: s.grid.unit,
            type: 'select',
            options: ['mm', 'mil', 'inch', 'cm'],
          },
          {
            key: 'grid.style',
            label: 'Grid Style',
            value: s.grid.style,
            type: 'select',
            options: ['dots', 'lines', 'none'],
          },
          { key: 'grid.visible', label: 'Grid Visible', value: s.grid.visible, type: 'boolean' },
        ],
      },
      {
        label: 'Snap',
        fields: [
          { key: 'snap.enabled', label: 'Snap Enabled', value: s.snap.enabled, type: 'boolean' },
          {
            key: 'snap.threshold',
            label: 'Snap Threshold (px)',
            value: s.snap.threshold,
            type: 'number',
          },
          { key: 'snap.snapToGrid', label: 'Snap to Grid', value: s.snap.snapToGrid, type: 'boolean' },
          { key: 'snap.snapToPins', label: 'Snap to Pins', value: s.snap.snapToPins, type: 'boolean' },
        ],
      },
      {
        label: 'Page Defaults',
        fields: [
          { key: 'pageDefaults.width', label: 'Width', value: s.pageDefaults.width, type: 'number' },
          { key: 'pageDefaults.height', label: 'Height', value: s.pageDefaults.height, type: 'number' },
          {
            key: 'pageDefaults.unit',
            label: 'Unit',
            value: s.pageDefaults.unit,
            type: 'select',
            options: ['mm', 'mil', 'inch', 'cm'],
          },
          {
            key: 'pageDefaults.orientation',
            label: 'Orientation',
            value: s.pageDefaults.orientation,
            type: 'select',
            options: ['portrait', 'landscape'],
          },
          {
            key: 'pageDefaults.titleBlock',
            label: 'Title Block',
            value: s.pageDefaults.titleBlock,
            type: 'boolean',
          },
        ],
      },
      {
        label: 'ERC',
        fields: [
          {
            key: 'ercOptions.runOnSave',
            label: 'Run on Save',
            value: s.ercOptions.runOnSave,
            type: 'boolean',
          },
          {
            key: 'ercOptions.runOnExport',
            label: 'Run on Export',
            value: s.ercOptions.runOnExport,
            type: 'boolean',
          },
          {
            key: 'ercOptions.ignoredRules',
            label: 'Ignored Rules',
            value: s.ercOptions.ignoredRules,
            type: 'list',
          },
        ],
      },
      {
        label: 'Net Naming',
        fields: [
          {
            key: 'netNamingPreferences.autoNameNets',
            label: 'Auto Name Nets',
            value: s.netNamingPreferences.autoNameNets,
            type: 'boolean',
          },
          {
            key: 'netNamingPreferences.netPrefix',
            label: 'Net Prefix',
            value: s.netNamingPreferences.netPrefix,
            type: 'text',
          },
          {
            key: 'netNamingPreferences.powerNetPrefix',
            label: 'Power Net Prefix',
            value: s.netNamingPreferences.powerNetPrefix,
            type: 'text',
          },
        ],
      },
      {
        label: 'Design Rules',
        fields: [
          {
            key: 'ruleProfileId',
            label: 'Rule Profile',
            value: s.ruleProfileId ?? 'profile-default',
            type: 'select',
            options: ['profile-default', 'profile-relaxed', 'profile-manufacturing'],
          },
        ],
      },
    ];
  }

  getDocumentProperties(docRegistry: DocumentRegistry, docId: string): PropertyGroup[] {
    const doc = docRegistry.get(docId);
    if (!doc) return [];
    return [
      {
        label: 'Document',
        fields: [
          { key: 'id', label: 'ID', value: doc.id, type: 'text', readonly: true },
          { key: 'title', label: 'Title', value: doc.title, type: 'text' },
          { key: 'kind', label: 'Kind', value: doc.kind, type: 'text', readonly: true },
          { key: 'state', label: 'State', value: doc.state, type: 'text', readonly: true },
          { key: 'version', label: 'Version', value: doc.version, type: 'number', readonly: true },
          { key: 'dirty', label: 'Unsaved Changes', value: doc.dirty, type: 'boolean', readonly: true },
          { key: 'readonly', label: 'Read Only', value: doc.readonly, type: 'boolean' },
          { key: 'path', label: 'Path', value: doc.path, type: 'text' },
          { key: 'description', label: 'Description', value: doc.description, type: 'text' },
          { key: 'tags', label: 'Tags', value: doc.tags, type: 'list' },
          { key: 'createdAt', label: 'Created', value: doc.createdAt, type: 'date', readonly: true },
          { key: 'modifiedAt', label: 'Modified', value: doc.modifiedAt, type: 'date', readonly: true },
        ],
      },
    ];
  }

  getAssetProperties(assetManager: AssetManager, assetId: string): PropertyGroup[] {
    const asset = assetManager.get(assetId);
    if (!asset) return [];
    return [
      {
        label: 'Asset',
        fields: [
          { key: 'id', label: 'ID', value: asset.id, type: 'text', readonly: true },
          { key: 'name', label: 'Name', value: asset.name, type: 'text' },
          { key: 'kind', label: 'Kind', value: asset.kind, type: 'text', readonly: true },
          { key: 'path', label: 'Path', value: asset.path, type: 'text' },
          { key: 'mimeType', label: 'MIME Type', value: asset.mimeType, type: 'text' },
          {
            key: 'fileSize',
            label: 'File Size',
            value: asset.fileSize ?? 0,
            type: 'number',
            readonly: true,
          },
          { key: 'description', label: 'Description', value: asset.description, type: 'text' },
          { key: 'tags', label: 'Tags', value: asset.tags, type: 'list' },
          { key: 'hash', label: 'Hash', value: asset.hash ?? '', type: 'text', readonly: true },
        ],
      },
    ];
  }
}
