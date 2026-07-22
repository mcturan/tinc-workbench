import { RuleProfile, NetClassRule } from './types';
import { createClearanceRule, createTrackWidthRule, createViaSizeRule } from './rules';

export const DEFAULT_PROFILE: RuleProfile = {
  id: 'profile-default',
  name: 'Default',
  description: 'Standard multi-purpose design rules',
  isDefault: true,
  rules: [
    createClearanceRule({ clearanceNm: 250_000 }), // 0.25mm
    createTrackWidthRule({ minWidthNm: 250_000, preferredWidthNm: 250_000 }),
    createViaSizeRule({ minDiameterNm: 800_000, minDrillNm: 400_000 }),
  ],
  netClasses: [
    {
      netClassName: 'Default',
      trackWidth: 250_000,
      clearance: 250_000,
      viaDiameter: 800_000,
      viaDrillDiameter: 400_000,
    }
  ]
};

export const RELAXED_PROFILE: RuleProfile = {
  id: 'profile-relaxed',
  name: 'Relaxed',
  description: 'Forgiving rules for home etching and basic fabrication',
  isDefault: false,
  rules: [
    createClearanceRule({ clearanceNm: 500_000 }), // 0.5mm
    createTrackWidthRule({ minWidthNm: 500_000, preferredWidthNm: 600_000 }),
    createViaSizeRule({ minDiameterNm: 1_200_000, minDrillNm: 800_000 }),
  ],
  netClasses: [
    {
      netClassName: 'Default',
      trackWidth: 500_000,
      clearance: 500_000,
      viaDiameter: 1_200_000,
      viaDrillDiameter: 800_000,
    }
  ]
};

export const MANUFACTURING_PROFILE: RuleProfile = {
  id: 'profile-manufacturing',
  name: 'Manufacturing',
  description: 'Aggressive rules for high-density commercial PCB fabrication',
  isDefault: false,
  rules: [
    createClearanceRule({ clearanceNm: 127_000 }), // 5 mil / 0.127mm
    createTrackWidthRule({ minWidthNm: 127_000, preferredWidthNm: 150_000 }),
    createViaSizeRule({ minDiameterNm: 450_000, minDrillNm: 200_000 }),
  ],
  netClasses: [
    {
      netClassName: 'Default',
      trackWidth: 127_000,
      clearance: 127_000,
      viaDiameter: 450_000,
      viaDrillDiameter: 200_000,
    }
  ]
};

export const BUILTIN_RULE_PROFILES: RuleProfile[] = [
  DEFAULT_PROFILE,
  RELAXED_PROFILE,
  MANUFACTURING_PROFILE
];

export function getRuleProfile(id: string): RuleProfile | undefined {
  return BUILTIN_RULE_PROFILES.find(p => p.id === id);
}

export function applyRuleProfileToBoard(board: any, profile: RuleProfile): void {
  board.rules = profile.rules.map((r: any) => ({ ...r }));
  board.netClasses = profile.netClasses.map((nc: any) => ({ ...nc }));
}
