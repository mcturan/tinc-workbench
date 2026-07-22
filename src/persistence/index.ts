import { ObjectEngine } from '../object-engine';
import { ProjectFileMetadata, PersistenceStorage } from './types';
import { PersistenceSerializer } from './serializer';
import { PersistenceDeserializer } from './deserializer';
import { PersistenceValidator } from './validator';
import { AutosaveService } from './autosave';
import { SessionRecoveryService } from './recovery';

export * from './types';
export * from './project-format';
export * from './validator';
export * from './serializer';
export * from './deserializer';
export * from './autosave';
export * from './recovery';

export class PersistenceManager {
  private serializer = new PersistenceSerializer();
  private deserializer = new PersistenceDeserializer();
  private validator = new PersistenceValidator();
  private autosaveService: AutosaveService;
  private recoveryService: SessionRecoveryService;

  constructor(
    private objectEngine: ObjectEngine,
    private storage: PersistenceStorage,
    private storageKey = 'tinc_project',
    private recoveryKey = 'tinc_recovery_snapshot'
  ) {
    this.autosaveService = new AutosaveService(objectEngine, storage, recoveryKey);
    this.recoveryService = new SessionRecoveryService(storage, recoveryKey);
  }

  createProject(projectId: string, name: string): void {
    this.objectEngine.loadProjectGraph(
      {
        id: projectId,
        name: name,
        pages: [],
      },
      [],
      []
    );
  }

  openProject(content: string): { success: boolean; error?: string } {
    return this.deserializer.deserialize(content, this.objectEngine);
  }

  saveProject(metadataOverrides?: Partial<ProjectFileMetadata>): string {
    const serialized = this.serializer.serialize(this.objectEngine, metadataOverrides);
    this.storage.setItem(this.storageKey, serialized);
    return serialized;
  }

  saveAs(metadataOverrides?: Partial<ProjectFileMetadata>): string {
    return this.serializer.serialize(this.objectEngine, metadataOverrides);
  }

  autosave(): boolean {
    return this.autosaveService.triggerAutosave();
  }

  recover(): boolean {
    return this.recoveryService.performRecovery(this.objectEngine);
  }

  validateProjectFile(content: string): { isValid: boolean; error?: string } {
    return this.validator.validate(content);
  }

  getAutosaveService(): AutosaveService {
    return this.autosaveService;
  }

  getRecoveryService(): SessionRecoveryService {
    return this.recoveryService;
  }
}
