import { Coordinate } from '../../types';
import { Bus, BusEntry, BusTap, BusJunction } from '../types';

const buses = new Map<string, Bus>();
const busEntries = new Map<string, BusEntry>();
const busTaps = new Map<string, BusTap>();
const busJunctions = new Map<string, BusJunction>();

export function createBus(
  id: string,
  name: string,
  segments: { start: Coordinate; end: Coordinate }[],
  metadata?: Record<string, any>
): Bus {
  if (buses.has(id)) {
    throw new Error(`Bus ${id} already exists`);
  }
  const bus: Bus = { id, name, segments, metadata };
  buses.set(id, bus);
  return bus;
}

export function deleteBus(id: string): void {
  buses.delete(id);
}

export function listBuses(): Bus[] {
  return Array.from(buses.values());
}

export function getBus(id: string): Bus | undefined {
  return buses.get(id);
}

export function clearBuses(): void {
  buses.clear();
  busEntries.clear();
  busTaps.clear();
  busJunctions.clear();
}

export function createBusEntry(
  id: string,
  busId: string,
  netName: string,
  position: Coordinate,
  angle: number
): BusEntry {
  if (busEntries.has(id)) {
    throw new Error(`Bus Entry ${id} already exists`);
  }
  const entry: BusEntry = { id, busId, netName, position, angle };
  busEntries.set(id, entry);
  return entry;
}

export function deleteBusEntry(id: string): void {
  busEntries.delete(id);
}

export function listBusEntries(): BusEntry[] {
  return Array.from(busEntries.values());
}

export function createBusTap(
  id: string,
  busId: string,
  netName: string,
  position: Coordinate
): BusTap {
  if (busTaps.has(id)) {
    throw new Error(`Bus Tap ${id} already exists`);
  }
  const tap: BusTap = { id, busId, netName, position };
  busTaps.set(id, tap);
  return tap;
}

export function deleteBusTap(id: string): void {
  busTaps.delete(id);
}

export function listBusTaps(): BusTap[] {
  return Array.from(busTaps.values());
}

export function createBusJunction(
  id: string,
  busId: string,
  position: Coordinate
): BusJunction {
  if (busJunctions.has(id)) {
    throw new Error(`Bus Junction ${id} already exists`);
  }
  const junction: BusJunction = { id, busId, position };
  busJunctions.set(id, junction);
  return junction;
}

export function deleteBusJunction(id: string): void {
  busJunctions.delete(id);
}

export function listBusJunctions(): BusJunction[] {
  return Array.from(busJunctions.values());
}
