import { ObjectEngine } from '../object-engine';
import { ElectricalGraphInstance } from './graph';
import { ElectricalPinRef, ElectricalNet } from './types';
import { ElectricalGraphBuilder } from './builder';

export * from './types';
export * from './graph';
export * from './builder';
export * from './resolver';
export * from './validator';
export * from './traversal';
export * from './query';

export function buildGraph(objectEngine: ObjectEngine): ElectricalGraphInstance {
  return new ElectricalGraphBuilder().build(objectEngine);
}

export function resolveNets(graph: ElectricalGraphInstance): void {
  graph.resolveNets();
}

export function getNet(graph: ElectricalGraphInstance, netId: string): ElectricalNet | undefined {
  return graph.getNet(netId);
}

export function getNetByPin(
  graph: ElectricalGraphInstance,
  compId: string,
  pinId: string
): ElectricalNet | undefined {
  return graph.getNetByPin(compId, pinId);
}

export function getPins(graph: ElectricalGraphInstance, compId: string): ElectricalPinRef[] {
  return graph.getPins(compId);
}

export function getConnectedPins(
  graph: ElectricalGraphInstance,
  compId: string,
  pinId: string
): ElectricalPinRef[] {
  return graph.getConnectedPins(compId, pinId);
}

export function getConnectedComponents(graph: ElectricalGraphInstance, compId: string): string[] {
  return graph.getConnectedComponents(compId);
}

export function trace(
  graph: ElectricalGraphInstance,
  compId: string,
  pinId: string
): ElectricalPinRef[] {
  return graph.trace(compId, pinId);
}

export function findPath(
  graph: ElectricalGraphInstance,
  startCompId: string,
  startPinId: string,
  endCompId: string,
  endPinId: string
): ElectricalPinRef[] | null {
  return graph.findPath(startCompId, startPinId, endCompId, endPinId);
}

export function listNets(graph: ElectricalGraphInstance): ElectricalNet[] {
  return graph.listNets();
}
