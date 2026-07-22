import { ProjectIntelligenceEngine } from '../../project-intelligence/engine';
import { IntelligenceSummary } from '../../project-intelligence/types';
import { Panel } from '../components/panel';

export class ProjectDashboardPanel {
  private container: HTMLElement;
  private panel: Panel;
  private contentContainer: HTMLElement;

  constructor(
    parent: HTMLElement,
    private engine: ProjectIntelligenceEngine,
    private onNavigateToInventory?: (itemId: string) => void,
    private onNavigateToDeviceWorkspace?: (objectId: string) => void
  ) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-project-dashboard';
    this.container.style.position = 'absolute';
    this.container.style.left = '300px';
    this.container.style.top = '100px';
    this.container.style.width = '400px';
    this.container.style.height = '600px';
    this.container.style.background = 'var(--bg-surface)';
    this.container.style.border = '1px solid var(--border)';
    this.container.style.borderRadius = 'var(--radius-lg)';
    this.container.style.boxShadow = 'var(--shadow-modal)';
    this.container.style.display = 'none';
    this.container.style.flexDirection = 'column';
    this.container.style.zIndex = '1000';
    this.container.style.overflow = 'hidden';

    this.panel = new Panel('Project Dashboard');
    this.panel.element.style.borderTop = 'none';
    this.container.appendChild(this.panel.element);
    
    this.contentContainer = this.panel.content;
    
    this.buildUI();
    parent.appendChild(this.container);
  }

  private buildUI(): void {
    // Header Controls
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = 'var(--space-sm)';
    this.panel.header.innerText = '';
    
    const title = document.createElement('span');
    title.innerText = 'Project Dashboard';
    this.panel.header.appendChild(title);
    this.panel.header.appendChild(controls);

    const refreshBtn = document.createElement('button');
    refreshBtn.innerText = 'Refresh';
    refreshBtn.style.padding = 'var(--space-xs) var(--space-sm)';
    refreshBtn.style.background = 'var(--accent)';
    refreshBtn.style.color = 'var(--text-primary)';
    refreshBtn.style.border = 'none';
    refreshBtn.style.borderRadius = 'var(--radius-sm)';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.addEventListener('click', () => this.refresh());
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.hide());
    
    controls.appendChild(refreshBtn);
    controls.appendChild(closeBtn);
  }

  public show(): void {
    this.container.style.display = 'flex';
    this.refresh();
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public toggle(): void {
    if (this.container.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  public refresh(): void {
    const summary = this.engine.analyze();
    this.renderSummary(summary);
  }

  private renderSummary(summary: IntelligenceSummary): void {
    this.contentContainer.innerHTML = '';

    // Statistics Section
    this.renderSection('Statistics', () => {
      const { statistics } = summary;
      let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">';
      html += this.renderStatBox('Symbols', statistics.symbolCount);
      html += this.renderStatBox('Physical Modules', statistics.physicalModuleCount);
      html += this.renderStatBox('Wires', statistics.wireCount);
      html += this.renderStatBox('Inventory Refs', statistics.inventoryReferenceCount);
      html += '</div>';
      return html;
    });

    // Inventory Requirements Section
    this.renderSection('Inventory Requirements', () => {
      const { inventoryRequirements } = summary;
      if (inventoryRequirements.length === 0) return '<p style="color: var(--text-secondary); font: var(--text-body);">No inventory items referenced.</p>';
      
      const list = document.createElement('div');
      for (const req of inventoryRequirements) {
        const item = document.createElement('div');
        item.style.padding = 'var(--space-sm)';
        item.style.marginBottom = 'var(--space-sm)';
        item.style.background = 'var(--bg-canvas)';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = 'var(--radius-sm)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        
        let color = 'var(--success)'; // sufficient
        if (req.status === 'missing') color = 'var(--error)';
        else if (req.status === 'insufficient') color = 'var(--warning)';
        
        item.innerHTML = `
          <div>
            <div style="font: var(--text-body); color: var(--text-primary);">${req.itemName}</div>
            <div style="font: var(--text-caption); color: ${color}; margin-top: var(--space-xs);">${req.status.toUpperCase()} (${req.availableQuantity} / ${req.requiredQuantity})</div>
          </div>
        `;

        // Cross-reference navigation
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          if (this.onNavigateToInventory) this.onNavigateToInventory(req.itemId);
        });

        list.appendChild(item);
      }
      return list;
    });

    // Health Issues Section
    this.renderSection('Workspace Health', () => {
      const { healthIssues } = summary;
      if (healthIssues.length === 0) return '<p style="color: var(--success); font: var(--text-body);">No issues found. Workspace is healthy.</p>';
      
      const list = document.createElement('div');
      for (const issue of healthIssues) {
        const item = document.createElement('div');
        item.style.padding = 'var(--space-sm)';
        item.style.marginBottom = 'var(--space-sm)';
        item.style.background = 'var(--bg-canvas)';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = 'var(--radius-sm)';
        item.style.borderLeft = `4px solid ${issue.severity === 'error' ? 'var(--error)' : issue.severity === 'warning' ? 'var(--warning)' : 'var(--accent)'}`;
        
        item.innerHTML = `
          <div style="font: var(--text-caption); color: var(--text-secondary); text-transform: uppercase;">${issue.category}</div>
          <div style="font: var(--text-body); color: var(--text-primary); margin-top: var(--space-xs);">${issue.message}</div>
        `;

        if (issue.targetObjectId) {
          item.style.cursor = 'pointer';
          item.title = 'Click to jump to object';
          item.addEventListener('click', () => {
            if (this.onNavigateToDeviceWorkspace) this.onNavigateToDeviceWorkspace(issue.targetObjectId!);
          });
        }

        list.appendChild(item);
      }
      return list;
    });
  }

  private renderSection(title: string, contentGenerator: () => string | HTMLElement): void {
    const section = document.createElement('div');
    section.style.marginBottom = 'var(--space-lg)';
    section.style.padding = 'var(--space-md)';
    
    const h3 = document.createElement('h3');
    h3.innerText = title;
    h3.style.margin = '0 0 var(--space-md) 0';
    h3.style.font = 'var(--text-body)';
    h3.style.fontWeight = '600';
    h3.style.color = 'var(--text-secondary)';
    section.appendChild(h3);
    
    const content = contentGenerator();
    if (typeof content === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = content;
      section.appendChild(wrapper);
    } else {
      section.appendChild(content);
    }
    
    this.contentContainer.appendChild(section);
  }

  private renderStatBox(label: string, value: number): string {
    return `
      <div style="background: var(--bg-canvas); padding: var(--space-md); border-radius: var(--radius-sm); border: 1px solid var(--border); text-align: center;">
        <div style="font-size: 20px; font-weight: 600; color: var(--text-primary);">${value}</div>
        <div style="font: var(--text-caption); color: var(--text-secondary); text-transform: uppercase; margin-top: var(--space-xs);">${label}</div>
      </div>
    `;
  }
}
