import { FeedbackStatus } from './types';

export class ConnectionHighlighter {
  getColorForStatus(status: FeedbackStatus): string | null {
    switch (status) {
      case 'GREEN':
        return '#00ff88'; // Vibrant green
      case 'YELLOW':
        return '#facc15'; // Warning yellow
      case 'RED':
        return '#ef4444'; // Error red
      default:
        return null;
    }
  }
}
