import { ComponentRegistry } from './registry';
import { SearchEngine } from './search';
import { loadInitialComponents } from './loader';

export const globalRegistry = new ComponentRegistry();
loadInitialComponents(globalRegistry);

export const globalSearch = new SearchEngine(globalRegistry);
