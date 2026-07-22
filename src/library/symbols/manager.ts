import { SymbolDefinition } from '../types';

const symbolsRegistry = new Map<string, SymbolDefinition>();

export function registerSymbol(symbol: SymbolDefinition): void {
  if (!symbol.id) {
    throw new Error('Symbol ID is required');
  }
  symbolsRegistry.set(symbol.id, symbol);
}

export function unregisterSymbol(id: string): void {
  symbolsRegistry.delete(id);
}

export function getSymbol(id: string): SymbolDefinition | undefined {
  const symbol = symbolsRegistry.get(id);
  if (!symbol) return undefined;
  return resolveInheritedSymbol(symbol);
}

export function listSymbols(): SymbolDefinition[] {
  return Array.from(symbolsRegistry.values()).map(sym => resolveInheritedSymbol(sym));
}

export function clearSymbols(): void {
  symbolsRegistry.clear();
}

export function resolveInheritedSymbol(symbol: SymbolDefinition): SymbolDefinition {
  if (!symbol.parentSymbolId) return symbol;

  // Track visited to prevent infinite loop/circular inheritance
  const visited = new Set<string>([symbol.id]);
  let current = symbol;
  const chain: SymbolDefinition[] = [symbol];

  while (current.parentSymbolId) {
    if (visited.has(current.parentSymbolId)) {
      // Circular inheritance detected, break loop and return what we resolved so far
      break;
    }
    const parent = symbolsRegistry.get(current.parentSymbolId);
    if (!parent) break;
    visited.add(parent.id);
    chain.push(parent);
    current = parent;
  }

  // Merge from top of parent chain downwards
  let merged = { ...chain[chain.length - 1] };
  for (let i = chain.length - 2; i >= 0; i--) {
    const child = chain[i];
    merged = {
      ...merged,
      ...child,
      variants: child.variants && child.variants.length > 0 ? child.variants : merged.variants,
      units: child.units && child.units.length > 0 ? child.units : merged.units,
      tags: Array.from(new Set([...(merged.tags || []), ...(child.tags || [])])),
      aliases: Array.from(new Set([...(merged.aliases || []), ...(child.aliases || [])])),
      keywords: Array.from(new Set([...(merged.keywords || []), ...(child.keywords || [])])),
    };
  }

  return merged;
}
