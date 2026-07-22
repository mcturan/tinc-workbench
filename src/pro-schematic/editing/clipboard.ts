import { CommandEngine } from '../../command-engine';


let clipboard: any[] = [];

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function generateNewId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getX(obj: any): number {
  if (obj.properties && typeof obj.properties.x === 'number') return obj.properties.x;
  if (obj.position && typeof obj.position.x === 'number') return obj.position.x;
  return 0;
}

function getY(obj: any): number {
  if (obj.properties && typeof obj.properties.y === 'number') return obj.properties.y;
  if (obj.position && typeof obj.position.y === 'number') return obj.position.y;
  return 0;
}

function setX(obj: any, val: number): void {
  if (obj.properties && typeof obj.properties.x === 'number') {
    obj.properties.x = val;
  } else if (obj.position) {
    obj.position.x = val;
  }
}

function setY(obj: any, val: number): void {
  if (obj.properties && typeof obj.properties.y === 'number') {
    obj.properties.y = val;
  } else if (obj.position) {
    obj.position.y = val;
  }
}

export function copy(objects: any[]): void {
  clipboard = deepClone(objects);
}

export function cut(objects: any[], commandEngine: CommandEngine): void {
  copy(objects);
  for (const obj of objects) {
    if (obj.id) {
      try {
        commandEngine.dispatch({ id: `cmd-${generateNewId().substring(0,8)}`, name: 'DeleteComponent', payload: { componentId: obj.id } });
      } catch {
        try {
          commandEngine.dispatch({ id: `cmd-${generateNewId().substring(0,8)}`, name: 'DeleteWire', payload: { wireId: obj.id } });
        } catch {
          // ignore
        }
      }
    }
  }
}

export function paste(
  commandEngine: CommandEngine,
  offset: { x: number; y: number } = { x: 10, y: 10 }
): any[] {
  if (clipboard.length === 0) return [];

  const pasted: any[] = [];
  const oldIdToNewId = new Map<string, string>();

  const clonedList = deepClone(clipboard);
  for (const obj of clonedList) {
    if (obj.id) {
      const newId = generateNewId();
      oldIdToNewId.set(obj.id, newId);
      obj.id = newId;
    }
  }

  for (const obj of clonedList) {
    setX(obj, getX(obj) + offset.x);
    setY(obj, getY(obj) + offset.y);

    if (obj.ports) {
      for (const port of obj.ports) {
        const oldPortId = port.id;
        port.id = generateNewId();
        oldIdToNewId.set(oldPortId, port.id);
      }
    }

    try {
      commandEngine.dispatch({ id: `cmd-${generateNewId().substring(0,8)}`, name: 'CreateComponent', payload: { layerId: 'layer-1', component: obj } });
      pasted.push(obj);
    } catch {
      try {
        commandEngine.dispatch({ id: `cmd-${generateNewId().substring(0,8)}`, name: 'CreateWire', payload: { layerId: 'layer-1', wire: obj } });
        pasted.push(obj);
      } catch {
        // ignore
      }
    }
  }

  return pasted;
}

export function pasteInPlace(commandEngine: CommandEngine): any[] {
  return paste(commandEngine, { x: 0, y: 0 });
}

export function duplicate(objects: any[], commandEngine: CommandEngine): any[] {
  const oldClipboard = clipboard;
  copy(objects);
  const result = paste(commandEngine, { x: 10, y: 10 });
  clipboard = oldClipboard;
  return result;
}

export function getClipboardContent(): any[] {
  return clipboard;
}
