import { ObjectEngine } from '../object-engine';
import { LogicalConnection } from '../types';
import { ConstraintDiagnostic } from './types';
import { validateConnection, validateComponent, validateProject } from './validator';

export class ElectricalConstraintEngine {
  validateConnection(conn: LogicalConnection, objectEngine: ObjectEngine): ConstraintDiagnostic[] {
    return validateConnection(conn, objectEngine);
  }

  validateComponent(compId: string, objectEngine: ObjectEngine): ConstraintDiagnostic[] {
    return validateComponent(compId, objectEngine);
  }

  validateProject(objectEngine: ObjectEngine): ConstraintDiagnostic[] {
    return validateProject(objectEngine);
  }
}
