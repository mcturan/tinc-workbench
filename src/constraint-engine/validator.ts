import { ObjectEngine } from '../object-engine';
import { LogicalConnection, SemanticObject } from '../types';
import { globalRegistry } from '../component-library';
import { ConstraintDiagnostic } from './types';
import { createDiagnostic } from './diagnostics';
import { isGroundPin, isLedAnode, isMcuGpio } from './rules';
import { buildGraph } from '../net-engine';

export function validateConnection(conn: LogicalConnection, objectEngine: ObjectEngine): ConstraintDiagnostic[] {
  const diagnostics: ConstraintDiagnostic[] = [];

  let sourcePinCtx: any = null;
  let targetPinCtx: any = null;

  // 1. Resolve source endpoint (Rule 007 check)
  if (conn.source.type !== 'FLOATING') {
    const termId = conn.source.targetId;
    const comp = objectEngine.getComponentByTerminalId(termId);
    if (!comp) {
      diagnostics.push(createDiagnostic(
        'ERROR',
        'RULE-007',
        'Missing Connection Endpoint',
        `Source pin '${termId}' does not exist on any registered component.`,
        '',
        termId,
        '',
        '',
        'Verify pin connections or component registration.'
      ));
    } else {
      const metadata = globalRegistry.getById(comp.type);
      const metadataPin = metadata?.electrical.pins.find(p => p.id === termId);
      const objPin = comp.ports.find(p => p.id === termId) || comp.pins.find(p => p.id === termId);

      if (!metadataPin && !objPin) {
        diagnostics.push(createDiagnostic(
          'ERROR',
          'RULE-007',
          'Missing Connection Endpoint',
          `Source pin '${termId}' does not exist on component '${comp.name}'.`,
          comp.id,
          termId,
          '',
          '',
          'Ensure the pin exists on the component.'
        ));
      } else {
        sourcePinCtx = {
          comp,
          pinId: termId,
          direction: metadataPin?.direction || objPin?.direction || 'unspecified',
          electricalType: metadataPin?.electricalType || objPin?.signalCategory || 'unspecified',
          name: metadataPin?.name || objPin?.name || termId,
          aliases: metadataPin?.aliases || [],
          metadataPin,
        };
      }
    }
  }

  // 2. Resolve target endpoint (Rule 007 check)
  if (conn.target.type !== 'FLOATING') {
    const termId = conn.target.targetId;
    const comp = objectEngine.getComponentByTerminalId(termId);
    if (!comp) {
      diagnostics.push(createDiagnostic(
        'ERROR',
        'RULE-007',
        'Missing Connection Endpoint',
        `Target pin '${termId}' does not exist on any registered component.`,
        '',
        '',
        '',
        termId,
        'Verify pin connections or component registration.'
      ));
    } else {
      const metadata = globalRegistry.getById(comp.type);
      const metadataPin = metadata?.electrical.pins.find(p => p.id === termId);
      const objPin = comp.ports.find(p => p.id === termId) || comp.pins.find(p => p.id === termId);

      if (!metadataPin && !objPin) {
        diagnostics.push(createDiagnostic(
          'ERROR',
          'RULE-007',
          'Missing Connection Endpoint',
          `Target pin '${termId}' does not exist on component '${comp.name}'.`,
          '',
          '',
          comp.id,
          termId,
          'Ensure the pin exists on the component.'
        ));
      } else {
        targetPinCtx = {
          comp,
          pinId: termId,
          direction: metadataPin?.direction || objPin?.direction || 'unspecified',
          electricalType: metadataPin?.electricalType || objPin?.signalCategory || 'unspecified',
          name: metadataPin?.name || objPin?.name || termId,
          aliases: metadataPin?.aliases || [],
          metadataPin,
        };
      }
    }
  }

  // Fail fast on missing pin references
  if (diagnostics.length > 0) {
    return diagnostics;
  }

  // 3. Rule 006: Duplicate connection check
  if (conn.source.type !== 'FLOATING' && conn.target.type !== 'FLOATING') {
    const existing = objectEngine.getConnections();
    let dupCount = 0;
    for (const other of existing) {
      if (other.id === conn.id) continue;
      if (other.source.type !== 'FLOATING' && other.target.type !== 'FLOATING') {
        const otherPins = new Set([other.source.targetId, other.target.targetId]);
        if (otherPins.has(conn.source.targetId) && otherPins.has(conn.target.targetId)) {
          dupCount++;
        }
      }
    }
    if (dupCount > 0) {
      diagnostics.push(createDiagnostic(
        'ERROR',
        'RULE-006',
        'Duplicate Connection',
        `A connection already exists between '${conn.source.targetId}' and '${conn.target.targetId}'.`,
        sourcePinCtx.comp.id,
        conn.source.targetId,
        targetPinCtx.comp.id,
        conn.target.targetId,
        'Remove one of the redundant connections.'
      ));
    }
  }

  if (!sourcePinCtx || !targetPinCtx) {
    return diagnostics;
  }

  const isPower1 = sourcePinCtx.electricalType === 'power';
  const isPower2 = targetPinCtx.electricalType === 'power';

  // 4. Rule 001: Output -> Output Conflict
  if (!isPower1 && !isPower2) {
    if (sourcePinCtx.direction === 'output' && targetPinCtx.direction === 'output') {
      diagnostics.push(createDiagnostic(
        'ERROR',
        'RULE-001',
        'Output Conflict',
        `Cannot connect output pin '${sourcePinCtx.name}' on '${sourcePinCtx.comp.name}' directly to output pin '${targetPinCtx.name}' on '${targetPinCtx.comp.name}'.`,
        sourcePinCtx.comp.id,
        sourcePinCtx.pinId,
        targetPinCtx.comp.id,
        targetPinCtx.pinId,
        'Insert a buffer or logic gate, or change pin configuration.'
      ));
    }

    // 5. Rule 002: Input -> Input warning
    if (sourcePinCtx.direction === 'input' && targetPinCtx.direction === 'input') {
      diagnostics.push(createDiagnostic(
        'WARNING',
        'RULE-002',
        'Floating Inputs',
        `Connecting input pin '${sourcePinCtx.name}' on '${sourcePinCtx.comp.name}' directly to input pin '${targetPinCtx.name}' on '${targetPinCtx.comp.name}' creates a net without a driver.`,
        sourcePinCtx.comp.id,
        sourcePinCtx.pinId,
        targetPinCtx.comp.id,
        targetPinCtx.pinId,
        'Ensure the net is also connected to an output driver or pull-up/pull-down resistor.'
      ));
    }
  }

  if (isPower1 && isPower2) {
    const isGnd1 = isGroundPin(sourcePinCtx.pinId, sourcePinCtx.name, sourcePinCtx.aliases);
    const isGnd2 = isGroundPin(targetPinCtx.pinId, targetPinCtx.name, targetPinCtx.aliases);

    if (isGnd1 && isGnd2) {
      // Ground -> Ground: Rule 004 OK. No diagnostic.
    } else {
      diagnostics.push(createDiagnostic(
        'ERROR',
        'RULE-003',
        'Power Rail Conflict',
        `Direct connection between power pins '${sourcePinCtx.name}' on '${sourcePinCtx.comp.name}' and '${targetPinCtx.name}' on '${targetPinCtx.comp.name}' is prohibited.`,
        sourcePinCtx.comp.id,
        sourcePinCtx.pinId,
        targetPinCtx.comp.id,
        targetPinCtx.pinId,
        'Use components in series or keep power rails separate.'
      ));
    }
  }

  // 7. Rule 005 (Direct line check): LED Anode directly to GPIO
  const isLed1 = isLedAnode(sourcePinCtx.comp, sourcePinCtx.pinId, sourcePinCtx.metadataPin);
  const isLed2 = isLedAnode(targetPinCtx.comp, targetPinCtx.pinId, targetPinCtx.metadataPin);

  const isGpio1 = isMcuGpio(sourcePinCtx.comp, sourcePinCtx.pinId, sourcePinCtx.metadataPin);
  const isGpio2 = isMcuGpio(targetPinCtx.comp, targetPinCtx.pinId, targetPinCtx.metadataPin);

  if ((isLed1 && isGpio2) || (isLed2 && isGpio1)) {
    const ledCtx = isLed1 ? sourcePinCtx : targetPinCtx;
    const gpioCtx = isLed1 ? targetPinCtx : sourcePinCtx;
    diagnostics.push(createDiagnostic(
      'WARNING',
      'RULE-005',
      'Direct LED Connection',
      `LED anode on '${ledCtx.comp.name}' is connected directly to GPIO '${gpioCtx.pinId}' on '${gpioCtx.comp.name}' without a series resistor.`,
      ledCtx.comp.id,
      ledCtx.pinId,
      gpioCtx.comp.id,
      gpioCtx.pinId,
      'Insert a series resistor between the LED anode and the GPIO pin to limit current.'
    ));
  }

  return diagnostics;
}

