import { globalWorkshopManager, InventoryItem, InventoryCategory, StorageLocation } from '../../workshop-manager';
import { PropertyInspector } from '../../property-inspector/inspector';
import { WorkshopPropertyAdapter } from '../../workshop-manager/property-adapter';
import { Panel } from '../components/panel';

export class InventoryBrowserPanel {
  private container: HTMLElement;
  private panel: Panel;
  private listContainer: HTMLElement;
  private propertyAdapter: WorkshopPropertyAdapter;

  private currentCategoryId?: string;
  private currentLocationId?: string;
  private searchQuery: string = '';

  constructor(
    parent: HTMLElement,
    private propertyInspector: PropertyInspector
  ) {
    this.propertyAdapter = new WorkshopPropertyAdapter(globalWorkshopManager);
    
    this.container = document.createElement('div');
    this.container.id = 'tinc-inventory-browser';
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

    this.panel = new Panel('Workshop Inventory');
    this.panel.element.style.borderTop = 'none';
    this.container.appendChild(this.panel.element);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.hide());
    
    this.panel.header.appendChild(closeBtn);
    
    this.listContainer = this.panel.content;
    
    this.buildUI();
    parent.appendChild(this.container);

    // Initial render
    this.refreshList();
  }

  public show(): void {
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  private buildUI(): void {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.padding = 'var(--space-md)';
    controlsContainer.style.borderBottom = '1px solid var(--border)';
    this.panel.content.appendChild(controlsContainer);

    // Search
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search inventory...';
    searchInput.style.width = '100%';
    searchInput.style.padding = 'var(--space-sm)';
    searchInput.style.background = 'var(--bg-canvas)';
    searchInput.style.border = '1px solid var(--border)';
    searchInput.style.borderRadius = 'var(--radius-sm)';
    searchInput.style.color = 'var(--text-primary)';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.font = 'var(--text-body)';
    
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.refreshList();
    });
    
    controlsContainer.appendChild(searchInput);

    // List Container
    this.listContainer = document.createElement('div');
    this.listContainer.style.flex = '1';
    this.listContainer.style.overflowY = 'auto';
    this.listContainer.style.padding = 'var(--space-sm)';
    this.panel.content.appendChild(this.listContainer);

    // Add Button
    const footer = document.createElement('div');
    footer.style.padding = 'var(--space-md)';
    footer.style.borderTop = '1px solid var(--border)';
    
    const btnAdd = document.createElement('button');
    btnAdd.innerText = '+ Add Item';
    btnAdd.style.width = '100%';
    btnAdd.style.padding = 'var(--space-sm)';
    btnAdd.style.background = 'var(--accent)';
    btnAdd.style.color = 'var(--text-primary)';
    btnAdd.style.border = 'none';
    btnAdd.style.borderRadius = 'var(--radius-sm)';
    btnAdd.style.cursor = 'pointer';
    btnAdd.style.font = 'var(--text-body)';
    
    btnAdd.addEventListener('click', () => {
      const newItem = globalWorkshopManager.addItem({
        name: 'New Item',
        categoryId: 'cat-passives',
        quantity: 0,
        unit: 'pcs',
        properties: {}
      });
      this.refreshList();
      this.selectItem(newItem.id);
    });
    
    footer.appendChild(btnAdd);
    this.panel.element.appendChild(footer);
  }

  private refreshList(): void {
    this.listContainer.innerHTML = '';
    
    const items = globalWorkshopManager.searchItems(
      this.searchQuery, 
      this.currentCategoryId, 
      this.currentLocationId
    );

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.innerText = 'No items found.';
      empty.style.padding = 'var(--space-md)';
      empty.style.color = 'var(--text-secondary)';
      empty.style.font = 'var(--text-body)';
      empty.style.textAlign = 'center';
      this.listContainer.appendChild(empty);
      return;
    }

    for (const item of items) {
      const el = document.createElement('div');
      el.style.padding = 'var(--space-sm) var(--space-md)';
      el.style.margin = 'var(--space-xs) 0';
      el.style.background = 'var(--bg-canvas)';
      el.style.border = '1px solid transparent';
      el.style.borderRadius = 'var(--radius-sm)';
      el.style.cursor = 'pointer';
      el.style.font = 'var(--text-body)';
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
      el.style.transition = 'var(--transition-fast)';
      el.style.userSelect = 'none';
      
      el.addEventListener('mouseover', () => {
        el.style.background = 'var(--bg-toolbar)';
        el.style.border = '1px solid var(--accent)';
      });
      el.addEventListener('mouseout', () => {
        el.style.background = 'var(--bg-canvas)';
        el.style.border = '1px solid transparent';
      });
      
      const nameSpan = document.createElement('span');
      nameSpan.innerText = item.name;
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.style.whiteSpace = 'nowrap';
      nameSpan.style.color = 'var(--text-primary)';
      
      const qtySpan = document.createElement('span');
      qtySpan.innerText = `${item.quantity} ${item.unit}`;
      qtySpan.style.color = 'var(--text-secondary)';
      qtySpan.style.font = 'var(--text-caption)';
      
      el.appendChild(nameSpan);
      el.appendChild(qtySpan);
      
      el.addEventListener('click', () => {
        this.selectItem(item.id);
      });
      
      this.listContainer.appendChild(el);
    }
  }

  private selectItem(id: string): void {
    // Basic highlight could be added here
    this.propertyInspector.refresh(
      [id], 
      undefined as any, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      this.propertyAdapter as any
    );
  }
}
