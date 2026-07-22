export interface MenuItem {
  label?: string;
  accelerator?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface MenuCategory {
  label: string;
  items: MenuItem[];
}

export class MenuBarUI {
  private container: HTMLElement;
  private activeDropdown: HTMLElement | null = null;

  constructor(parent: HTMLElement, private categories: MenuCategory[]) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-menu-bar';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.height = '28px';
    this.container.style.background = 'var(--bg-surface)';
    this.container.style.borderBottom = '1px solid var(--border)';
    this.container.style.padding = '0 8px';
    this.container.style.fontSize = '13px';
    this.container.style.userSelect = 'none';

    this.render();
    parent.appendChild(this.container);

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeActiveDropdown();
      }
    });
  }

  private render() {
    this.container.innerHTML = '';
    
    for (const category of this.categories) {
      const btn = document.createElement('div');
      btn.innerText = category.label;
      btn.style.padding = '4px 12px';
      btn.style.cursor = 'pointer';
      btn.style.position = 'relative';
      btn.style.borderRadius = '4px';

      btn.addEventListener('mouseover', () => {
        if (this.activeDropdown && this.activeDropdown.parentElement !== btn) {
          this.openDropdown(btn, category.items);
        } else if (!this.activeDropdown) {
          btn.style.background = 'var(--border)';
        }
      });

      btn.addEventListener('mouseout', () => {
        if (!this.activeDropdown || this.activeDropdown.parentElement !== btn) {
          btn.style.background = 'transparent';
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeDropdown && this.activeDropdown.parentElement === btn) {
          this.closeActiveDropdown();
        } else {
          this.openDropdown(btn, category.items);
        }
      });

      this.container.appendChild(btn);
    }
  }

  private openDropdown(parentBtn: HTMLElement, items: MenuItem[]) {
    this.closeActiveDropdown();
    parentBtn.style.background = 'var(--border)';

    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.background = 'var(--bg-surface)';
    dropdown.style.border = '1px solid var(--border)';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    dropdown.style.minWidth = '200px';
    dropdown.style.zIndex = '9999';
    dropdown.style.padding = '4px 0';
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.height = '1px';
        sep.style.background = 'var(--border)';
        sep.style.margin = '4px 0';
        dropdown.appendChild(sep);
        continue;
      }

      const row = document.createElement('div');
      row.style.padding = '6px 16px';
      row.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
      row.style.color = item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      if (item.disabled) {
        row.title = 'Coming in a future release.';
      }

      const label = document.createElement('span');
      label.innerText = item.label || '';
      row.appendChild(label);

      if (item.accelerator) {
        const shortcut = document.createElement('span');
        shortcut.innerText = item.accelerator;
        shortcut.style.color = 'var(--text-secondary)';
        shortcut.style.fontSize = '11px';
        row.appendChild(shortcut);
      }

      if (!item.disabled) {
        row.addEventListener('mouseover', () => row.style.background = 'var(--border)');
        row.addEventListener('mouseout', () => row.style.background = 'transparent');
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeActiveDropdown();
          if (item.onClick) item.onClick();
        });
      }

      dropdown.appendChild(row);
    }

    parentBtn.appendChild(dropdown);
    this.activeDropdown = dropdown;
  }

  private closeActiveDropdown() {
    if (this.activeDropdown) {
      const parent = this.activeDropdown.parentElement;
      if (parent) parent.style.background = 'transparent';
      this.activeDropdown.remove();
      this.activeDropdown = null;
    }
  }
}
