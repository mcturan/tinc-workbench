import { Coordinate } from '../../types';
import { SchematicConnector, NoConnectMarker, ConnectorScope } from '../types';

const connectors = new Map<string, SchematicConnector>();
const noConnectMarkers = new Map<string, NoConnectMarker>();

export function createConnector(
  id: string,
  name: string,
  scope: ConnectorScope,
  position: Coordinate,
  targetObjectId?: string,
  targetPinId?: string,
  metadata?: Record<string, any>
): SchematicConnector {
  if (connectors.has(id)) {
    throw new Error(`Connector ${id} already exists`);
  }
  const connector: SchematicConnector = { id, name, scope, position, targetObjectId, targetPinId, metadata };
  connectors.set(id, connector);
  return connector;
}

export function deleteConnector(id: string): void {
  connectors.delete(id);
}

export function listConnectors(): SchematicConnector[] {
  return Array.from(connectors.values());
}

export function getConnector(id: string): SchematicConnector | undefined {
  return connectors.get(id);
}

export function clearConnectors(): void {
  connectors.clear();
}

export function createNoConnectMarker(
  id: string,
  targetObjectId: string,
  targetPinId: string,
  position: Coordinate
): NoConnectMarker {
  if (noConnectMarkers.has(id)) {
    throw new Error(`NoConnectMarker ${id} already exists`);
  }
  const marker: NoConnectMarker = { id, targetObjectId, targetPinId, position };
  noConnectMarkers.set(id, marker);
  return marker;
}

export function deleteNoConnectMarker(id: string): void {
  noConnectMarkers.delete(id);
}

export function listNoConnectMarkers(): NoConnectMarker[] {
  return Array.from(noConnectMarkers.values());
}

export function clearNoConnectMarkers(): void {
  noConnectMarkers.clear();
}
