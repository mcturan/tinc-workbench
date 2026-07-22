export class Panel {
  public element: HTMLElement;
  public content: HTMLElement;
  public header: HTMLElement;

  constructor(title: string) {
    if (typeof document !== 'undefined') {
      this.element = document.createElement('div');
      this.element.style.display = 'flex';
      this.element.style.flexDirection = 'column';
      this.element.style.flex = '1';
      this.element.style.minHeight = '0';
      this.element.style.borderTop = '1px solid var(--border)';
      this.element.style.background = 'var(--bg-sidebar)';

      this.header = document.createElement('div');
      this.header.innerText = title;
      this.header.style.padding = 'var(--space-sm) var(--space-md)';
      this.header.style.font = 'var(--text-caption)';
      this.header.style.textTransform = 'uppercase';
      this.header.style.color = 'var(--text-secondary)';
      this.header.style.background = 'var(--bg-toolbar)';
      this.header.style.borderBottom = '1px solid var(--border)';
      this.header.style.flexShrink = '0';
      this.header.style.display = 'flex';
      this.header.style.alignItems = 'center';
      this.header.style.justifyContent = 'space-between';
      this.header.style.userSelect = 'none';

      this.content = document.createElement('div');
      this.content.style.display = 'flex';
      this.content.style.flexDirection = 'column';
      this.content.style.flex = '1';
      this.content.style.overflowY = 'auto';

      this.element.appendChild(this.header);
      this.element.appendChild(this.content);
    } else {
      this.element = { style: {} } as HTMLElement;
      this.header = { style: {} } as HTMLElement;
      this.content = { style: {} } as HTMLElement;
    }
  }
}
