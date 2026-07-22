import { ObjectEngine } from '../object-engine';
import { CommandEngine } from '../command-engine';
import { ProjectExplorer } from '../project-explorer/explorer';
import { PropertyInspector } from '../property-inspector/inspector';
import { DeviceWorkspaceUI } from './device-workspace';
import { DocumentationPanel } from './panels/documentation';
import { GlobalSearchPanel } from './panels/global-search';

export class WorkbenchUI {
  public appShell: HTMLElement;
  public menuBarContainer: HTMLElement;
  public canvasContainer: HTMLElement;
  public deviceWorkspaceContainer: HTMLElement;
  
  public activityBar: HTMLElement;
  private leftSidebar: HTMLElement;
  private rightSidebar: HTMLElement;
  private centerArea: HTMLElement;
  private toolbar: HTMLElement;
  private statusBar: HTMLElement;
  private tabBar: HTMLElement;

  private tabSchematic: HTMLElement;
  private tabDevice: HTMLElement;

  private explorer!: ProjectExplorer;
  private inspector!: PropertyInspector;

  constructor(private containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    container.innerHTML = '';

    this.appShell = document.createElement('div');
    this.appShell.id = 'tinc-workbench';
    this.appShell.style.display = 'flex';
    this.appShell.style.flexDirection = 'column';
    this.appShell.style.width = '100%';
    this.appShell.style.height = '100vh';
    this.appShell.style.overflow = 'hidden';
    this.appShell.style.fontFamily = 'var(--font-family)';
    this.appShell.style.background = 'var(--bg-surface)';
    this.appShell.style.color = 'var(--text-primary)';
    this.appShell.style.userSelect = 'none';

    // 0. Menu Bar Container
    this.menuBarContainer = document.createElement('div');
    this.appShell.appendChild(this.menuBarContainer);

    // 1. Toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'tinc-toolbar';
    this.toolbar.style.display = 'flex';
    this.toolbar.style.alignItems = 'center';
    this.toolbar.style.height = '44px';
    this.toolbar.style.borderBottom = '1px solid var(--border)';
    this.toolbar.style.padding = '0 var(--space-lg)';
    this.toolbar.style.gap = 'var(--space-md)';
    this.toolbar.style.background = 'var(--bg-toolbar)';
    this.toolbar.style.zIndex = '100';

    const btnToggleSidebar = document.createElement('button');
    btnToggleSidebar.innerText = '☰';
    btnToggleSidebar.id = 'btn-toggle-sidebar';
    btnToggleSidebar.title = 'Toggle Left Sidebar';
    btnToggleSidebar.style.background = 'transparent';
    btnToggleSidebar.style.border = 'none';
    btnToggleSidebar.style.color = 'var(--text-primary)';
    btnToggleSidebar.style.fontSize = '18px';
    btnToggleSidebar.style.cursor = 'pointer';

    const spacer = document.createElement('div');
    spacer.style.flexGrow = '1';

    this.toolbar.appendChild(btnToggleSidebar);
    this.toolbar.appendChild(spacer);
    this.appShell.appendChild(this.toolbar);

    btnToggleSidebar.addEventListener('click', () => {
      this.leftSidebar.style.display = this.leftSidebar.style.display === 'none' ? 'flex' : 'none';
    });

    // 2. Main Area (flex row)
    const mainRow = document.createElement('div');
    mainRow.style.display = 'flex';
    mainRow.style.flexGrow = '1';
    mainRow.style.minHeight = '0';

    // Activity Bar
    this.activityBar = document.createElement('div');
    this.activityBar.id = 'tinc-activity-bar';
    this.activityBar.style.width = '48px';
    this.activityBar.style.borderRight = '1px solid var(--border)';
    this.activityBar.style.display = 'flex';
    this.activityBar.style.flexDirection = 'column';
    this.activityBar.style.alignItems = 'center';
    this.activityBar.style.paddingTop = '8px';
    this.activityBar.style.gap = '8px';
    this.activityBar.style.background = 'var(--bg-toolbar)';
    this.activityBar.style.zIndex = '51';

    // Left Sidebar
    this.leftSidebar = document.createElement('div');
    this.leftSidebar.id = 'tinc-left-sidebar';
    this.leftSidebar.style.width = '280px';
    this.leftSidebar.style.borderRight = '1px solid var(--border)';
    this.leftSidebar.style.display = 'flex';
    this.leftSidebar.style.flexDirection = 'column';
    this.leftSidebar.style.background = 'var(--bg-sidebar)';
    this.leftSidebar.style.zIndex = '50';
    this.leftSidebar.style.overflowY = 'hidden'; // We will manage internal overflow
    this.leftSidebar.style.transition = 'width 0.2s ease';

    // Center Area
    this.centerArea = document.createElement('div');
    this.centerArea.style.flexGrow = '1';
    this.centerArea.style.display = 'flex';
    this.centerArea.style.flexDirection = 'column';
    this.centerArea.style.position = 'relative';
    this.centerArea.style.background = 'var(--bg-canvas)'; // Deeper canvas background

    // Tabs
    this.tabBar = document.createElement('div');
    this.tabBar.id = 'tinc-tab-bar';
    this.tabBar.style.height = '36px';
    this.tabBar.style.borderBottom = '1px solid var(--border)';
    this.tabBar.style.display = 'flex';
    this.tabBar.style.background = 'var(--bg-toolbar)';

    this.tabSchematic = document.createElement('div');
    this.tabSchematic.innerText = 'Schematic';
    this.tabSchematic.style.padding = '8px 16px';
    this.tabSchematic.style.cursor = 'pointer';
    this.tabSchematic.style.background = 'var(--bg-surface)';
    this.tabSchematic.style.borderTop = '2px solid var(--accent)';

    this.tabDevice = document.createElement('div');
    this.tabDevice.innerText = 'Device Workspace';
    this.tabDevice.style.padding = '8px 16px';
    this.tabDevice.style.cursor = 'pointer';
    this.tabDevice.style.opacity = '0.7';

    this.tabBar.appendChild(this.tabSchematic);
    this.tabBar.appendChild(this.tabDevice);
    this.centerArea.appendChild(this.tabBar);

    // Workspace Container
    const workspaceContainer = document.createElement('div');
    workspaceContainer.style.flexGrow = '1';
    workspaceContainer.style.position = 'relative';
    workspaceContainer.style.overflow = 'hidden';

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.style.width = '100%';
    this.canvasContainer.style.height = '100%';
    this.canvasContainer.style.position = 'absolute';
    
    this.deviceWorkspaceContainer = document.createElement('div');
    this.deviceWorkspaceContainer.style.width = '100%';
    this.deviceWorkspaceContainer.style.height = '100%';
    this.deviceWorkspaceContainer.style.position = 'absolute';
    this.deviceWorkspaceContainer.style.display = 'none';

    workspaceContainer.appendChild(this.canvasContainer);
    workspaceContainer.appendChild(this.deviceWorkspaceContainer);
    this.centerArea.appendChild(workspaceContainer);

    // Right Sidebar
    this.rightSidebar = document.createElement('div');
    this.rightSidebar.id = 'tinc-right-sidebar';
    this.rightSidebar.style.width = '320px';
    this.rightSidebar.style.borderLeft = '1px solid var(--border)';
    this.rightSidebar.style.display = 'none'; // Auto-hide initially
    this.rightSidebar.style.flexDirection = 'column';
    this.rightSidebar.style.background = 'var(--bg-sidebar)';
    this.rightSidebar.style.zIndex = '50';
    this.rightSidebar.style.overflowY = 'auto';
    this.rightSidebar.style.transition = 'width 0.2s ease';

    mainRow.appendChild(this.activityBar);
    mainRow.appendChild(this.leftSidebar);
    mainRow.appendChild(this.centerArea);
    mainRow.appendChild(this.rightSidebar);
    this.appShell.appendChild(mainRow);

    // 3. Status Bar
    this.statusBar = document.createElement('div');
    this.statusBar.id = 'tinc-status-bar';
    this.statusBar.style.height = '24px';
    this.statusBar.style.borderTop = '1px solid var(--border)';
    this.statusBar.style.background = 'var(--bg-toolbar)';
    this.statusBar.style.color = 'var(--text-secondary)';
    this.statusBar.style.display = 'flex';
    this.statusBar.style.alignItems = 'center';
    this.statusBar.style.padding = '0 var(--space-sm)';
    this.statusBar.style.font = 'var(--text-caption)';
    this.statusBar.style.justifyContent = 'space-between';

    const statusLeft = document.createElement('div');
    statusLeft.id = 'status-left';
    statusLeft.innerText = 'TINC Workbench | Ready';
    
    const statusRight = document.createElement('div');
    statusRight.id = 'status-right';
    statusRight.innerText = 'ERC: OK | Syncing...';

    this.statusBar.appendChild(statusLeft);
    this.statusBar.appendChild(statusRight);
    this.appShell.appendChild(this.statusBar);

    container.appendChild(this.appShell);
    
    this.setupTabSwitching();
  }

