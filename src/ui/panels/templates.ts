import { TemplateManager } from '../../project-system';
import { CommandEngine } from '../../command-engine';
import { ObjectEngine } from '../../object-engine';
import { Panel } from '../components/panel';

export class TemplatesPanel {
  private container: HTMLElement;
  private panel: Panel;
  private isVisible = false;
  private templateManager = new TemplateManager();

  constructor(private appShell: HTMLElement, private commandEngine: CommandEngine, private objectEngine: ObjectEngine) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-templates-panel';
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
      zIndex: '1500',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden'
    });

    this.panel = new Panel('Templates');
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
    const templates = this.templateManager.listTemplates();
    let html = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-md);">
    `;

    for (const tpl of templates) {
      html += `
        <div class="template-card" data-id="${tpl.id}" style="background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-md); cursor: pointer;">
          <h3 style="margin: 0 0 var(--space-xs) 0; color: var(--accent);">${this.escapeHtml(tpl.name)}</h3>
          <p style="margin: 0; color: var(--text-secondary); font: var(--text-body);">${this.escapeHtml(tpl.description)}</p>
        </div>
      `;
    }

    this.panel.content.innerHTML = html;

    const cards = this.panel.content.querySelectorAll('.template-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => { (card as HTMLElement).style.borderColor = 'var(--success)'; });
      card.addEventListener('mouseleave', () => { (card as HTMLElement).style.borderColor = 'var(--text-secondary)'; });
      card.addEventListener('click', () => {
        const tplId = card.getAttribute('data-id');
        if (tplId) {
          const newProject = this.templateManager.createProjectFromTemplate(tplId);
          (this.objectEngine as any).project = newProject;
          alert(`Created new project: ${newProject.name}`);
          this.toggle();
        }
      });
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
