import { PreviewValidator } from './preview-validator';
import { ConnectionHighlighter } from './connection-highlighter';
import { DiagnosticsOverlay } from './diagnostics-overlay';

export const globalPreviewValidator = new PreviewValidator();
export const globalHighlighter = new ConnectionHighlighter();
export const globalOverlay = new DiagnosticsOverlay();