  public onTabChange: ((tab: 'schematic' | 'device') => void) | null = null;

  private setupTabSwitching() {
    this.tabSchematic.addEventListener('click', () => {
      this.tabSchematic.style.background = 'var(--bg-surface)';
      this.tabSchematic.style.borderTop = '2px solid var(--accent)';
      this.tabSchematic.style.opacity = '1';
      
      this.tabDevice.style.background = 'transparent';
      this.tabDevice.style.borderTop = 'none';
      this.tabDevice.style.opacity = '0.7';

      this.canvasContainer.style.display = 'block';
      this.deviceWorkspaceContainer.style.display = 'none';
      if (this.onTabChange) this.onTabChange('schematic');
    });

    this.tabDevice.addEventListener('click', () => {
      this.tabDevice.style.background = 'var(--bg-surface)';
      this.tabDevice.style.borderTop = '2px solid var(--accent)';
      this.tabDevice.style.opacity = '1';
      
      this.tabSchematic.style.background = 'transparent';
      this.tabSchematic.style.borderTop = 'none';
      this.tabSchematic.style.opacity = '0.7';

      this.canvasContainer.style.display = 'none';
      this.deviceWorkspaceContainer.style.display = 'block';
      if (this.onTabChange) this.onTabChange('device');
    });
  }

  public getLeftSidebar(): HTMLElement {
    return this.leftSidebar;
  }

  public getRightSidebar(): HTMLElement {
    return this.rightSidebar;
  }

  public getToolbar(): HTMLElement {
    return this.toolbar;
  }

  public setStatus(left: string, right: string) {
    document.getElementById('status-left')!.innerText = left;
    document.getElementById('status-right')!.innerText = right;
  }
}
