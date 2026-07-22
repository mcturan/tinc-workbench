import { ObjectEngine } from '../object-engine';
import { PersistenceValidator } from './validator';
import { PersistenceStorage } from './types';
import { PersistenceDeserializer } from './deserializer';

export class SessionRecoveryService {
  private validator = new PersistenceValidator();
  private deserializer = new PersistenceDeserializer();

  constructor(
    private storage: PersistenceStorage,
    private recoveryKey: string
  ) {}

  hasRecoverySnapshot(): boolean {
    const data = this.storage.getItem(this.recoveryKey);
    if (!data) return false;

    const valResult = this.validator.validate(data);
    return valResult.isValid;
  }

  getRecoveryMetadata(): any {
    const data = this.storage.getItem(this.recoveryKey);
    if (!data) return null;

    const valResult = this.validator.validate(data);
    if (!valResult.isValid || !valResult.data) return null;

    return valResult.data.metadata;
  }

  performRecovery(targetEngine: ObjectEngine): boolean {
    const data = this.storage.getItem(this.recoveryKey);
    if (!data) return false;

    const result = this.deserializer.deserialize(data, targetEngine);
    if (result.success) {
      this.storage.removeItem(this.recoveryKey);
      return true;
    }
    return false;
  }

  clearRecoverySnapshot(): void {
    this.storage.removeItem(this.recoveryKey);
  }
}
