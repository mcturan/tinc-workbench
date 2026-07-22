import { listSignals } from './labels';
import { GlobalSignal } from './types';

export function getGlobalSignals(): GlobalSignal[] {
  return listSignals().filter(s => s.scope === 'Global' || s.scope === 'Power' || s.scope === 'Ground');
}

export function isGlobalSignal(name: string): boolean {
  return getGlobalSignals().some(s => s.name === name);
}
