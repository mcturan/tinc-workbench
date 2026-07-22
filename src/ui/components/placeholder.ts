export class PlaceholderPanel {
  public element: HTMLElement;

  constructor(
    title: string,
    description: string,
    developmentStatus: string,
    futureVersion: string,
    icon: string = '🚧'
  ) {
    this.element = document.createElement('div');
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.alignItems = 'center';
    this.element.style.justifyContent = 'center';
    this.element.style.padding = '32px';
    this.element.style.textAlign = 'center';
    this.element.style.background = 'var(--bg-surface)';
    this.element.style.boxSizing = 'border-box';

    const iconEl = document.createElement('div');
    iconEl.innerText = icon;
    iconEl.style.fontSize = '48px';
    iconEl.style.marginBottom = '24px';
    iconEl.style.opacity = '0.5';

    const titleEl = document.createElement('h2');
    titleEl.innerText = title;
    titleEl.style.margin = '0 0 16px 0';
    titleEl.style.fontSize = '18px';
    titleEl.style.fontWeight = '600';
    titleEl.style.color = 'var(--text-primary)';

    const descEl = document.createElement('p');
    descEl.innerText = description;
    descEl.style.margin = '0 0 32px 0';
    descEl.style.fontSize = '14px';
    descEl.style.color = 'var(--text-secondary)';
    descEl.style.maxWidth = '300px';
    descEl.style.lineHeight = '1.5';

    const statusBox = document.createElement('div');
    statusBox.style.padding = '12px 24px';
    statusBox.style.background = 'var(--bg-toolbar)';
    statusBox.style.borderRadius = '6px';
    statusBox.style.border = '1px solid var(--border)';
    statusBox.style.display = 'inline-flex';
    statusBox.style.flexDirection = 'column';
    statusBox.style.gap = '8px';

    const devStatusEl = document.createElement('div');
    devStatusEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px;">Current status:</span> <span style="color:var(--accent);font-weight:600;font-size:13px;">${developmentStatus}</span>`;

    const versionEl = document.createElement('div');
    versionEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px;">Planned for:</span> <span style="font-size:13px;color:var(--text-primary);">${futureVersion}</span>`;

    statusBox.appendChild(devStatusEl);
    statusBox.appendChild(versionEl);

    this.element.appendChild(iconEl);
    this.element.appendChild(titleEl);
    this.element.appendChild(descEl);
    this.element.appendChild(statusBox);
  }
}
