/**
 * Physical Design Platform — Physical Rule Framework
 * PART 10: Rule infrastructure for clearance, width, via, hole, keepout, net class linkage
 */

import { generateUUID } from '../utils';
import {
  PhysicalRule,
  RuleKind,
  RulePriority,
  RuleCondition,
  NetClassRule,
  PhysicalObjectKind,
  PadType,
} from './types';

// ── Rule Factories ────────────────────────────────────────────────────────────

export function createClearanceRule(params: {
  name?: string;
  clearanceNm: number;
  condition?: RuleCondition;
  priority?: RulePriority;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Default Clearance',
    kind: 'clearance',
    priority: params.priority ?? 'normal',
    enabled: true,
    condition: params.condition,
    parameters: { clearance: params.clearanceNm },
    description: `Minimum clearance: ${params.clearanceNm} nm`,
  };
}

export function createTrackWidthRule(params: {
  name?: string;
  minWidthNm: number;
  maxWidthNm?: number;
  preferredWidthNm?: number;
  condition?: RuleCondition;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Track Width',
    kind: 'track-width',
    priority: 'normal',
    enabled: true,
    condition: params.condition,
    parameters: {
      minWidth: params.minWidthNm,
      maxWidth: params.maxWidthNm ?? 10_000_000,
      preferredWidth: params.preferredWidthNm ?? params.minWidthNm,
    },
  };
}

export function createViaSizeRule(params: {
  name?: string;
  minDiameterNm: number;
  minDrillNm: number;
  condition?: RuleCondition;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Via Size',
    kind: 'via-size',
    priority: 'normal',
    enabled: true,
    condition: params.condition,
    parameters: {
      minDiameter: params.minDiameterNm,
      minDrill: params.minDrillNm,
    },
  };
}

export function createHoleSizeRule(params: {
  name?: string;
  minSizeNm: number;
  maxSizeNm?: number;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Hole Size',
    kind: 'hole-size',
    priority: 'normal',
    enabled: true,
    parameters: {
      minSize: params.minSizeNm,
      maxSize: params.maxSizeNm ?? 10_000_000,
    },
  };
}

export function createKeepoutRule(params: {
  name?: string;
  noTracks?: boolean;
  noVias?: boolean;
  noPads?: boolean;
  noCopperFill?: boolean;
  condition?: RuleCondition;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Keepout',
    kind: 'keepout',
    priority: 'critical',
    enabled: true,
    condition: params.condition,
    parameters: {
      noTracks: params.noTracks ?? true,
      noVias: params.noVias ?? true,
      noPads: params.noPads ?? false,
      noCopperFill: params.noCopperFill ?? true,
    },
  };
}

export function createCopperSpacingRule(params: {
  name?: string;
  minSpacingNm: number;
  condition?: RuleCondition;
}): PhysicalRule {
  return {
    id: generateUUID(),
    name: params.name ?? 'Copper Spacing',
    kind: 'copper-edge',
    priority: 'normal',
    enabled: true,
    condition: params.condition,
    parameters: { minSpacing: params.minSpacingNm },
  };
}

export function createNetClassRule(params: NetClassRule): NetClassRule {
  return { ...params };
}

// ── Default Net Classes ───────────────────────────────────────────────────────

export const DEFAULT_NET_CLASS: NetClassRule = {
  netClassName: 'Default',
  trackWidth: 250_000,      // 0.25 mm
  trackWidthMin: 150_000,   // 0.15 mm
  clearance: 250_000,       // 0.25 mm
  viaDiameter: 800_000,     // 0.8 mm
  viaDrillDiameter: 400_000,// 0.4 mm
};

export const POWER_NET_CLASS: NetClassRule = {
  netClassName: 'Power',
  trackWidth: 500_000,      // 0.5 mm
  trackWidthMin: 250_000,
  clearance: 300_000,
  viaDiameter: 1_000_000,
  viaDrillDiameter: 600_000,
};

export const HIGH_SPEED_NET_CLASS: NetClassRule = {
  netClassName: 'HighSpeed',
  trackWidth: 150_000,
  trackWidthMin: 100_000,
  clearance: 150_000,
  viaDiameter: 600_000,
  viaDrillDiameter: 300_000,
  diffPairGap: 150_000,
  diffPairMaxUncoupled: 500_000,
};

// ── Physical Rule Manager ─────────────────────────────────────────────────────

export class PhysicalRuleManager {
  private rules: Map<string, PhysicalRule> = new Map();
  private netClasses: Map<string, NetClassRule> = new Map();

  constructor() {
    // Add built-in defaults
    this.addNetClass(DEFAULT_NET_CLASS);
  }

  // ── Live DRC Hooks ────────────────────────────────────────────────────────────
  
