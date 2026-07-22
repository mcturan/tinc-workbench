export type FeedbackStatus = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';

export interface LiveValidationState {
  sourceTerminalId: string;
  hoveredTerminalId: string | null;
  status: FeedbackStatus;
  message: string | null;
}
