import { ObjectEngine } from '../object-engine';
import { resolveHierarchy } from '../hierarchy';
import { ERCRulesEvaluator } from './rules';
import { generateERCReport } from './report';
import { formatERCReport } from './formatter';
import { ERCReport, ERCDiagnostic } from './types';

export class ERCEngine {
  private lastReport: ERCReport | null = null;

  run(objectEngine: ObjectEngine): ERCReport {
    const startTime = Date.now();

    const graph = resolveHierarchy(objectEngine);

    let componentCount = 0;
    for (const page of objectEngine.getProject().pages || []) {
      for (const layer of page.layers || []) {
        componentCount += (layer.objects || []).length;
      }
    }
    const netCount = graph.listNets().length;

    const evaluator = new ERCRulesEvaluator(objectEngine, graph);
    const diagnostics = evaluator.evaluate();

    const executionTimeMs = Math.max(0, Date.now() - startTime);

    const report = generateERCReport(diagnostics, componentCount, netCount, executionTimeMs);
    this.lastReport = report;

    return report;
  }

  getDiagnostics(): ERCDiagnostic[] {
    return this.lastReport ? this.lastReport.diagnostics : [];
  }

  formatReport(): string {
    return this.lastReport ? formatERCReport(this.lastReport) : '';
  }

  hasErrors(): boolean {
    return this.lastReport ? this.lastReport.summary.errors > 0 : false;
  }

  hasWarnings(): boolean {
    return this.lastReport ? this.lastReport.summary.warnings > 0 : false;
  }
}

const ercEngine = new ERCEngine();

export const runERC = (objectEngine: ObjectEngine): ERCReport => ercEngine.run(objectEngine);
export const getDiagnostics = (): ERCDiagnostic[] => ercEngine.getDiagnostics();
export const formatReport = (): string => ercEngine.formatReport();
export const hasErrors = (): boolean => ercEngine.hasErrors();
export const hasWarnings = (): boolean => ercEngine.hasWarnings();
export const hasInfo = (): boolean => ercEngine.hasErrors() || ercEngine.hasWarnings();
