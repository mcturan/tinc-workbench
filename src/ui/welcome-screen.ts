import { CommandEngine } from '../command-engine';

import { PlaceholderPanel } from './components/placeholder';

export class WelcomeScreen {
  private container: HTMLElement;

  constructor(private parentElement: HTMLElement, private commandEngine: CommandEngine, private onDismiss: () => void) {
    this.container = document.createElement('div');
    this.container.id = 'tinc-welcome-screen';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.background = 'var(--bg-surface)'; // match theme
    this.container.style.zIndex = '2000'; // above everything
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.fontFamily = '"Inter", sans-serif';
    this.container.style.color = 'var(--text-primary)';
    
    this.render();
    this.parentElement.appendChild(this.container);
  }

  private render() {
    this.container.innerHTML = '';
    
    const content = document.createElement('div');
    content.style.margin = 'auto';
    content.style.maxWidth = '900px';
    content.style.width = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '32px';

    // Header
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    
    const title = document.createElement('h1');
    title.innerText = 'TINC Workbench';
    title.style.fontSize = '42px';
    title.style.fontWeight = '700';
    title.style.margin = '0 0 8px 0';
    title.style.color = 'var(--accent)';

    const subtitle = document.createElement('p');
    subtitle.innerText = 'Design. Build. Understand.';
    subtitle.style.fontSize = '18px';
    subtitle.style.color = 'var(--text-secondary)';
    subtitle.style.margin = '0';

    header.appendChild(title);
    header.appendChild(subtitle);
    content.appendChild(header);

    // Layout row for columns
    const columnsRow = document.createElement('div');
    columnsRow.style.display = 'flex';
    columnsRow.style.gap = '48px';
    columnsRow.style.marginTop = '24px';

    // Column 1: Start
    const startCol = document.createElement('div');
    startCol.style.flex = '1';
    startCol.style.display = 'flex';
    startCol.style.flexDirection = 'column';
    startCol.style.gap = '16px';
    
    const startTitle = document.createElement('h2');
    startTitle.innerText = 'Start';
    startTitle.style.fontSize = '20px';
    startTitle.style.borderBottom = '1px solid var(--border)';
    startTitle.style.paddingBottom = '8px';
    startTitle.style.margin = '0';
    startTitle.style.color = 'var(--text-primary)';

    startCol.appendChild(startTitle);
    
    const actions = [
      { label: 'New Empty Project', desc: 'Start with a blank canvas', action: () => this.createNewProject('empty') },
      { label: 'Breadboard Prototype', desc: 'Pre-configured workspace for physical layouts', action: () => this.createNewProject('breadboard') },
      { label: 'Arduino Uno Base', desc: 'Standard Arduino shield template', action: () => this.createNewProject('arduino') },
      { label: 'ESP32 DevKit', desc: 'IoT ready foundation', action: () => this.createNewProject('esp32') },
      { label: 'Open Project...', desc: 'Load an existing .tinc file', action: () => this.openProject() },
    ];

    actions.forEach(a => {
      const btn = document.createElement('div');
      btn.style.padding = '16px';
      btn.style.background = 'var(--bg-sidebar)';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid transparent';
      btn.style.transition = 'all 0.15s ease-in-out';
      
      btn.onmouseover = () => {
        btn.style.background = 'var(--bg-toolbar)';
        btn.style.borderColor = 'var(--border)';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      };
      btn.onmouseout = () => {
        btn.style.background = 'var(--bg-sidebar)';
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
      };
      btn.onclick = a.action;

      const title = document.createElement('div');
      title.innerText = a.label;
      title.style.fontWeight = '600';
      title.style.fontSize = '15px';
      title.style.color = 'var(--text-primary)';

      const desc = document.createElement('div');
      desc.innerText = a.desc;
      desc.style.fontSize = '12px';
      desc.style.color = 'var(--text-secondary)';
      desc.style.marginTop = '4px';

      btn.appendChild(title);
      btn.appendChild(desc);
      startCol.appendChild(btn);
    });

    // Column 2: Examples
    const examplesCol = document.createElement('div');
    examplesCol.style.flex = '1';
    examplesCol.style.display = 'flex';
    examplesCol.style.flexDirection = 'column';
    examplesCol.style.gap = '16px';

    const examplesTitle = document.createElement('h2');
    examplesTitle.innerText = 'Examples';
    examplesTitle.style.fontSize = '20px';
    examplesTitle.style.borderBottom = '1px solid var(--border)';
    examplesTitle.style.paddingBottom = '8px';
    examplesTitle.style.margin = '0';
    examplesTitle.style.color = 'var(--text-primary)';

    examplesCol.appendChild(examplesTitle);

    const examples = [
      { label: 'Blinking LED', desc: 'The "Hello World" of hardware', cat: 'Beginner' },
      { label: 'Audio Amplifier', desc: 'LM386 based small speaker driver', cat: 'Analog' },
      { label: 'WiFi Weather Station', desc: 'BME280 + ESP8266 dashboard', cat: 'IoT' }
    ];

    examples.forEach(ex => {
      const btn = document.createElement('div');
      btn.style.padding = '16px';
      btn.style.background = 'var(--bg-sidebar)';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid transparent';
      btn.style.display = 'flex';
      btn.style.flexDirection = 'column';
      btn.style.transition = 'all 0.15s ease-in-out';
      
      btn.onmouseover = () => {
        btn.style.background = 'var(--bg-toolbar)';
        btn.style.borderColor = 'var(--border)';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      };
      btn.onmouseout = () => {
        btn.style.background = 'var(--bg-sidebar)';
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
      };
      
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'center';

      const title = document.createElement('div');
      title.innerText = ex.label;
      title.style.fontWeight = '600';
      title.style.fontSize = '15px';
      title.style.color = 'var(--text-primary)';

      const badge = document.createElement('span');
      badge.innerText = ex.cat;
      badge.style.fontSize = '10px';
      badge.style.background = 'var(--accent)';
      badge.style.color = '#fff';
      badge.style.padding = '2px 8px';
      badge.style.borderRadius = '10px';
      badge.style.textTransform = 'uppercase';
      badge.style.fontWeight = 'bold';

      headerRow.appendChild(title);
      headerRow.appendChild(badge);

      const desc = document.createElement('div');
      desc.innerText = ex.desc;
      desc.style.fontSize = '12px';
      desc.style.color = 'var(--text-secondary)';
      desc.style.marginTop = '4px';

      btn.appendChild(headerRow);
      btn.appendChild(desc);
      btn.onclick = () => this.showPlaceholder('Example Project', ex.desc, 'In Development', 'v1.1.0', '💡');
      examplesCol.appendChild(btn);
    });

    columnsRow.appendChild(startCol);
    columnsRow.appendChild(examplesCol);
    content.appendChild(columnsRow);

    this.container.appendChild(content);
  }

