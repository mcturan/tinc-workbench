import { listInstances } from './instance';

let navigationStack: string[] = [];
let currentModuleId: string | null = null;

export function enterModule(instanceId: string): void {
  navigationStack.push(instanceId);
  const inst = listInstances().find(i => i.id === instanceId);
  currentModuleId = inst ? inst.moduleId : null;
}

export function exitModule(): void {
  navigationStack.pop();
  if (navigationStack.length === 0) {
    currentModuleId = null;
  } else {
    const parentInstId = navigationStack[navigationStack.length - 1];
    const inst = listInstances().find(i => i.id === parentInstId);
    currentModuleId = inst ? inst.moduleId : null;
  }
}

export function goToParent(): void {
  exitModule();
}

export function goToRoot(): void {
  navigationStack = [];
  currentModuleId = null;
}

export function getNavigationStack(): string[] {
  return [...navigationStack];
}

export function getCurrentModuleId(): string | null {
  return currentModuleId;
}

export function clearNavigation(): void {
  navigationStack = [];
  currentModuleId = null;
}
