import { NetResolver } from './resolver';
import { ElectricalPinRef, ElectricalNet } from './types';

export class NetQuery {
  constructor(private resolver: NetResolver) {}

  getNet(netId: string): ElectricalNet | undefined {
    return this.resolver.getGraph().getNet(netId);
  }

  getNetByPin(componentId: string, pinId: string): ElectricalNet | undefined {
    return this.resolver.getGraph().getNetByPin(componentId, pinId);
  }

  getPins(componentId: string): ElectricalPinRef[] {
    return this.resolver.getGraph().getPins(componentId);
  }

  getConnectedPins(componentId: string, pinId: string): ElectricalPinRef[] {
    return this.resolver.getGraph().getConnectedPins(componentId, pinId);
  }

  getConnectedComponents(componentId: string): string[] {
    return this.resolver.getGraph().getConnectedComponents(componentId);
  }

  trace(componentId: string, pinId: string): ElectricalPinRef[] {
    return this.resolver.getGraph().trace(componentId, pinId);
  }

  findPath(
    startCompId: string,
    startPinId: string,
    endCompId: string,
    endPinId: string
  ): ElectricalPinRef[] | null {
    return this.resolver.getGraph().findPath(startCompId, startPinId, endCompId, endPinId);
  }

  listNets(): ElectricalNet[] {
    return this.resolver.getGraph().listNets();
  }
}
export const queryNets = (resolver: NetResolver) => new NetQuery(resolver);
