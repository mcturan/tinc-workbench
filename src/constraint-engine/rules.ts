import { SemanticObject } from '../types';
import { ElectricalPin } from '../component-library/types';

export function isGroundPin(pinId: string, name?: string, aliases?: string[]): boolean {
  const lowerId = pinId.toLowerCase();
  const lowerName = name?.toLowerCase() || '';
  const lowerAliases = aliases?.map(a => a.toLowerCase()) || [];
  return (
    lowerId.includes('gnd') ||
    lowerId.includes('ground') ||
    lowerName.includes('gnd') ||
    lowerName.includes('ground') ||
    lowerAliases.some(a => a.includes('gnd') || a.includes('ground'))
  );
}

export function isLedAnode(component: SemanticObject, pinId: string, metadataPin?: ElectricalPin): boolean {
  const isLed = component.type.toLowerCase() === 'led';
  const typeStr = metadataPin?.electricalType || '';
  return isLed && (pinId.toLowerCase() === 'a' || typeStr.toLowerCase() === 'anode');
}

export function isMcuGpio(component: SemanticObject, pinId: string, _metadataPin?: ElectricalPin): boolean {
  const isMcu = component.type.toLowerCase() === 'esp32' || component.type.toLowerCase() === 'esp32 devkit';
  const lowerId = pinId.toLowerCase();
  return isMcu && lowerId.startsWith('gpio');
}

export function isResistor(component: SemanticObject): boolean {
  return component.type.toLowerCase() === 'resistor';
}