  checkRouting(segments: any[], vias: any[], spatialIndex: any, netId: string | null): string[] {
    const warnings: string[] = [];
    const clearance = this.getClearanceForNet('Default'); // Simplification for alpha

    for (const seg of segments) {
      const minX = Math.min(seg.startX, seg.endX);
      const maxX = Math.max(seg.startX, seg.endX);
      const minY = Math.min(seg.startY, seg.endY);
      const maxY = Math.max(seg.startY, seg.endY);
      
      const bbox = { minX, minY, maxX, maxY };
      const candidates = spatialIndex.collisionCandidates(bbox, clearance);
      
      for (const cand of candidates) {
        if (cand.layerId !== seg.layer) continue;
        if (netId && cand.netId === netId) continue; // Same net is fine
        
        // Very basic AABB intersection for alpha live DRC
        warnings.push(`Clearance violation detected with object ${cand.id} on layer ${seg.layer}`);
        break; // One warning per segment is enough
      }
    }

    for (const via of vias) {
      const r = via.diameter / 2;
      const bbox = { minX: via.x - r, minY: via.y - r, maxX: via.x + r, maxY: via.y + r };
      const candidates = spatialIndex.collisionCandidates(bbox, clearance);
      
      for (const cand of candidates) {
        if (netId && cand.netId === netId) continue;
        warnings.push(`Via clearance violation with object ${cand.id}`);
        break;
      }
    }

    return warnings;
  }

  // ── Rule CRUD ────────────────────────────────────────────────────────────────

  addRule(rule: PhysicalRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule ID collision: ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
  }

  getRule(id: string): PhysicalRule | undefined {
    return this.rules.get(id);
  }

  updateRule(id: string, updates: Partial<Omit<PhysicalRule, 'id'>>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    Object.assign(rule, updates);
    return true;
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  enableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = true;
    return true;
  }

  disableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = false;
    return true;
  }

  getAllRules(): PhysicalRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): PhysicalRule[] {
    return this.getAllRules().filter((r) => r.enabled);
  }

  getRulesByKind(kind: RuleKind): PhysicalRule[] {
    return this.getEnabledRules().filter((r) => r.kind === kind);
  }

  // ── Rule Inheritance ────────────────────────────────────────────────────────

  /** Get effective rules for a given kind, resolving inheritance chain */
  getEffectiveRules(kind: RuleKind, condition?: Partial<RuleCondition>): PhysicalRule[] {
    const rules = this.getRulesByKind(kind).filter((r) => this.matchesCondition(r, condition));
    return rules.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
  }

  /** Get effective parameter value from highest-priority matching rule */
  getEffectiveParameter(kind: RuleKind, param: string, condition?: Partial<RuleCondition>): number | string | boolean | undefined {
    const rules = this.getEffectiveRules(kind, condition);
    for (const rule of rules) {
      if (rule.parameters[param] !== undefined) {
        return rule.parameters[param];
      }
    }
    return undefined;
  }

  private matchesCondition(rule: PhysicalRule, condition?: Partial<RuleCondition>): boolean {
    if (!rule.condition) return true;
    if (!condition) return true;
    if (rule.condition.netClassA && condition.netClassA && rule.condition.netClassA !== condition.netClassA) return false;
    if (rule.condition.layerIds && condition.layerIds) {
      const ruleLayerSet = new Set(rule.condition.layerIds);
      if (!condition.layerIds.some((l) => ruleLayerSet.has(l))) return false;
    }
    return true;
  }

  private priorityWeight(p: RulePriority): number {
    return { low: 0, normal: 1, high: 2, critical: 3 }[p];
  }

  // ── Net Classes ─────────────────────────────────────────────────────────────

  addNetClass(nc: NetClassRule): void {
    this.netClasses.set(nc.netClassName, nc);
  }

  getNetClass(name: string): NetClassRule | undefined {
    return this.netClasses.get(name);
  }

  updateNetClass(name: string, updates: Partial<NetClassRule>): boolean {
    const nc = this.netClasses.get(name);
    if (!nc) return false;
    Object.assign(nc, updates);
    return true;
  }

  removeNetClass(name: string): boolean {
    if (name === 'Default') return false; // protect default
    return this.netClasses.delete(name);
  }

  getAllNetClasses(): NetClassRule[] {
    return Array.from(this.netClasses.values());
  }

  /** Get effective clearance for a net (falls back to Default) */
  getClearanceForNet(netClassName: string): number {
    const nc = this.netClasses.get(netClassName) ?? this.netClasses.get('Default');
    return nc?.clearance ?? 250_000;
  }

  /** Get effective track width for a net */
  getTrackWidthForNet(netClassName: string): number {
    const nc = this.netClasses.get(netClassName) ?? this.netClasses.get('Default');
    return nc?.trackWidth ?? 250_000;
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  serialize(): { rules: PhysicalRule[]; netClasses: NetClassRule[] } {
    return {
      rules: this.getAllRules(),
      netClasses: this.getAllNetClasses(),
    };
  }

  static deserialize(data: { rules: PhysicalRule[]; netClasses: NetClassRule[] }): PhysicalRuleManager {
    const manager = new PhysicalRuleManager();
    manager.netClasses.clear();
    for (const rule of data.rules) manager.rules.set(rule.id, rule);
    for (const nc of data.netClasses) manager.netClasses.set(nc.netClassName, nc);
    return manager;
  }
}
