import { createPlan, describePlan, validatePlan, lookupKnowledge } from '../src/ai';
import { createComponentIntent, connectIntent, addComponentIntent, moveComponentIntent, deleteWireIntent } from '../src/ai/intent';
import { IntentPlanner } from '../src/ai/planner';

describe('AI Readiness & Planning Tests', () => {
  describe('Intent Models', () => {
    it('should build structured data models from intent constructors', () => {
      const intent1 = createComponentIntent('ESP32', 'My ESP');
      expect(intent1.type).toBe('CreateComponentIntent');
      expect(intent1.payload.componentType).toBe('ESP32');
      expect(intent1.payload.name).toBe('My ESP');

      const intent2 = connectIntent('comp-1', 'A', 'comp-2', 'K');
      expect(intent2.type).toBe('ConnectIntent');
      expect(intent2.payload.sourceId).toBe('comp-1');
      expect(intent2.payload.targetPortPinId).toBe('K');

      const intent3 = addComponentIntent('LED');
      expect(intent3.type).toBe('AddComponentIntent');
      expect(intent3.payload.componentType).toBe('LED');

      const intent4 = moveComponentIntent('comp-led', 120, 240);
      expect(intent4.type).toBe('MoveComponentIntent');
      expect(intent4.payload.componentId).toBe('comp-led');
      expect(intent4.payload.x).toBe(120);

      const intent5 = deleteWireIntent('wire-12');
      expect(intent5.type).toBe('DeleteWireIntent');
      expect(intent5.payload.wireId).toBe('wire-12');
    });
  });

  describe('Command Plan & Immutability', () => {
    it('should build immutable command plans and describe them', () => {
      const plan = createPlan(
        'plan-001',
        'Add a pull-up resistor to pin GPIO21',
        0.95,
        [
          { type: 'CreateComponent', payload: { type: 'Resistor', name: 'R1' } },
          { type: 'CreateConnection', payload: { sourceId: 'ESP32', targetId: 'R1' } },
        ],
        [],
        ['Assume MCU is powered', 'Assume resistor is 10k']
      );

      expect(plan.id).toBe('plan-001');
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.requiredCommands)).toBe(true);
      expect(Object.isFrozen(plan.requiredCommands[0])).toBe(true);
      expect(Object.isFrozen(plan.assumptions)).toBe(true);

      const description = describePlan(plan);
      expect(description).toContain('plan-001');
      expect(description).toContain('95.0%');
      expect(description).toContain('Resistor');
      expect(description).toContain('resistor is 10k');
    });
  });

  describe('Knowledge Lookup API', () => {
    it('should support deterministic lookup of registered components', () => {
      const meta = lookupKnowledge.getComponent('ESP32');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('ESP32 DevKit');

      const pins = lookupKnowledge.getPins('ESP32');
      expect(pins).toBeDefined();
      expect(pins?.length).toBeGreaterThan(0);

      const warnings = lookupKnowledge.getWarnings('LED');
      expect(warnings).toBeDefined();
      expect(warnings?.length).toBeGreaterThan(0);

      const apps = lookupKnowledge.getApplications('Resistor');
      expect(apps).toBeDefined();
      expect(apps?.length).toBeGreaterThan(0);

      const searchResults = lookupKnowledge.searchKnowledge('MCU');
      expect(searchResults.some((c) => c.id === 'ESP32')).toBe(true);
    });
  });

  describe('Planner Interface', () => {
    it('should translate user intent into structured command plans', () => {
      const planner = new IntentPlanner();
      const intent = createComponentIntent('LED', 'Indicator');
      const plan = planner.plan(intent);

      expect(plan.id).toBeDefined();
      expect(plan.confidence).toBe(0.95);
      expect(plan.requiredCommands.length).toBe(1);
      expect(plan.requiredCommands[0].type).toBe('CreateComponent');
      expect(plan.requiredCommands[0].payload.name).toBe('Indicator');
      expect(plan.requiredCommands[0].payload.type).toBe('LED');
    });
  });

  describe('Validator', () => {
    it('should validate valid plans cleanly', () => {
      const plan = createPlan(
        'plan-ok',
        'Valid Plan',
        0.8,
        [{ type: 'CreateComponent', payload: { type: 'LED', id: 'comp-1' } }],
        [],
        []
      );

      const result = validatePlan(plan);
      expect(result.isValid).toBe(true);
      expect(result.diagnostics.length).toBe(0);
    });

    it('should reject empty plans', () => {
      const plan = createPlan('plan-empty', 'Empty Plan', 0.5, [], [], []);
      const result = validatePlan(plan);

      expect(result.isValid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'EMPTY_PLAN_COMMANDS')).toBe(true);
    });

    it('should reject plans with duplicate commands', () => {
      const plan = createPlan(
        'plan-dup',
        'Duplicate Plan',
        0.9,
        [
          { type: 'CreateComponent', payload: { type: 'LED', id: 'comp-1' } },
          { type: 'CreateComponent', payload: { type: 'LED', id: 'comp-1' } },
        ],
        [],
        []
      );
      const result = validatePlan(plan);

      expect(result.isValid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'DUPLICATE_COMMAND')).toBe(true);
    });

    it('should reject plans with unknown component types', () => {
      const plan = createPlan(
        'plan-unk',
        'Unknown Component Plan',
        0.95,
        [{ type: 'CreateComponent', payload: { type: 'UnknownMCU', id: 'comp-1' } }],
        [],
        []
      );
      const result = validatePlan(plan);

      expect(result.isValid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_COMPONENT_TYPE')).toBe(true);
    });

    it('should reject plans with invalid confidence bounds', () => {
      const plan = createPlan(
        'plan-conf',
        'Invalid Confidence Plan',
        2.5,
        [{ type: 'CreateComponent', payload: { type: 'LED', id: 'comp-1' } }],
        [],
        []
      );
      const result = validatePlan(plan);

      expect(result.isValid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'INVALID_CONFIDENCE')).toBe(true);
    });
  });
});
