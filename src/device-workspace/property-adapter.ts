import { DeviceWorkspaceManager } from './manager';
import { DeviceObject } from './types';
import { toNm, fromNm } from '../physical-design/types';
import { CommandEngine } from '../command-engine';

export class DevicePropertyAdapter {
  constructor(
    private manager: DeviceWorkspaceManager,
    private commandEngine: CommandEngine
  ) {}

  public getProperties(selectedIds: string[]): any[] {
    if (selectedIds.length !== 1) return [];
    
    const obj = this.manager.getObject(selectedIds[0]);
    if (!obj) return [];

    const props: any[] = [
      { label: 'ID', value: obj.id },
      { label: 'Type', value: obj.kind },
      { label: 'X (mm)', value: (fromNm(obj.transform.x, 'mm')).toFixed(2) },
      { label: 'Y (mm)', value: (fromNm(obj.transform.y, 'mm')).toFixed(2) },
      { label: 'Rotation', value: obj.transform.rotation + '°' }
    ];

    if (obj.kind === 'enclosure') {
      props.push({ label: 'Width (mm)', value: fromNm(obj.width, 'mm').toFixed(2) });
      props.push({ label: 'Height (mm)', value: fromNm(obj.height, 'mm').toFixed(2) });
      props.push({ label: 'Label', value: obj.label });
    } else if (obj.kind === 'module') {
      props.push({ label: 'Module Type', value: obj.moduleType });
      props.push({ label: 'Width (mm)', value: fromNm(obj.width, 'mm').toFixed(2) });
      props.push({ label: 'Height (mm)', value: fromNm(obj.height, 'mm').toFixed(2) });
    } else if (obj.kind === 'wire') {
      props.push({ label: 'Color', value: obj.color });
      props.push({ label: 'Net Label', value: obj.label });
      props.push({ label: 'Corner Mode', value: obj.cornerMode || 'free' });
    } else if (obj.kind === 'breadboard') {
      props.push({ label: 'Size', value: obj.size });
    } else if (obj.kind === 'perfboard') {
      props.push({ label: 'Rows', value: obj.rows });
      props.push({ label: 'Cols', value: obj.cols });
      props.push({ label: 'View', value: obj.view });
    }

    return [
      {
        name: obj.kind.charAt(0).toUpperCase() + obj.kind.slice(1),
        properties: props
      }
    ];
  }
}