  private showPlaceholder(title: string, desc: string, status: string, version: string, icon: string) {
    this.container.innerHTML = '';
    const placeholder = new PlaceholderPanel(title, desc, status, version, icon);
    
    // Add a back button
    const backBtn = document.createElement('button');
    backBtn.innerText = '← Back to Welcome';
    backBtn.style.marginTop = '24px';
    backBtn.style.padding = '8px 16px';
    backBtn.style.background = 'transparent';
    backBtn.style.color = 'var(--text-primary)';
    backBtn.style.border = '1px solid var(--border)';
    backBtn.style.borderRadius = '4px';
    backBtn.style.cursor = 'pointer';
    backBtn.onclick = () => {
      this.container.innerHTML = '';
      this.render();
    };
    
    placeholder.element.appendChild(backBtn);
    this.container.appendChild(placeholder.element);
  }

  private createNewProject(template: string) {
    if (template === 'empty') {
      this.close();
    } else {
      this.showPlaceholder(
        'Project Template',
        'This project template is not yet available.',
        'In Development',
        'v1.1.0',
        '📄'
      );
    }
  }

  private openProject() {
    this.showPlaceholder(
      'Open Project',
      'File browser is not yet available.',
      'In Development',
      'v1.0.1',
      '📂'
    );
  }

  public close() {
    this.container.style.display = 'none';
    this.onDismiss();
  }
}
