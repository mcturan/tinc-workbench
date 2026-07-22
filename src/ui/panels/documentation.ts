import { CommandEngine } from '../../command-engine';
import { ObjectEngine } from '../../object-engine';
import { ProjectDocumentation } from '../../types';
import { Panel } from '../components/panel';

export class DocumentationPanel {
  private container: HTMLElement;
  private panel: Panel;
  private isVisible = false;

  constructor(private appShell: HTMLElement, private commandEngine: CommandEngine, private objectEngine: ObjectEngine) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-documentation-panel';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '100px',
      left: '100px',
      width: '600px',
      height: '600px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      display: 'none',
      flexDirection: 'column',
      zIndex: '1000',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden'
    });

    this.panel = new Panel('Documentation');
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
      this.save();
    }
  }

  private render() {
    const doc = this.objectEngine.getProject().documentation || {
      notes: '',
      designDecisions: '',
      todoList: '',
      changelog: '',
      datasheetReferences: [],
      externalReferences: []
    };

    this.panel.content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-weight: 600;">General Notes</label>
          <textarea id="doc-notes" rows="4" style="background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px;">${doc.notes}</textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 600;">Design Decisions</label>
          <textarea id="doc-decisions" style="width: 100%; height: 100px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm);">${this.escapeHtml(doc.designDecisions)}</textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 600;">TODO List</label>
          <textarea id="doc-todos" style="width: 100%; height: 80px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm);">${this.escapeHtml(doc.todoList)}</textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 600;">Changelog</label>
          <textarea id="doc-changelog" style="width: 100%; height: 80px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm);">${this.escapeHtml(doc.changelog)}</textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 600;">Datasheet Links (one per line)</label>
          <textarea id="doc-datasheets" style="width: 100%; height: 60px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm);">${doc.datasheetReferences.join('\n')}</textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 600;">External References (one per line)</label>
          <textarea id="doc-external" style="width: 100%; height: 60px; background: var(--bg-canvas); color: var(--text-primary); border: 1px solid var(--border); padding: var(--space-sm); border-radius: var(--radius-sm);">${doc.externalReferences.join('\n')}</textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: var(--space-md);">
          <button id="doc-save-btn" style="background: var(--accent); color: var(--text-primary); border: none; padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-sm); cursor: pointer; font-weight: 600;">Save</button>
        </div>
      </div>
    `;

    this.panel.content.querySelector('#doc-save-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }

  private save() {
    const notes = (this.panel.content.querySelector('#doc-notes') as HTMLTextAreaElement)?.value || '';
    const designDecisions = (this.panel.content.querySelector('#doc-decisions') as HTMLTextAreaElement)?.value || '';
    const todoList = (this.panel.content.querySelector('#doc-todos') as HTMLTextAreaElement)?.value || '';
    const changelog = (this.panel.content.querySelector('#doc-changelog') as HTMLTextAreaElement)?.value || '';
    const datasheetStr = (this.panel.content.querySelector('#doc-datasheets') as HTMLTextAreaElement)?.value || '';
    const externalStr = (this.panel.content.querySelector('#doc-external') as HTMLTextAreaElement)?.value || '';

    const newDoc: ProjectDocumentation = {
      notes,
      designDecisions,
      todoList,
      changelog,
      datasheetReferences: datasheetStr.split('\\n').map(s => s.trim()).filter(Boolean),
      externalReferences: externalStr.split('\\n').map(s => s.trim()).filter(Boolean)
    };

    this.commandEngine.dispatch({
      id: 'update-doc',
      name: 'UpdateProjectDocumentation',
      payload: { doc: newDoc }
    });
  }

  private escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
