import { ObjectEngine } from '../object-engine';
import { globalRegistry } from '../component-library';
import { getLibraryMetadata } from '../library/metadata';
import { PropertyFormatter } from './formatter';
import { PropertyRenderer } from './renderer';
import { SemanticObject } from '../types';
import { getLabel, getSignal, validateSignals } from '../net-labels';
import { resolveHierarchy } from '../hierarchy';
import { getBus, listBusEntries, listBusTaps } from '../pro-schematic/bus/manager';
import { getConnector } from '../pro-schematic/connectors/manager';
import { getAnnotation } from '../pro-schematic/annotation/manager';
import { getNetClass } from '../pro-schematic/netclass/manager';
import { Panel } from '../ui/components/panel';

export class PropertyInspector {
  private formatter = new PropertyFormatter();
  private renderer = new PropertyRenderer();
  private selectedIds: string[] = [];
  private isVisible = true;
  private panel: Panel;

  constructor(private parent: HTMLElement) {
    this.panel = new Panel('Property Inspector');
    this.parent.appendChild(this.panel.element);
  }

  show(): void {
    this.isVisible = true;
    this.panel.element.style.display = 'flex';
  }

  hide(): void {
    this.isVisible = false;
    this.panel.element.style.display = 'none';
  }

  refresh(selectedIds: string[], objectEngine: ObjectEngine, boardManager?: any, routingContext?: {
    state: any;
    onChangeLayer: (layer: string) => void;
    onChangeWidth: (width: number) => void;
    onChangeCornerMode: (mode: '45' | '90' | 'free') => void;
  }, drcViolations?: any[], footprintAdapter?: any, symbolAdapter?: any, deviceAdapter?: any, workshopAdapter?: any): void {
    this.selectedIds = [...selectedIds];
    if (this.selectedIds.length === 0) {
      this.hide();
      this.panel.content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font:var(--text-body);">No Selection</div>`;
      return;
    } else {
      this.show();
    }

    // Default to the first adapter that is present and has properties
    if (workshopAdapter) {
      const groups = workshopAdapter.getProperties(this.selectedIds);
      if (groups && groups.length > 0) {
        let html = '';
        for (const group of groups) {
          html += `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${group.name}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #8b5cf6; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Inventory Properties</span>
            </div>
            <div style="margin-bottom: 16px;">
          `;
          for (const prop of group.properties) {
            html += `<p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">${prop.label}: <strong>${prop.value}</strong></p>`;
          }
          html += `</div>`;
        }
        this.panel.content.innerHTML = html;
        return;
      }
    }

    if (symbolAdapter) {
      const groups = symbolAdapter.getProperties(this.selectedIds);
      if (groups.length > 0) {
        let html = '';
        for (const group of groups) {
          html += `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${group.name}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #6366f1; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Symbol Editor</span>
            </div>
            <div style="margin-bottom: 16px;">
          `;
          for (const prop of group.properties) {
            html += `<p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">${prop.label}: <strong>${prop.value}</strong></p>`;
          }
          html += `</div>`;
        }
        this.panel.content.innerHTML = html;
        return;
      }
    }

    if (deviceAdapter) {
      const groups = deviceAdapter.getProperties(this.selectedIds);
      if (groups && groups.length > 0) {
        let html = '';
        for (const group of groups) {
          html += `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${group.name}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #10b981; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Device Properties</span>
            </div>
            <div style="margin-bottom: 16px;">
          `;
          for (const prop of group.properties) {
            html += `<p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">${prop.label}: <strong>${prop.value}</strong></p>`;
          }
          html += `</div>`;
        }
        this.panel.content.innerHTML = html;
        return;
      }
    }

    if (footprintAdapter) {
      const groups = footprintAdapter.getProperties(this.selectedIds);
      if (groups.length > 0) {
        let html = '';
        for (const group of groups) {
          html += `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${group.name}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #ec4899; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Properties</span>
            </div>
            <div style="margin-bottom: 16px;">
          `;
          for (const prop of group.properties) {
            html += `<p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">${prop.label}: <strong>${prop.value}</strong></p>`;
          }
          html += `</div>`;
        }
        this.panel.content.innerHTML = html;
        return;
      }
    }

    if (!this.isVisible) {
      return;
    }

    if (drcViolations && drcViolations.length > 0 && this.selectedIds.length === 1) {
      // Find if the selected ID is a violation itself
      const violation = drcViolations.find(v => v.id === this.selectedIds[0]);
      if (violation) {
        const html = `
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">DRC Violation</h3>
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${violation.severity === 'error' ? '#ef4444' : '#f59e0b'}; color: #ffffff; padding: 2px 8px; border-radius: 12px;">${violation.severity}</span>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Category: <strong>${violation.category}</strong></p>
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Rule ID: <strong>${violation.ruleId}</strong></p>
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Location: <strong>(${violation.location.x}, ${violation.location.y})</strong></p>
            <p style="margin: 8px 0; font-size: 13px; color: #ffffff; font-weight: 500;">${violation.message}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Related Objects: <strong>${violation.relatedObjectIds.join(', ')}</strong></p>
          </div>
        `;
        this.panel.content.innerHTML = html;
        return;
      }
    }

    if (routingContext && routingContext.state && routingContext.state.phase !== 'idle') {
      const state = routingContext.state;
      const html = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Interactive Router</h3>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Active Tool</span>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Status: <strong style="color: #10b981;">Routing...</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Net ID: <strong>${state.activeNetId || 'No Net (Floating)'}</strong></p>

          ${state.warnings && state.warnings.length > 0 ? `
            <div style="margin-top: 12px; padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 4px;">
              <strong style="color: #ef4444; font-size: 12px;">Live DRC Warnings (${state.warnings.length}):</strong>
              <ul style="margin: 4px 0 0 0; padding-left: 16px; color: #fca5a5; font-size: 11px;">
                ${state.warnings.map((w: string) => `<li>${w}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="margin-top: 12px;">
            <label style="display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">Layer</label>
            <select id="router-layer-select" style="width: 100%; padding: 4px; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px;">
              <option value="F.Cu" ${state.currentLayer === 'F.Cu' ? 'selected' : ''}>F.Cu</option>
              <option value="B.Cu" ${state.currentLayer === 'B.Cu' ? 'selected' : ''}>B.Cu</option>
            </select>
          </div>

          <div style="margin-top: 12px;">
            <label style="display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">Width (um)</label>
            <input id="router-width-input" type="number" value="${state.currentWidth / 1000}" style="width: 100%; padding: 4px; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px;">
          </div>

          <div style="margin-top: 12px;">
            <label style="display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">Corner Mode</label>
            <select id="router-corner-select" style="width: 100%; padding: 4px; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px;">
              <option value="45" ${state.cornerMode === '45' ? 'selected' : ''}>45 Degree</option>
              <option value="90" ${state.cornerMode === '90' ? 'selected' : ''}>90 Degree</option>
              <option value="free" ${state.cornerMode === 'free' ? 'selected' : ''}>Any Angle</option>
            </select>
          </div>
        </div>
      `;
      this.panel.content.innerHTML = html;

      // Bind events
      const layerSelect = this.panel.content.querySelector('#router-layer-select') as HTMLSelectElement;
      if (layerSelect) {
        layerSelect.addEventListener('change', (e) => {
          routingContext.onChangeLayer((e.target as HTMLSelectElement).value);
        });
      }

      const widthInput = this.panel.content.querySelector('#router-width-input') as HTMLInputElement;
      if (widthInput) {
        widthInput.addEventListener('change', (e) => {
          routingContext.onChangeWidth(parseFloat((e.target as HTMLInputElement).value) * 1000);
        });
      }

      const cornerSelect = this.panel.content.querySelector('#router-corner-select') as HTMLSelectElement;
      if (cornerSelect) {
        cornerSelect.addEventListener('change', (e) => {
          routingContext.onChangeCornerMode((e.target as HTMLSelectElement).value as any);
        });
      }

      return;
    }

    if (this.selectedIds.length === 0) {
      this.renderer.render(this.panel.content, null, 0);
      return;
    }

    if (this.selectedIds.length > 1) {
      this.renderer.render(this.panel.content, null, this.selectedIds.length);
      return;
    }

    const compId = this.selectedIds[0];

    const label = getLabel(compId);
    if (label) {
      const graph = resolveHierarchy(objectEngine);
      const net = graph.getNetByPin(label.targetObjectId, label.targetPinId);
      const diags = validateSignals(objectEngine).filter((d: any) => d.affectedObjects.includes(label.id));

      const displayData = {
        isLabel: true,
        id: label.id,
        name: label.name,
        scope: label.scope,
        resolvedNetId: net ? net.id : 'None (Floating)',
        connectedCount: net ? net.pins.length : 0,
        connectedPins: net ? net.pins.map((p: any) => `${p.componentId}:${p.pinId}`) : [],
        diagnostics: diags.map((d: any) => `[${d.severity}] ${d.title}: ${d.description}`),
      };

      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    const signal = getSignal(compId);
    if (signal) {
      const graph = resolveHierarchy(objectEngine);
      let netId = 'None (Floating)';
      let connectedPins: string[] = [];
      if (signal.labels.length > 0) {
        const firstLabel = getLabel(signal.labels[0]);
        if (firstLabel) {
          const net = graph.getNetByPin(firstLabel.targetObjectId, firstLabel.targetPinId);
          if (net) {
            netId = net.id;
            connectedPins = net.pins.map((p: any) => `${p.componentId}:${p.pinId}`);
          }
        }
      }
      const diags = validateSignals(objectEngine).filter((d: any) => d.affectedObjects.includes(signal.name) || signal.labels.some((lId: string) => d.affectedObjects.includes(lId)));

      const displayData = {
        isSignal: true,
        name: signal.name,
        scope: signal.scope,
        resolvedNetId: netId,
        connectedCount: connectedPins.length,
        connectedPins,
        diagnostics: diags.map((d: any) => `[${d.severity}] ${d.title}: ${d.description}`),
      };

      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    const bus = getBus(compId);
    if (bus) {
      const busEntries = listBusEntries().filter((e: any) => e.busId === bus.id);
      const busTaps = listBusTaps().filter((t: any) => t.busId === bus.id);
      const displayData = {
        isBus: true,
        id: bus.id,
        name: bus.name,
        segmentsCount: bus.segments.length,
        entriesCount: busEntries.length,
        tapsCount: busTaps.length,
      };
      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    const conn = getConnector(compId);
    if (conn) {
      const displayData = {
        isConnector: true,
        id: conn.id,
        name: conn.name,
        scope: conn.scope,
        targetObjectId: conn.targetObjectId || 'None',
        targetPinId: conn.targetPinId || 'None',
      };
      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    const anno = getAnnotation(compId);
    if (anno) {
      const displayData = {
        isAnnotation: true,
        id: anno.id,
        kind: anno.kind,
        position: `${anno.position.x}, ${anno.position.y}`,
        text: (anno as any).text || (anno as any).htmlText || (anno as any).label || 'Shape',
      };
      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    const nc = getNetClass(compId);
    if (nc) {
      const displayData = {
        isNetClass: true,
        name: nc.name,
        width: nc.width,
        clearance: nc.clearance,
        color: nc.color,
        priority: nc.priority,
        netsCount: nc.nets.length,
        nets: nc.nets,
      };
      this.renderer.render(this.panel.content, displayData as any, 1);
      return;
    }

    let pcbObj: any = null;
    let pcbFp: any = null;
    let pcbBoard: any = null;

    if (boardManager) {
      const board = boardManager.getActiveBoard();
      if (board) {
        if (board.id === compId) {
          pcbBoard = board;
        } else {
          pcbFp = board.footprints.find((f: any) => f.id === compId);
          if (!pcbFp) {
            pcbObj = board.objects.find((o: any) => o.id === compId);
          }
        }
      }
    }

    if (pcbBoard) {
      const html = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${pcbBoard.name}</h3>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #6366f1; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Board Document</span>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Thickness: <strong>${pcbBoard.stackup.totalThicknessUm / 1000} mm</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Layers: <strong>${pcbBoard.layers.length}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Origin: <strong>(${pcbBoard.origin.x}, ${pcbBoard.origin.y})</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Units: <strong>${pcbBoard.unitSystem.primary}</strong></p>
        </div>
      `;
      this.panel.content.innerHTML = html;
      return;
    }

    if (pcbFp) {
      const html = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${pcbFp.reference}</h3>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #ec4899; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Footprint</span>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Value: <strong>${pcbFp.value}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Definition ID: <strong>${pcbFp.definitionId}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Position: <strong>(${pcbFp.transform.x}, ${pcbFp.transform.y})</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Rotation: <strong>${pcbFp.transform.rotation}°</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Layer: <strong>${pcbFp.layerId}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Locked: <strong>${pcbFp.locked ? 'Yes' : 'No'}</strong></p>
        </div>
      `;
      this.panel.content.innerHTML = html;
      return;
    }

    if (pcbObj) {
      let propertiesHtml = '';
      if (pcbObj.kind === 'pad') {
        const p = pcbObj;
        propertiesHtml = `
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Pad Number: <strong>${p.padNumber}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Shape: <strong>${p.padShape}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Type: <strong>${p.padType}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Size: <strong>${p.sizeX} x ${p.sizeY} nm</strong></p>
        `;
      } else if (pcbObj.kind === 'track') {
        const t = pcbObj;
        propertiesHtml = `
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Start: <strong>(${t.startX}, ${t.startY})</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">End: <strong>(${t.endX}, ${t.endY})</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Width: <strong>${t.width} nm</strong></p>
        `;
      } else if (pcbObj.kind === 'via') {
        const v = pcbObj;
        propertiesHtml = `
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Type: <strong>${v.viaType}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Diameter: <strong>${v.diameter} nm</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Drill: <strong>${v.drillDiameter} nm</strong></p>
        `;
      } else if (pcbObj.kind === 'zone') {
        const z = pcbObj;
        propertiesHtml = `
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Type: <strong>${z.zoneType}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Clearance: <strong>${z.clearance} nm</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Priority: <strong>${z.priority}</strong></p>
        `;
      }

      const html = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${pcbObj.kind.toUpperCase()}</h3>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #10b981; color: #ffffff; padding: 2px 8px; border-radius: 12px;">PCB Object</span>
        </div>
        <div style="margin-bottom: 16px;">
          ${propertiesHtml}
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Layer: <strong>${pcbObj.layerId}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Net ID: <strong>${pcbObj.netId || 'No Net'}</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">Locked: <strong>${pcbObj.locked ? 'Yes' : 'No'}</strong></p>
        </div>
      `;
      this.panel.content.innerHTML = html;
      return;
    }

    const obj = objectEngine.getObject(compId) as SemanticObject;
    if (!obj) {
      this.renderer.render(this.panel.content, null, 0);
      return;
    }

    const metadata = globalRegistry.getById(obj.type) || getLibraryMetadata(obj.type);
    const displayData = this.formatter.formatComponent(obj, metadata);

    this.renderer.render(this.panel.content, displayData, 1);
  }

  setSelection(selectedIds: string[]): void {
    this.selectedIds = [...selectedIds];
  }

  clear(): void {
    this.selectedIds = [];
    this.renderer.render(this.panel.content, null, 0);
  }
}
