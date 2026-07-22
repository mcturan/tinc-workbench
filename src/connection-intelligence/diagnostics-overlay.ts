export class DiagnosticsOverlay {
  private el: HTMLDivElement | null = null;

  show(message: string, severity: 'ERROR' | 'WARNING' | 'INFO'): void {
    if (typeof document === 'undefined') return;

    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'tinc-diagnostics-overlay';
      document.body.appendChild(this.el);
    }

    // Apply premium styling
    this.el.style.position = 'absolute';
    this.el.style.bottom = '30px';
    this.el.style.left = '50%';
    this.el.style.transform = 'translateX(-50%)';
    this.el.style.padding = '12px 24px';
    this.el.style.borderRadius = '8px';
    this.el.style.fontFamily = 'Inter, system-ui, sans-serif';
    this.el.style.fontSize = '14px';
    this.el.style.fontWeight = '500';
    this.el.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    this.el.style.zIndex = '10000';
    this.el.style.display = 'block';
    this.el.style.pointerEvents = 'none';

    // Color systems
    if (severity === 'ERROR') {
      this.el.style.backgroundColor = 'rgba(239, 68, 68, 0.95)'; // vibrant red
      this.el.style.color = '#ffffff';
      this.el.style.border = '1px solid rgba(220, 38, 38, 0.5)';
    } else if (severity === 'WARNING') {
      this.el.style.backgroundColor = 'rgba(234, 179, 8, 0.95)'; // vibrant yellow
      this.el.style.color = '#1e293b';
      this.el.style.border = '1px solid rgba(202, 138, 4, 0.5)';
    } else {
      this.el.style.backgroundColor = 'rgba(59, 130, 246, 0.95)'; // vibrant blue
      this.el.style.color = '#ffffff';
      this.el.style.border = '1px solid rgba(37, 99, 235, 0.5)';
    }

    this.el.innerText = `${severity}: ${message}`;
  }

  hide(): void {
    if (typeof document === 'undefined') return;
    if (this.el) {
      this.el.style.display = 'none';
    }
  }

  destroy(): void {
    if (typeof document === 'undefined') return;
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
      this.el = null;
    }
  }
}
