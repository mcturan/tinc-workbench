import { KiCadLibraryAdapter } from '../../library/import-export/kicad';
import { CommandEngine } from '../../command-engine';
import { Panel } from '../components/panel';

export class KiCadImportPanel {
  private container: HTMLElement;
  private panel: Panel;
  private isVisible = false;
  private adapter = new KiCadLibraryAdapter();

  constructor(private appShell: HTMLElement, private commandEngine: CommandEngine) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-kicad-import-panel';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '100px',
      left: '100px',
      width: '600px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      display: 'none',
      flexDirection: 'column',
      zIndex: '1500',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden'
    });

    this.panel = new Panel('Import KiCad Library');
    this.panel.element.style.borderTop = 'none';
    this.container.appendChild(this.panel.element);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.toggle());
    
    this.panel.header.appendChild(closeBtn);

    this.appShell.appendChild(this.container);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.render();
      this.container.style.display = 'flex';
    } else {
      this.container.style.display = 'none';
    }
  }

  private render() {
    this.panel.content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-md);">
        <p style="margin: 0; color: var(--text-secondary); font: var(--text-body);">Paste the contents of a .kicad_sym or .kicad_mod file below to import symbols or footprints into the current session.</p>
        <textarea id="ki-data" style="width: 100%; height: 200px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm); font-family: monospace;"></textarea>
        <div style="display: flex; justify-content: flex-end;">
          <button id="ki-import-btn" style="padding: var(--space-sm) var(--space-lg); background: var(--accent); color: var(--text-primary); border: none; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer;">Import</button>
        </div>
        <div id="ki-status" style="font: var(--text-caption); margin-top: var(--space-sm);"></div>
      </div>
    `;

    this.panel.content.querySelector('#ki-import-btn')?.addEventListener('click', () => {
      const data = (this.panel.content.querySelector('#ki-data') as HTMLTextAreaElement).value;
      const statusEl = this.panel.content.querySelector('#ki-status') as HTMLElement;
      if (!data.trim()) {
        statusEl.innerText = 'Please paste some data to import.';
        statusEl.style.color = 'var(--error)';
        return;
      }

      try {
        const lib = this.adapter.importLibrary(data);
        statusEl.innerText = `Successfully parsed ${lib.symbols.length} symbols and ${lib.footprints.length} footprints. (Import applied)`;
        statusEl.style.color = 'var(--success)';
      } catch (err: any) {
        statusEl.innerText = `Error: ${err.message}`;
        statusEl.style.color = 'var(--error)';
      }
    });
  }
}
