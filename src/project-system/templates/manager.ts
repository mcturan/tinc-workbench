import { Project, ProjectDocumentation } from '../../types';
import { generateUUID } from '../../utils';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'MCU' | 'Analog' | 'Power' | 'RF' | 'Blank';
  generate: () => Project;
}

export class TemplateManager {
  private templates: ProjectTemplate[] = [];

  constructor() {
    this.registerDefaultTemplates();
  }

  registerTemplate(template: ProjectTemplate) {
    this.templates.push(template);
  }

  listTemplates(): Pick<ProjectTemplate, 'id' | 'name' | 'description' | 'category'>[] {
    return this.templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category
    }));
  }

  createProjectFromTemplate(templateId: string): Project {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template.generate();
  }

  private registerDefaultTemplates() {
    this.registerTemplate({
      id: 'blank',
      name: 'Blank Project',
      description: 'An empty project to start from scratch',
      category: 'Blank',
      generate: () => this.createBaseProject('New Project', 'Blank project template')
    });

    this.registerTemplate({
      id: 'arduino-uno',
      name: 'Arduino Uno Shield',
      description: 'Standard Arduino Uno R3 shield template with predefined headers',
      category: 'MCU',
      generate: () => this.createBaseProject('Arduino Shield', 'Template for Arduino Uno R3 compatible shields')
    });

    this.registerTemplate({
      id: 'esp32-dev',
      name: 'ESP32 Development Board',
      description: 'Starter project for an ESP32-WROOM based IoT device',
      category: 'MCU',
      generate: () => this.createBaseProject('ESP32 IoT Node', 'ESP32-WROOM-32 base template with programming header and boot circuit')
    });

    this.registerTemplate({
      id: 'stm32-base',
      name: 'STM32 Minimum System',
      description: 'STM32F103 minimum system board with SWD and crystal oscillator',
      category: 'MCU',
      generate: () => this.createBaseProject('STM32 Min Sys', 'STM32 Minimum System Board')
    });

    this.registerTemplate({
      id: 'rp2040-base',
      name: 'RP2040 Pico Clone',
      description: 'Base schematic for RP2040 designs including flash memory and crystal',
      category: 'MCU',
      generate: () => this.createBaseProject('RP2040 Base', 'Raspberry Pi RP2040 base design')
    });

    this.registerTemplate({
      id: '555-timer',
      name: '555 Timer Astable',
      description: 'Classic NE555 astable multivibrator circuit',
      category: 'Analog',
      generate: () => this.createBaseProject('555 Blink', 'NE555 Timer in astable mode')
    });

    this.registerTemplate({
      id: 'audio-amp',
      name: 'LM386 Audio Amp',
      description: 'Simple LM386 based audio amplifier for small speakers',
      category: 'Analog',
      generate: () => this.createBaseProject('Audio Amplifier', 'LM386 Audio Amplifier')
    });

    this.registerTemplate({
      id: 'buck-converter',
      name: 'LM2596 Buck Converter',
      description: 'Step-down switching power supply template',
      category: 'Power',
      generate: () => this.createBaseProject('Buck Converter', 'LM2596 Step-Down Converter')
    });

    this.registerTemplate({
      id: 'linear-psu',
      name: 'LM317 Linear PSU',
      description: 'Adjustable linear power supply template',
      category: 'Power',
      generate: () => this.createBaseProject('Linear PSU', 'LM317 Adjustable Power Supply')
    });

    this.registerTemplate({
      id: 'amateur-radio-filter',
      name: 'Low Pass Filter (HF)',
      description: '7-element Chebyshev Low Pass Filter for HF Bands',
      category: 'RF',
      generate: () => this.createBaseProject('HF LPF', 'High Frequency Low Pass Filter for Amateur Radio')
    });
  }

  private createBaseProject(name: string, description: string): Project {
    const doc: ProjectDocumentation = {
      notes: description,
      designDecisions: '',
      todoList: '- [ ] Complete Schematic\n- [ ] Assign Footprints\n- [ ] Layout PCB',
      changelog: '0.1.0 - Initial template generation',
      datasheetReferences: [],
      externalReferences: []
    };

    return {
      id: `proj-${generateUUID()}`,
      name,
      documentation: doc,
      pages: [
        {
          id: `page-${generateUUID()}`,
          name: 'Schematic',
          layers: [
            {
              id: `layer-${generateUUID()}`,
              name: 'Default Layer',
              visible: true,
              locked: false,
              objects: []
            }
          ],
          viewport: { zoom: 1, panX: 0, panY: 0 }
        }
      ]
    };
  }
}
