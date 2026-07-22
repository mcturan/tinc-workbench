import { ObjectEngine } from '../object-engine';
import { ElectricalConstraintEngine } from '../constraint-engine';
import { LiveValidationState, FeedbackStatus } from './types';
import { LogicalConnection } from '../types';

export class PreviewValidator {
  private constraintEngine = new ElectricalConstraintEngine();

  validatePreview(
    sourceTerminal: { type: 'PORT' | 'PIN'; terminalId: string; componentId: string },
    hoveredTerminalId: string | null,
    hoveredComponentId: string | null,
    objectEngine: ObjectEngine
  ): LiveValidationState {
    if (!hoveredTerminalId || !hoveredComponentId) {
      return {
        sourceTerminalId: sourceTerminal.terminalId,
        hoveredTerminalId: null,
        status: 'NONE',
        message: null,
      };
    }

    // Determine target pin type (port or pin)
    const targetComp = objectEngine.getObject(hoveredComponentId);
    if (!targetComp) {
      return {
        sourceTerminalId: sourceTerminal.terminalId,
        hoveredTerminalId,
        status: 'NONE',
        message: null,
      };
    }

    const isPort = (targetComp as any).ports?.some((p: any) => p.id === hoveredTerminalId) ?? false;

    // Build mock connection
    const mockConn: LogicalConnection = {
      id: 'temp-preview-connection',
      source: {
        type: sourceTerminal.type,
        targetId: sourceTerminal.terminalId,
      },
      target: {
        type: isPort ? 'PORT' : 'PIN',
        targetId: hoveredTerminalId,
      },
      netId: 'temp-preview-net',
    };

    // Run constraint engine validation
    const diagnostics = this.constraintEngine.validateConnection(mockConn, objectEngine);

    if (diagnostics.length === 0) {
      return {
        sourceTerminalId: sourceTerminal.terminalId,
        hoveredTerminalId,
        status: 'GREEN',
        message: null,
      };
    }

    // Determine highest severity diagnostic
    let highestSeverity: 'ERROR' | 'WARNING' | 'INFO' | null = null;
    let selectedDiag = diagnostics[0];

    const severityOrder = { ERROR: 3, WARNING: 2, INFO: 1 };

    for (const d of diagnostics) {
      const currentSevVal = severityOrder[d.severity];
      const highestSevVal = highestSeverity ? severityOrder[highestSeverity] : 0;
      if (currentSevVal > highestSevVal) {
        highestSeverity = d.severity;
        selectedDiag = d;
      }
    }

    let status: FeedbackStatus = 'GREEN';
    if (highestSeverity === 'ERROR') {
      status = 'RED';
    } else if (highestSeverity === 'WARNING') {
      status = 'YELLOW';
    }

    return {
      sourceTerminalId: sourceTerminal.terminalId,
      hoveredTerminalId,
      status,
      message: selectedDiag.message,
    };
  }
}