export function validateComponent(compId: string, objectEngine: ObjectEngine): ConstraintDiagnostic[] {
  const diagnostics: ConstraintDiagnostic[] = [];
  const comp = objectEngine.getObject(compId) as SemanticObject;
  if (!comp) return [];

  const allConns = objectEngine.getConnections();
  for (const conn of allConns) {
    let referencesComp = false;

    if (conn.source.type !== 'FLOATING') {
      const owner = objectEngine.getComponentByTerminalId(conn.source.targetId);
      if (owner && owner.id === compId) {
        referencesComp = true;
      }
    }

    if (conn.target.type !== 'FLOATING') {
      const owner = objectEngine.getComponentByTerminalId(conn.target.targetId);
      if (owner && owner.id === compId) {
        referencesComp = true;
      }
    }

    if (referencesComp) {
      diagnostics.push(...validateConnection(conn, objectEngine));
    }
  }

  const seen = new Set<string>();
  return diagnostics.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

export function validateProject(objectEngine: ObjectEngine): ConstraintDiagnostic[] {
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const conn of objectEngine.getConnections()) {
    diagnostics.push(...validateConnection(conn, objectEngine));
  }

  const graph = buildGraph(objectEngine);
  const nets = graph.listNets();

  for (const net of nets) {
    let ledAnodeTerminal: string | null = null;
    let ledObj: SemanticObject | null = null;
    let gpioTerminal: string | null = null;
    let gpioObj: SemanticObject | null = null;

    for (const ref of net.pins) {
      const obj = objectEngine.getObject(ref.componentId) as SemanticObject;
      if (!obj) continue;

      const metadata = globalRegistry.getById(obj.type);
      const metadataPin = metadata?.electrical.pins.find(p => p.id === ref.pinId);

      if (isLedAnode(obj, ref.pinId, metadataPin)) {
        ledAnodeTerminal = ref.pinId;
        ledObj = obj;
      }
      if (isMcuGpio(obj, ref.pinId, metadataPin)) {
        gpioTerminal = ref.pinId;
        gpioObj = obj;
      }
    }

    if (ledAnodeTerminal && gpioTerminal && ledObj && gpioObj) {
      const isAlreadyLogged = diagnostics.some(d =>
        d.code === 'RULE-005' &&
        ((d.sourceObjectId === ledObj!.id && d.targetObjectId === gpioObj!.id) ||
         (d.sourceObjectId === gpioObj!.id && d.targetObjectId === ledObj!.id))
      );

      if (!isAlreadyLogged) {
        diagnostics.push(createDiagnostic(
          'WARNING',
          'RULE-005',
          'Direct LED Connection',
          `LED anode on '${ledObj.name}' is connected directly to GPIO '${gpioTerminal}' on '${gpioObj.name}' without a series resistor.`,
          ledObj.id,
          ledAnodeTerminal,
          gpioObj.id,
          gpioTerminal,
          'Insert a series resistor between the LED anode and the GPIO pin to limit current.'
        ));
      }
    }
  }

  const seen = new Set<string>();
  return diagnostics.filter(d => {
    const key = `${d.code}:${d.sourceObjectId}:${d.sourcePinId}:${d.targetObjectId}:${d.targetPinId}`;
    const altKey = `${d.code}:${d.targetObjectId}:${d.targetPinId}:${d.sourceObjectId}:${d.sourcePinId}`;
    if (seen.has(key) || seen.has(altKey)) return false;
    seen.add(key);
    return true;
  });
}
