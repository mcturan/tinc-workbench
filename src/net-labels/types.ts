export type LabelScope = 'Local' | 'Global' | 'Power' | 'Ground';

export interface NetLabel {
  id: string;
  name: string;
  scope: LabelScope;
  position: { x: number; y: number };
  targetObjectId: string;
  targetPinId: string;
  metadata?: Record<string, any>;
}

export interface GlobalSignal {
  name: string;
  scope: LabelScope;
  labels: string[]; // NetLabel IDs
  metadata?: Record<string, any>;
}
