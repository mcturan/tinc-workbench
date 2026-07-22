/**
 * Project System — Metadata Manager
 *
 * Owns the mutable ProjectMetadata record for a single project.
 * UUID and createdAt are immutable after construction.
 */

import { ProjectMetadata, ProjectStatus } from './types';
import { createDefaultMetadata } from './defaults';
import { generateUUID } from '../utils';

export class MetadataManager {
  private metadata: ProjectMetadata;

  constructor(name = 'Untitled Project', initial?: Partial<ProjectMetadata>) {
    this.metadata = createDefaultMetadata(name, initial);
  }

  get(): ProjectMetadata {
    return { ...this.metadata, tags: [...this.metadata.tags], customFields: { ...this.metadata.customFields } };
  }

  update(patch: Partial<Omit<ProjectMetadata, 'uuid' | 'createdAt'>>): void {
    this.metadata = {
      ...this.metadata,
      ...patch,
      uuid: this.metadata.uuid,
      createdAt: this.metadata.createdAt,
      modifiedAt: new Date().toISOString(),
    };
  }

  bumpRevision(): void {
    this.metadata.revision += 1;
    this.metadata.modifiedAt = new Date().toISOString();
  }

  setStatus(status: ProjectStatus): void {
    this.metadata.status = status;
    this.metadata.modifiedAt = new Date().toISOString();
  }

  bumpVersion(part: 'major' | 'minor' | 'patch' = 'patch'): void {
    const parts = this.metadata.version.split('.').map(Number);
    const major = parts[0] ?? 1;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;
    if (part === 'major') this.metadata.version = `${major + 1}.0.0`;
    else if (part === 'minor') this.metadata.version = `${major}.${minor + 1}.0`;
    else this.metadata.version = `${major}.${minor}.${patch + 1}`;
    this.metadata.modifiedAt = new Date().toISOString();
  }

  addTag(tag: string): void {
    const t = tag.trim();
    if (t && !this.metadata.tags.includes(t)) {
      this.metadata.tags = [...this.metadata.tags, t];
    }
  }

  removeTag(tag: string): void {
    this.metadata.tags = this.metadata.tags.filter(t => t !== tag);
  }

  setCustomField(key: string, value: string): void {
    this.metadata.customFields = { ...this.metadata.customFields, [key]: value };
  }

  removeCustomField(key: string): void {
    const copy = { ...this.metadata.customFields };
    delete copy[key];
    this.metadata.customFields = copy;
  }

  restore(snapshot: ProjectMetadata): void {
    this.metadata = {
      ...snapshot,
      tags: [...snapshot.tags],
      customFields: { ...snapshot.customFields },
    };
  }

  generateNewUUID(): void {
    this.metadata.uuid = generateUUID();
  }

  touch(): void {
    this.metadata.modifiedAt = new Date().toISOString();
  }
}
