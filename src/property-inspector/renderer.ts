import { ComponentDisplayData } from './types';

export class PropertyRenderer {
  render(container: HTMLElement, data: ComponentDisplayData | null, selectedCount: number): void {
    container.innerHTML = '';

    // Apply basic premium layout container styles
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    container.style.color = '#e2e8f0';
    container.style.padding = '16px';

    if (selectedCount === 0) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6272a4; text-align: center; padding: 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style="font-weight: 500; font-size: 14px; margin-bottom: 8px; color: #f8f8f2;">No Selection</div>
          <div style="font-size: 12px; line-height: 1.5;">Select a component on the canvas to inspect its properties.</div>
        </div>`;
      return;
    }

    if (selectedCount > 1) {
      container.innerHTML = `<div class="multi-state" style="color: #94a3b8; font-weight: 500; text-align: center; padding: 20px;">${selectedCount} objects selected.</div>`;
      return;
    }

    if (!data) {
      container.innerHTML = `<div class="error-state" style="color: #f87171; text-align: center; padding: 20px;">Error loading component data.</div>`;
      return;
    }

    if ((data as any).isBus || (data as any).isConnector || (data as any).isAnnotation || (data as any).isNetClass) {
      let html = '';
      if ((data as any).isBus) {
        html = `
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${this.escapeHtml(data.name)}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #8b5cf6; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Bus</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">ID: <strong>${(data as any).id}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Segments count: <strong>${(data as any).segmentsCount}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Entries count: <strong>${(data as any).entriesCount}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Taps count: <strong>${(data as any).tapsCount}</strong></p>
          </div>
        `;
      } else if ((data as any).isConnector) {
        html = `
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${this.escapeHtml(data.name)}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #ec4899; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Connector</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">ID: <strong>${(data as any).id}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Scope: <strong>${(data as any).scope}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Target Object: <strong>${(data as any).targetObjectId}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Target Pin: <strong>${(data as any).targetPinId}</strong></p>
          </div>
        `;
      } else if ((data as any).isAnnotation) {
        html = `
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${(data as any).kind}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #f59e0b; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Annotation</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">ID: <strong>${(data as any).id}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Position: <strong>${(data as any).position}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Content: <strong>${this.escapeHtml((data as any).text)}</strong></p>
          </div>
        `;
      } else if ((data as any).isNetClass) {
        html = `
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${this.escapeHtml(data.name)}</h3>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 12px;">Net Class</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Width: <strong>${(data as any).width} mm</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Clearance: <strong>${(data as any).clearance} mm</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Color: <strong style="color: ${(data as any).color}">${(data as any).color}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Priority: <strong>${(data as any).priority}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Assigned Nets Count: <strong>${(data as any).netsCount}</strong></p>
          </div>
        `;
      }
      container.innerHTML = html;
      return;
    }

    if ((data as any).isLabel || (data as any).isSignal) {
      const typeLabel = (data as any).isLabel ? 'Net Label' : 'Named Signal';
      let html = `
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${this.escapeHtml(data.name)}</h3>
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #10b981; color: #ffffff; padding: 2px 8px; border-radius: 12px;">${typeLabel}</span>
          </div>
          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Scope: <strong>${(data as any).scope}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Resolved Net: <strong>${(data as any).resolvedNetId}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Connected Pin Count: <strong>${(data as any).connectedCount}</strong></p>
        </div>
      `;

      if ((data as any).connectedPins && (data as any).connectedPins.length > 0) {
        html += `
          <div style="margin-bottom: 24px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Connected Pins</h4>
            <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
        `;
        for (const pin of (data as any).connectedPins) {
          html += `<li>${this.escapeHtml(pin)}</li>`;
        }
        html += `
            </ul>
          </div>
        `;
      }

      if ((data as any).diagnostics && (data as any).diagnostics.length > 0) {
        html += `<div style="margin-bottom: 24px;">`;
        html += `<h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #ef4444;">Diagnostics</h4>`;
        for (const diag of (data as any).diagnostics) {
          html += `
            <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 12px; border-radius: 0 4px 4px 0; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #fca5a5; line-height: 1.4;">${this.escapeHtml(diag)}</span>
            </div>
          `;
        }
        html += `</div>`;
      } else {
        html += `
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 12px; border-radius: 0 4px 4px 0; margin-bottom: 8px;">
            <span style="font-size: 12px; color: #a7f3d0; line-height: 1.4;">✓ No diagnostic violations.</span>
          </div>
        `;
      }

