import { ObjectEngine } from '../object-engine';
import { ElectricalGraphInstance } from '../net-engine/graph';
import { ERCDiagnostic } from './types';
import { createERCDiagnostic } from './diagnostics';
import { globalRegistry } from '../component-library';
import { SemanticObject } from '../types';
import { getComponentByPath } from '../hierarchy';
import { listNoConnectMarkers } from '../pro-schematic/connectors/manager';
import { listBuses, listBusEntries, listBusTaps } from '../pro-schematic/bus/manager';
import { validateBusLabel, parseBusLabel, expandBusLabel } from '../pro-schematic/bus/labels';

export class ERCRulesEvaluator {
  private objectEngine: ObjectEngine;
  private graph: ElectricalGraphInstance;
  private diagnostics: ERCDiagnostic[] = [];

  constructor(objectEngine: ObjectEngine, graph: ElectricalGraphInstance) {
    this.objectEngine = objectEngine;
    this.graph = graph;
  }

  evaluate(): ERCDiagnostic[] {
    this.diagnostics = [];

    // General checks
    this.checkDuplicateObjectIds();
    this.checkMissingComponentDefinitions();
    this.checkInvalidReferencesAndUnresolvedNets();

    // Connectivity & Traversal checks
    this.checkIsolatedComponents();
    this.checkOrphanWires();
    this.checkDanglingAndFloatingNets();

    // Power checks
    this.checkPowerShortsAndSources();
    this.checkMissingGroundOrSupply();

    // Passive Component checks
    this.checkLedWithoutResistor();
    this.checkCapacitorPolarity();

    // Digital checks
    this.checkDigitalConflicts();

    // Bus checks
    this.checkBusRules();

    // Deterministic sorting of diagnostics by ID to ensure stable ordering
    return this.diagnostics.sort((a, b) => a.id.localeCompare(b.id));
  }

