import { DeviceDefinition } from '../types';

const devicesRegistry = new Map<string, DeviceDefinition>();

export function registerDevice(device: DeviceDefinition): void {
  if (!device.id) {
    throw new Error('Device ID is required');
  }
  devicesRegistry.set(device.id, device);
}

export function unregisterDevice(id: string): void {
  devicesRegistry.delete(id);
}

export function getDevice(id: string): DeviceDefinition | undefined {
  return devicesRegistry.get(id);
}

export function listDevices(): DeviceDefinition[] {
  return Array.from(devicesRegistry.values());
}

export function clearDevices(): void {
  devicesRegistry.clear();
}

export function findEquivalentDevices(id: string): DeviceDefinition[] {
  const device = devicesRegistry.get(id);
  if (!device || !device.functionalEquivalents) return [];

  const equivalents: DeviceDefinition[] = [];
  for (const eqId of device.functionalEquivalents) {
    const eqDev = devicesRegistry.get(eqId);
    if (eqDev) {
      equivalents.push(eqDev);
    }
  }
  return equivalents;
}