      container.innerHTML = html;
      return;
    }

    // Build single component inspector view
    const generalHtml = `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${this.escapeHtml(data.name)}</h3>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 12px;">${this.escapeHtml(data.category)}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${this.escapeHtml(data.description)}</p>
      </div>
    `;

    // Pins
    let pinsHtml = `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Pins</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
                <th style="padding: 6px 8px;">Name</th>
                <th style="padding: 6px 8px;">Aliases</th>
                <th style="padding: 6px 8px;">Type</th>
                <th style="padding: 6px 8px;">Direction</th>
                <th style="padding: 6px 8px;">Domain</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const pin of data.pins) {
      const aliasText = pin.aliases.length > 0 ? pin.aliases.join(', ') : '-';
      pinsHtml += `
        <tr style="border-bottom: 1px solid #1e293b; color: #cbd5e1;">
          <td style="padding: 6px 8px; font-weight: 500; color: #ffffff;">${this.escapeHtml(pin.name)}</td>
          <td style="padding: 6px 8px; color: #94a3b8;">${this.escapeHtml(aliasText)}</td>
          <td style="padding: 6px 8px;">${this.escapeHtml(pin.electricalType)}</td>
          <td style="padding: 6px 8px;">${this.escapeHtml(pin.direction)}</td>
          <td style="padding: 6px 8px; color: #3b82f6;">${this.escapeHtml(pin.voltageDomain || '3.3V')}</td>
        </tr>
      `;
    }

    pinsHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Knowledge (Notes, Warnings, Applications, Tags)
    let knowledgeHtml = `<div>`;

    if (data.notes && data.notes.length > 0) {
      knowledgeHtml += `
        <div style="margin-bottom: 16px; background: rgba(30, 41, 59, 0.5); border-left: 3px solid #3b82f6; padding: 10px 12px; border-radius: 0 4px 4px 0;">
          <strong style="display: block; font-size: 12px; color: #3b82f6; margin-bottom: 4px;">Notes</strong>
          <span style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">${data.notes.map(n => this.escapeHtml(n)).join('<br/>')}</span>
        </div>
      `;
    }

    if (data.warnings && data.warnings.length > 0) {
      knowledgeHtml += `<div style="margin-bottom: 16px;">`;
      for (const w of data.warnings) {
        knowledgeHtml += `
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 12px; border-radius: 0 4px 4px 0; margin-bottom: 8px;">
            <strong style="display: block; font-size: 12px; color: #ef4444; margin-bottom: 4px;">Warning</strong>
            <span style="font-size: 12px; color: #fca5a5; line-height: 1.4;">${this.escapeHtml(w)}</span>
          </div>
        `;
      }
      knowledgeHtml += `</div>`;
    }

    if (data.applications && data.applications.length > 0) {
      knowledgeHtml += `
        <div style="margin-bottom: 16px;">
          <h5 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #94a3b8;">Common Applications</h5>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
      `;
      for (const app of data.applications) {
        knowledgeHtml += `<li>${this.escapeHtml(app)}</li>`;
      }
      knowledgeHtml += `
          </ul>
        </div>
      `;
    }

    if (data.tags && data.tags.length > 0) {
      knowledgeHtml += `
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px;">
      `;
      for (const tag of data.tags) {
        knowledgeHtml += `
          <span style="font-size: 11px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 2px 8px; border-radius: 4px;">#${this.escapeHtml(tag)}</span>
        `;
      }
      knowledgeHtml += `</div>`;
    }

    knowledgeHtml += `</div>`;

    container.innerHTML = generalHtml + pinsHtml + knowledgeHtml;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
