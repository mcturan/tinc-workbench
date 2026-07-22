import { NetClass } from '../types';

const netClasses = new Map<string, NetClass>();

export function createNetClass(
  name: string,
  width: number,
  clearance: number,
  color: string,
  priority: number,
  metadata?: Record<string, any>
): NetClass {
  if (netClasses.has(name)) {
    throw new Error(`NetClass ${name} already exists`);
  }
  const netClass: NetClass = { name, width, clearance, color, priority, nets: [], metadata };
  netClasses.set(name, netClass);
  return netClass;
}

export function deleteNetClass(name: string): void {
  netClasses.delete(name);
}

export function listNetClasses(): NetClass[] {
  return Array.from(netClasses.values());
}

export function getNetClass(name: string): NetClass | undefined {
  return netClasses.get(name);
}

export function clearNetClasses(): void {
  netClasses.clear();
}

export function assignNetToClass(netName: string, className: string): void {
  for (const nc of netClasses.values()) {
    nc.nets = nc.nets.filter(n => n !== netName);
  }

  const nc = netClasses.get(className);
  if (!nc) {
    throw new Error(`NetClass ${className} does not exist`);
  }
  if (!nc.nets.includes(netName)) {
    nc.nets.push(netName);
  }
}

export function getNetClassForNet(netName: string): NetClass | undefined {
  for (const nc of netClasses.values()) {
    if (nc.nets.includes(netName)) {
      return nc;
    }
  }
  return undefined;
}
