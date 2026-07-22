export interface PinDisplayData {
  id: string;
  name: string;
  aliases: string[];
  electricalType: string;
  direction: string;
  voltageDomain?: string;
}

export interface ComponentDisplayData {
  id: string;
  name: string;
  category: string;
  description: string;
  pins: PinDisplayData[];
  notes?: string[];
  warnings?: string[];
  applications?: string[];
  tags?: string[];
  documentation?: string[];
}