  private isPowerPin(name: string, aliases: string[] = []): boolean {
    const list = [name.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    return list.some(x => {
      if (x === 'vcc' || x === 'vdd' || x === '3v3' || x === '5v' || x === 'power' || x === 'vin' || x === 'v+') {
        return true;
      }
      return x.startsWith('vcc') || x.startsWith('vdd') || x.includes('3v3') || x.includes('5v') || x.startsWith('vin') || x === '3.3v';
    });
  }

  private isGndPin(name: string, aliases: string[] = []): boolean {
    const list = [name.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    return list.some(x => {
      if (x === 'gnd' || x === 'ground' || x === 'vss' || x === 'v-') {
        return true;
      }
      return x.startsWith('gnd') || x.includes('ground');
    });
  }

  private isLedAnode(obj: SemanticObject, pinId: string): boolean {
    if (obj.type.toLowerCase() !== 'led') return false;
    const metadata = globalRegistry.getById(obj.type);
    const pin = metadata?.electrical.pins.find(p => p.id === pinId);
    const port = obj.ports?.find(p => p.id === pinId) || obj.pins?.find(p => p.id === pinId);
    const name = (pin?.name || port?.name || pinId).toLowerCase();
    const aliases = pin?.aliases || [];
    return name === 'a' || name === 'anode' || aliases.includes('a') || aliases.includes('anode');
  }

  private isMcuGpio(obj: SemanticObject, pinId: string): boolean {
    const type = obj.type.toLowerCase();
    if (type !== 'esp32' && type !== 'mcu' && type !== 'microcontroller') return false;
    const metadata = globalRegistry.getById(obj.type);
    const pin = metadata?.electrical.pins.find(p => p.id === pinId);
    const port = obj.ports?.find(p => p.id === pinId) || obj.pins?.find(p => p.id === pinId);
    const name = (pin?.name || port?.name || pinId).toLowerCase();
    return name.startsWith('gpio') || name.startsWith('io') || name.startsWith('out');
  }

  private checkDuplicateObjectIds(): void {
    const seenIds = new Set<string>();
    const project = this.objectEngine.getProject();

    // Check pages, layers, components
    for (const page of project.pages || []) {
      if (seenIds.has(page.id)) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-GEN-DUP-${page.id}`,
          'Error',
          'General',
          'Duplicate Object ID',
          `Duplicate object ID detected for page: ${page.id}`,
          [page.id],
          []
        ));
      }
      seenIds.add(page.id);

      for (const layer of page.layers || []) {
        if (seenIds.has(layer.id)) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-GEN-DUP-${layer.id}`,
            'Error',
            'General',
            'Duplicate Object ID',
            `Duplicate object ID detected for layer: ${layer.id}`,
            [layer.id],
            []
          ));
        }
        seenIds.add(layer.id);

        for (const obj of layer.objects || []) {
          if (seenIds.has(obj.id)) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-GEN-DUP-${obj.id}`,
              'Error',
              'General',
              'Duplicate Object ID',
              `Duplicate object ID detected for component: ${obj.id}`,
              [obj.id],
              []
            ));
          }
          seenIds.add(obj.id);
        }
      }
    }

    // Check wires
    for (const wire of this.objectEngine.getWires()) {
      if (seenIds.has(wire.id)) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-GEN-DUP-${wire.id}`,
          'Error',
          'General',
          'Duplicate Object ID',
          `Duplicate object ID detected for wire: ${wire.id}`,
          [wire.id],
          []
        ));
      }
      seenIds.add(wire.id);
    }
  }

  private checkMissingComponentDefinitions(): void {
    const project = this.objectEngine.getProject();
    for (const page of project.pages || []) {
      for (const layer of page.layers || []) {
        for (const obj of layer.objects || []) {
          const meta = globalRegistry.getById(obj.type);
          if (!meta) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-GEN-MISSING-DEF-${obj.id}`,
              'Error',
              'General',
              'Missing Component Definition',
              `Component '${obj.name}' of type '${obj.type}' has no definition in the registry.`,
              [obj.id],
              [],
              'Check component library registration or change component type.'
            ));
          }
        }
      }
    }
  }

  private checkInvalidReferencesAndUnresolvedNets(): void {
    const connections = this.objectEngine.getConnections();
    for (const conn of connections) {
      const src = conn.source;
      const tgt = conn.target;

      if (src.type !== 'FLOATING') {
        const srcComp = this.objectEngine.getComponentByTerminalId(src.targetId);
        if (!srcComp) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-GEN-REF-INVALID-${conn.id}-src`,
            'Error',
            'General',
            'Invalid Pin Reference',
            `Connection '${conn.id}' references a non-existent terminal ID: ${src.targetId}`,
            [conn.id],
            [conn.netId],
            'Delete the connection or reconnect to a valid pin.'
          ));
        }
      }

      if (tgt.type !== 'FLOATING') {
        const tgtComp = this.objectEngine.getComponentByTerminalId(tgt.targetId);
        if (!tgtComp) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-GEN-REF-INVALID-${conn.id}-tgt`,
            'Error',
            'General',
            'Invalid Pin Reference',
            `Connection '${conn.id}' references a non-existent terminal ID: ${tgt.targetId}`,
            [conn.id],
            [conn.netId],
            'Delete the connection or reconnect to a valid pin.'
          ));
        }
      }
    }
  }

  private checkIsolatedComponents(): void {
    const project = this.objectEngine.getProject();
    for (const page of project.pages || []) {
      for (const layer of page.layers || []) {
        for (const obj of layer.objects || []) {
          const ports = obj.ports || [];
          const pins = obj.pins || [];
          let connected = false;

          for (const port of ports) {
            const neighbors = this.graph.adjacencyList.get(`${obj.id}:${port.id}`);
            if (neighbors && neighbors.size > 0) {
              connected = true;
              break;
            }
          }
          if (!connected) {
            for (const pin of pins) {
              const neighbors = this.graph.adjacencyList.get(`${obj.id}:${pin.id}`);
              if (neighbors && neighbors.size > 0) {
                connected = true;
                break;
              }
            }
          }

          if (!connected && (ports.length > 0 || pins.length > 0)) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-CONN-ISOLATED-${obj.id}`,
              'Information',
              'Connectivity',
              'Isolated Component',
              `Component '${obj.name}' has no connections.`,
              [obj.id],
              [],
              'Connect component pins to logical connection nets or remove component.'
            ));
          }
        }
      }
    }
  }

  private checkOrphanWires(): void {
    const wires = this.objectEngine.getWires();
    for (const wire of wires) {
      if (!wire.logicalConnectionId) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-CONN-ORPHAN-WIRE-${wire.id}`,
          'Warning',
          'Connectivity',
          'Orphan Wire',
          `Wire '${wire.id}' is not associated with any logical connection.`,
          [wire.id],
          [],
          'Delete the orphan wire segment or bind it to a logical connection.'
        ));
      } else {
        const conn = this.objectEngine.getLogicalConnection(wire.logicalConnectionId);
        if (!conn) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-CONN-ORPHAN-WIRE-MISSING-${wire.id}`,
            'Error',
            'Connectivity',
            'Broken Wire Connection',
            `Wire '${wire.id}' references a missing logical connection: ${wire.logicalConnectionId}`,
            [wire.id],
            [],
            'Delete the wire or associate it with a valid logical connection.'
          ));
        }
      }
    }
  }

  private checkDanglingAndFloatingNets(): void {
    const nets = this.graph.listNets();
    for (const net of nets) {
      const componentsInNet = new Set<string>();
      for (const pinRef of net.pins) {
        componentsInNet.add(pinRef.componentId);
      }

      if (net.pins.length <= 1) {
        const hasNoConnect = net.pins.some(p =>
          listNoConnectMarkers().some((m: any) => m.targetObjectId === p.componentId && m.targetPinId === p.pinId)
        );

        if (!hasNoConnect) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-CONN-DANGLING-NET-PIN-${net.id}`,
            'Warning',
            'Connectivity',
            'Dangling Net',
            `Net '${net.name}' contains only one pin.`,
            net.pins.map(p => p.componentId),
            [net.id],
            'Connect the net to another component pin or delete the connection.'
          ));
        }
      } else if (componentsInNet.size === 1) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-CONN-DANGLING-NET-COMP-${net.id}`,
          'Warning',
          'Connectivity',
          'Dangling Net',
          `Net '${net.name}' connects pins only within the same component: ${Array.from(componentsInNet)[0]}`,
          Array.from(componentsInNet),
          [net.id],
          'Connect the net to another component or remove internal loopback.'
        ));
      }

      let hasInput = false;
      let hasDriver = false;
      let hasOutput = false;

      for (const pinRef of net.pins) {
        const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
        if (!obj) continue;
        const meta = globalRegistry.getById(obj.type);
        const pin = meta?.electrical.pins.find(p => p.id === pinRef.pinId);
        const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);

        const direction = pin?.direction || port?.direction || 'passive';
        const type = pin?.electricalType || port?.signalCategory || 'passive';

        if (direction === 'input') {
          hasInput = true;
        }
        if (direction === 'output' || type === 'power') {
          hasDriver = true;
        }
        if (direction === 'output') {
          hasOutput = true;
        }
      }

      if (hasInput && !hasDriver) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-CONN-FLOATING-INPUT-${net.id}`,
          'Warning',
          'Connectivity',
          'Floating Input Net',
          `Net '${net.name}' contains input pins but has no driving source.`,
          net.pins.map(p => p.componentId),
          [net.id],
          'Connect net to an output pin or pull-up/pull-down power supply.'
        ));
      }

      if (hasOutput && !hasInput) {
        let hasPassiveConsumer = false;
        for (const pinRef of net.pins) {
          const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
          if (!obj) continue;
          const meta = globalRegistry.getById(obj.type);
          const pin = meta?.electrical.pins.find(p => p.id === pinRef.pinId);
          const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);

          const direction = pin?.direction || port?.direction || 'passive';

          if (direction !== 'output') {
            hasPassiveConsumer = true;
            break;
          }
        }

        if (!hasPassiveConsumer) {
          this.diagnostics.push(createERCDiagnostic(
            `ERC-CONN-FLOATING-OUTPUT-${net.id}`,
            'Information',
            'Connectivity',
            'Floating Output Net',
            `Net '${net.name}' contains an output pin but has no connected inputs or loads.`,
            net.pins.map(p => p.componentId),
            [net.id],
            'Connect the output to a receiver or terminate appropriately.'
          ));
        }
      }
    }
  }

  private checkPowerShortsAndSources(): void {
    const nets = this.graph.listNets();
    for (const net of nets) {
      const powerSourcePins: { compId: string; pinId: string; name: string }[] = [];
      const groundPins: { compId: string; pinId: string; name: string }[] = [];

      for (const pinRef of net.pins) {
        const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
        if (!obj) continue;
        const meta = globalRegistry.getById(obj.type);
        const pin = meta?.electrical.pins.find(p => p.id === pinRef.pinId);
        const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);

        const name = pin?.name || port?.name || pinRef.pinId;
        const aliases = pin?.aliases || [];

        if (this.isPowerPin(name, aliases)) {
          powerSourcePins.push({ compId: pinRef.componentId, pinId: pinRef.pinId, name });
        }
        if (this.isGndPin(name, aliases)) {
          groundPins.push({ compId: pinRef.componentId, pinId: pinRef.pinId, name });
        }
      }

      if (powerSourcePins.length > 0 && groundPins.length > 0) {
        const affectedComps = Array.from(new Set([
          ...powerSourcePins.map(p => p.compId),
          ...groundPins.map(p => p.compId)
        ]));

        this.diagnostics.push(createERCDiagnostic(
          `ERC-PWR-SHORT-${net.id}`,
          'Error',
          'Power',
          'Power Short Circuit',
          `Net '${net.name}' directly connects power supply (${powerSourcePins[0].name}) to ground (${groundPins[0].name}).`,
          affectedComps,
          [net.id],
          'Remove the short connection between power rails.'
        ));
      }

      if (powerSourcePins.length > 1) {
        const uniquePowerNames = Array.from(new Set(powerSourcePins.map(p => p.name)));
        if (uniquePowerNames.length > 1) {
          const affectedComps = Array.from(new Set(powerSourcePins.map(p => p.compId)));
          this.diagnostics.push(createERCDiagnostic(
            `ERC-PWR-MULTIPLE-SOURCES-${net.id}`,
            'Error',
            'Power',
            'Multiple Power Sources',
            `Net '${net.name}' connects multiple conflicting power sources: ${uniquePowerNames.join(', ')}`,
            affectedComps,
            [net.id],
            'Ensure only one power supply drives this net or insert diode isolation.'
          ));
        }
      }
    }
  }

  private checkMissingGroundOrSupply(): void {
    let hasGroundInProject = false;
    let hasPowerInProject = false;

    const project = this.objectEngine.getProject();
    for (const page of project.pages || []) {
      for (const layer of page.layers || []) {
        for (const obj of layer.objects || []) {
          const meta = globalRegistry.getById(obj.type);
          if (meta) {
            for (const pin of meta.electrical.pins) {
              const neighbors = this.graph.adjacencyList.get(`${obj.id}:${pin.id}`);
              const isConnected = neighbors && neighbors.size > 0;

              if (isConnected) {
                const name = pin.name || pin.id;
                const aliases = pin.aliases || [];
                if (this.isGndPin(name, aliases)) {
                  hasGroundInProject = true;
                }
                if (this.isPowerPin(name, aliases)) {
                  hasPowerInProject = true;
                }
              }
            }
          } else {
            const pins = [...(obj.ports || []), ...(obj.pins || [])];
            for (const pin of pins) {
              const neighbors = this.graph.adjacencyList.get(`${obj.id}:${pin.id}`);
              const isConnected = neighbors && neighbors.size > 0;

              if (isConnected) {
                const name = pin.name || pin.id;
                if (this.isGndPin(name, [])) {
                  hasGroundInProject = true;
                }
                if (this.isPowerPin(name, [])) {
                  hasPowerInProject = true;
                }
              }
            }
          }
        }
      }
    }

    if (hasPowerInProject && !hasGroundInProject) {
      this.diagnostics.push(createERCDiagnostic(
        'ERC-PWR-MISSING-GND',
        'Warning',
        'Power',
        'Missing Ground Reference',
        'The project contains power supply connections but lacks a ground (GND) reference net.',
        [],
        [],
        'Connect a ground symbol or ground terminal pin to establish a reference.'
      ));
    }
  }

  private checkLedWithoutResistor(): void {
    const nets = this.graph.listNets();
    for (const net of nets) {
      let ledAnode: string | null = null;
      let ledObj: SemanticObject | null = null;
      let driverPin: string | null = null;
      let driverObj: SemanticObject | null = null;

      for (const pinRef of net.pins) {
        const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
        if (!obj) continue;

        if (this.isLedAnode(obj, pinRef.pinId)) {
          ledAnode = pinRef.pinId;
          ledObj = obj;
        }

        const meta = globalRegistry.getById(obj.type);
        const pin = meta?.electrical.pins.find(p => p.id === pinRef.pinId);
        const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);

        const name = pin?.name || port?.name || pinRef.pinId;
        const aliases = pin?.aliases || [];

        if (this.isPowerPin(name, aliases) || this.isMcuGpio(obj, pinRef.pinId)) {
          driverPin = pinRef.pinId;
          driverObj = obj;
        }
      }

      if (ledAnode && driverPin && ledObj && driverObj) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-PASS-LED-NO-RESISTOR-${net.id}`,
          'Warning',
          'Passive',
          'LED Without Series Resistor',
          `LED anode on '${ledObj.name}' connects directly to driver pin '${driverPin}' on '${driverObj.name}' without a current-limiting resistor.`,
          [ledObj.id, driverObj.id],
          [net.id],
          'Insert a series resistor (e.g. 220 Ohm) between the driver pin and the LED anode.'
        ));
      }
    }
  }

  private checkCapacitorPolarity(): void {
    const nets = this.graph.listNets();
    for (const net of nets) {
      for (const pinRef of net.pins) {
        const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
        if (!obj || !obj.type.toLowerCase().includes('capacitor')) continue;

        const metadata = globalRegistry.getById(obj.type);
        const warnings = metadata?.knowledge?.warnings || [];

        const isPolarized = warnings.some(w => w.toLowerCase().includes('polar'));
        if (isPolarized) {
          const pin = metadata?.electrical.pins.find(p => p.id === pinRef.pinId);
          const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);
          const name = (pin?.name || port?.name || pinRef.pinId).toLowerCase();
          const aliases = (pin?.aliases || []).map((a: string) => a.toLowerCase());

          const isNegativePin = name === '-' || name === 'neg' || aliases.includes('-');
          const isPositivePin = name === '+' || name === 'pos' || aliases.includes('+');

          let hasPowerSupply = false;
          let hasGndRef = false;

          for (const otherRef of net.pins) {
            const otherObj = getComponentByPath(this.objectEngine, otherRef.componentId);
            if (!otherObj) continue;
            const otherMeta = globalRegistry.getById(otherObj.type);
            const otherPin = otherMeta?.electrical.pins.find(p => p.id === otherRef.pinId);
            const otherPort = otherObj.ports?.find(p => p.id === otherRef.pinId) || otherObj.pins?.find(p => p.id === otherRef.pinId);

            const oName = otherPin?.name || otherPort?.name || otherRef.pinId;
            const oAliases = otherPin?.aliases || [];

            if (this.isPowerPin(oName, oAliases)) {
              hasPowerSupply = true;
            }
            if (this.isGndPin(oName, oAliases)) {
              hasGndRef = true;
            }
          }

          if (isNegativePin && hasPowerSupply && !hasGndRef) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-PASS-CAP-POLARITY-REVERSED-${obj.id}`,
              'Error',
              'Passive',
              'Polarized Capacitor Reversed',
              `Polarized capacitor '${obj.name}' negative pin connected directly to power rail in net '${net.name}'.`,
              [obj.id],
              [net.id],
              'Flip the capacitor orientation or correct the pin connections.'
            ));
          }
          if (isPositivePin && hasGndRef && !hasPowerSupply) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-PASS-CAP-POLARITY-REVERSED-GND-${obj.id}`,
              'Error',
              'Passive',
              'Polarized Capacitor Reversed',
              `Polarized capacitor '${obj.name}' positive pin connected directly to ground (GND) in net '${net.name}'.`,
              [obj.id],
              [net.id],
              'Flip the capacitor orientation or correct the pin connections.'
            ));
          }
        }
      }
    }
  }

  private checkDigitalConflicts(): void {
    const nets = this.graph.listNets();
    for (const net of nets) {
      const outputPins: { compId: string; pinId: string }[] = [];

      for (const pinRef of net.pins) {
        const obj = getComponentByPath(this.objectEngine, pinRef.componentId);
        if (!obj) continue;
        const meta = globalRegistry.getById(obj.type);
        const pin = meta?.electrical.pins.find(p => p.id === pinRef.pinId);
        const port = obj.ports?.find(p => p.id === pinRef.pinId) || obj.pins?.find(p => p.id === pinRef.pinId);

        const direction = pin?.direction || port?.direction || 'passive';

        if (direction === 'output') {
          outputPins.push({ compId: pinRef.componentId, pinId: pinRef.pinId });
        }
      }

      if (outputPins.length > 1) {
        const affectedComps = Array.from(new Set(outputPins.map(p => p.compId)));
        this.diagnostics.push(createERCDiagnostic(
          `ERC-DIG-OUTPUT-CONFLICT-${net.id}`,
          'Error',
          'Digital',
          'Output Driver Conflict',
          `Multiple output drivers connect directly to net '${net.name}'.`,
          affectedComps,
          [net.id],
          'Insert logic gates or buffers to prevent output contention.'
        ));
      }
    }
  }

  private checkBusRules(): void {
    const buses = listBuses();
    const entries = listBusEntries();
    const taps = listBusTaps();

    for (const bus of buses) {
      if (!validateBusLabel(bus.name)) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-BUS-LABEL-ILLEGAL-${bus.id}`,
          'Error',
          'General',
          'Illegal Bus Label',
          `Bus '${bus.id}' has an illegal label format: '${bus.name}'`,
          [bus.id],
          [],
          'Change label to format Name[start..end], e.g. DATA[0..7].'
        ));
        continue;
      }

      if (bus.segments.length === 0) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-BUS-CONTINUITY-${bus.id}`,
          'Warning',
          'General',
          'Bus Continuity Issue',
          `Bus '${bus.name}' has no physical segments.`,
          [bus.id],
          [],
          'Draw bus segments or delete the bus.'
        ));
      }

      const parsed = parseBusLabel(bus.name);
      if (parsed) {
        const allowedNets = new Set(expandBusLabel(bus.name));
        const busEntries = entries.filter((e: any) => e.busId === bus.id);
        const busTaps = taps.filter((t: any) => t.busId === bus.id);

        for (const entry of busEntries) {
          if (!allowedNets.has(entry.netName)) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-BUS-RANGE-CONFLICT-${entry.id}`,
              'Error',
              'General',
              'Conflicting Range',
              `Bus Entry '${entry.netName}' is outside the range declared by bus '${bus.name}'.`,
              [entry.id, bus.id],
              [],
              'Use a net name within the bus range.'
            ));
          }
        }

        for (const tap of busTaps) {
          if (!allowedNets.has(tap.netName)) {
            this.diagnostics.push(createERCDiagnostic(
              `ERC-BUS-RANGE-CONFLICT-${tap.id}`,
              'Error',
              'General',
              'Conflicting Range',
              `Bus Tap '${tap.netName}' is outside the range declared by bus '${bus.name}'.`,
              [tap.id, bus.id],
              [],
              'Use a net name within the bus range.'
            ));
          }
        }
      }
    }

    for (const entry of entries) {
      const busExists = buses.some((b: any) => b.id === entry.busId);
      if (!busExists) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-BUS-ORPHAN-ENTRY-${entry.id}`,
          'Error',
          'General',
          'Orphan Bus Entry',
          `Bus Entry '${entry.netName}' references a non-existent bus ID: ${entry.busId}`,
          [entry.id],
          [],
          'Re-associate entry with a valid bus or delete it.'
        ));
      }
    }

    for (const entry of entries) {
      const nodeKey = `busEntry:${entry.id}`;
      const neighbors = this.graph.adjacencyList.get(nodeKey);
      if (!neighbors || neighbors.size === 0) {
        this.diagnostics.push(createERCDiagnostic(
          `ERC-BUS-ENTRY-DISCONNECTED-${entry.id}`,
          'Warning',
          'Connectivity',
          'Disconnected Bus Entry',
          `Bus Entry '${entry.netName}' has no connections.`,
          [entry.id],
          [],
          'Connect a wire or component pin to this bus entry.'
        ));
      }
    }
  }
}
