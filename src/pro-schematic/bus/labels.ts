export interface ParsedBusLabel {
  prefix: string;
  startRange: number;
  endRange: number;
}

export function parseBusLabel(label: string): ParsedBusLabel | null {
  const match = label.match(/^([a-zA-Z0-9_]+)\[([0-9]+)\.\.([0-9]+)\]$/);
  if (!match) return null;
  return {
    prefix: match[1],
    startRange: parseInt(match[2], 10),
    endRange: parseInt(match[3], 10),
  };
}

export function expandBusLabel(label: string): string[] {
  const parsed = parseBusLabel(label);
  if (!parsed) return [label];

  const result: string[] = [];
  const start = parsed.startRange;
  const end = parsed.endRange;
  const step = start <= end ? 1 : -1;

  for (let i = start; i !== end + step; i += step) {
    result.push(`${parsed.prefix}[${i}]`);
  }
  return result;
}

export function validateBusLabel(label: string): boolean {
  if (/^[a-zA-Z0-9_]+$/.test(label)) return true;
  const parsed = parseBusLabel(label);
  if (!parsed) return false;
  return parsed.startRange >= 0 && parsed.endRange >= 0 && parsed.startRange <= 1024 && parsed.endRange <= 1024;
}
