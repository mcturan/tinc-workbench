import { ExplorerNode } from './types';

export class ExplorerRenderer {
  private activeId: string | null = null;
  private container: HTMLElement | null = null;
  private nodesMap: Map<string, HTMLElement> = new Map();

  render(
    container: HTMLElement,
    rootNode: ExplorerNode,
    onNodeClick: (id: string, type: string) => void,
    onNodeDblClick: (id: string, type: string) => void,
    onToggleExpand: (id: string, currentExpand: boolean) => void,
    onContextMenu?: (e: MouseEvent, id: string, type: string) => void,
    onDrop?: (sourceId: string, targetId: string) => void
  ): void {
    this.container = container;
    this.nodesMap.clear();
    container.innerHTML = '';

    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    container.style.color = '#cbd5e1';
    container.style.fontSize = '13px';
    container.style.overflowY = 'auto';
    container.style.height = '100%';
    container.style.padding = '8px';
    container.tabIndex = 0; // Make container focusable
    container.style.outline = 'none';

    if (!document.getElementById('tinc-explorer-styles')) {
      const style = document.createElement('style');
      style.id = 'tinc-explorer-styles';
      style.textContent = `
        @keyframes tinc-fade-in {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Keyboard navigation
    container.onkeydown = (e) => this.handleKeyDown(e, rootNode, onNodeClick, onNodeDblClick, onToggleExpand);

    if (rootNode.children && rootNode.children.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6272a4; text-align: center; padding: 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <div style="font-weight: 500; font-size: 14px; margin-bottom: 8px; color: #f8f8f2;">Empty Project</div>
          <div style="font-size: 12px; line-height: 1.5;">Create a schematic or board to get started.</div>
        </div>`;
      container.appendChild(emptyState);
    } else {
      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';
      ul.style.margin = '0';

      this.renderNode(ul, rootNode, 0, onNodeClick, onNodeDblClick, onToggleExpand, onContextMenu, onDrop);
      container.appendChild(ul);
    }
  }

  private handleKeyDown(
    e: KeyboardEvent,
    rootNode: ExplorerNode,
    onNodeClick: (id: string, type: string) => void,
    onNodeDblClick: (id: string, type: string) => void,
    onToggleExpand: (id: string, currentExpand: boolean) => void
  ) {
    const visibleNodes = this.getVisibleNodes(rootNode);
    if (visibleNodes.length === 0) return;

    let currentIndex = visibleNodes.findIndex(n => n.id === this.activeId);
    if (currentIndex === -1) currentIndex = 0;

    const current = visibleNodes[currentIndex];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < visibleNodes.length - 1) {
          this.setActiveNode(visibleNodes[currentIndex + 1].id, onNodeClick, visibleNodes[currentIndex + 1].type);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          this.setActiveNode(visibleNodes[currentIndex - 1].id, onNodeClick, visibleNodes[currentIndex - 1].type);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (current.children.length > 0) {
          if (!current.isExpanded) {
            onToggleExpand(current.id, false);
          } else if (currentIndex < visibleNodes.length - 1) {
            this.setActiveNode(visibleNodes[currentIndex + 1].id, onNodeClick, visibleNodes[currentIndex + 1].type);
          }
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (current.children.length > 0 && current.isExpanded) {
          onToggleExpand(current.id, true);
        } else if (current.parentId) {
          this.setActiveNode(current.parentId, onNodeClick, ''); // We don't have the parent type easily here, but click handles selection mostly
        }
        break;
      case 'Enter':
        e.preventDefault();
        onNodeDblClick(current.id, current.type);
        break;
    }
  }

  private setActiveNode(id: string, onNodeClick: (id: string, type: string) => void, type: string) {
    this.activeId = id;
    onNodeClick(id, type);
    const el = this.nodesMap.get(id);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  private getVisibleNodes(node: ExplorerNode, result: ExplorerNode[] = []): ExplorerNode[] {
    result.push(node);
    if (node.isExpanded) {
      for (const child of node.children) {
        this.getVisibleNodes(child, result);
      }
    }
    return result;
  }

  private renderNode(
    parentUl: HTMLUListElement,
    node: ExplorerNode,
    depth: number,
    onNodeClick: (id: string, type: string) => void,
    onNodeDblClick: (id: string, type: string) => void,
    onToggleExpand: (id: string, currentExpand: boolean) => void,
    onContextMenu?: (e: MouseEvent, id: string, type: string) => void,
    onDropCallback?: (sourceId: string, targetId: string) => void
  ): void {
    const li = document.createElement('li');
    li.style.margin = '2px 0';

    const row = document.createElement('div');
    row.className = 'explorer-row';
    row.setAttribute('data-node-id', node.id);
    row.setAttribute('data-node-type', node.type);
    row.title = `ID: ${node.id}`;

    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.padding = '4px 6px';
    row.style.paddingLeft = `${depth * 16 + 6}px`;
    row.style.borderRadius = '4px';
    row.style.cursor = 'pointer';
    row.style.userSelect = 'none';
    row.style.transition = 'background 0.15s ease';

    // Drag and Drop
    row.draggable = true;
    row.ondragstart = (e) => {
      e.dataTransfer?.setData('text/plain', node.id);
      row.style.opacity = '0.5';
    };
    row.ondragend = () => {
      row.style.opacity = '1';
    };
    row.ondragover = (e) => {
      e.preventDefault();
      row.style.background = 'rgba(59, 130, 246, 0.2)'; // drag over feedback
    };
    row.ondragleave = () => {
      row.style.background = node.isSelected ? '#3b82f6' : 'transparent';
    };
    row.ondrop = (e) => {
      e.preventDefault();
      row.style.background = node.isSelected ? '#3b82f6' : 'transparent';
      const sourceId = e.dataTransfer?.getData('text/plain');
      if (sourceId && sourceId !== node.id && onDropCallback) {
        onDropCallback(sourceId, node.id);
      }
    };

    if (node.isSelected) {
      row.style.background = '#3b82f6';
      row.style.color = '#ffffff';
      row.style.fontWeight = '500';
      this.activeId = node.id;
    } else {
      row.style.color = '#cbd5e1';
      row.style.background = 'transparent';
      row.onmouseenter = () => {
        if (!node.isSelected) row.style.background = 'rgba(51, 65, 85, 0.4)';
      };
      row.onmouseleave = () => {
        if (!node.isSelected) row.style.background = 'transparent';
      };
    }

    const toggleSpan = document.createElement('span');
    toggleSpan.style.display = 'inline-flex';
    toggleSpan.style.alignItems = 'center';
    toggleSpan.style.justifyContent = 'center';
    toggleSpan.style.width = '14px';
    toggleSpan.style.height = '14px';
    toggleSpan.style.marginRight = '6px';
    toggleSpan.style.cursor = 'pointer';

    const hasChildren = node.children.length > 0;
    if (hasChildren) {
      // Improved collapse/expand visual
      toggleSpan.innerHTML = node.isExpanded 
        ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
        : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      toggleSpan.style.color = node.isSelected ? '#ffffff' : '#94a3b8';
      toggleSpan.onclick = (e) => {
        e.stopPropagation();
        onToggleExpand(node.id, node.isExpanded);
      };
    } else {
      toggleSpan.innerText = '';
    }

    row.appendChild(toggleSpan);

    const iconSpan = document.createElement('span');
    iconSpan.innerText = node.icon;
    iconSpan.style.marginRight = '6px';
    iconSpan.style.fontSize = '14px';
    row.appendChild(iconSpan);

    const labelSpan = document.createElement('span');
    labelSpan.innerText = node.name;
    labelSpan.style.flex = '1';
    labelSpan.style.overflow = 'hidden';
    labelSpan.style.textOverflow = 'ellipsis';
    labelSpan.style.whiteSpace = 'nowrap';
    row.appendChild(labelSpan);

    if (node.badges && node.badges.length > 0) {
      const badgeContainer = document.createElement('span');
      badgeContainer.style.display = 'flex';
      badgeContainer.style.gap = '4px';
      badgeContainer.style.marginLeft = '8px';

      for (const badge of node.badges) {
        const badgeEl = document.createElement('span');
        badgeEl.style.width = '8px';
        badgeEl.style.height = '8px';
        badgeEl.style.borderRadius = '50%';
        badgeEl.title = badge;
        
        switch (badge) {
          case 'error': badgeEl.style.background = '#ef4444'; break;
          case 'warning': badgeEl.style.background = '#f59e0b'; break;
          case 'connected': badgeEl.style.background = '#10b981'; break;
          case 'modified': badgeEl.style.background = '#3b82f6'; break;
          case 'running': badgeEl.style.background = '#8b5cf6'; break;
        }
        badgeContainer.appendChild(badgeEl);
      }
      row.appendChild(badgeContainer);
    }

    row.onclick = () => {
      this.container?.focus();
      onNodeClick(node.id, node.type);
    };

    row.ondblclick = () => {
      onNodeDblClick(node.id, node.type);
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      onNodeClick(node.id, node.type);
      if (onContextMenu) {
        onContextMenu(e, node.id, node.type);
      }
    };

    this.nodesMap.set(node.id, row);
    li.appendChild(row);
    parentUl.appendChild(li);

    if (hasChildren && node.isExpanded) {
      const childUl = document.createElement('ul');
      childUl.style.listStyle = 'none';
      childUl.style.padding = '0';
      childUl.style.margin = '0';
      
      // Simple collapse animation container
      childUl.style.animation = 'tinc-fade-in 0.15s ease-out forwards';
      
      li.appendChild(childUl);

      for (const child of node.children) {
        this.renderNode(childUl, child, depth + 1, onNodeClick, onNodeDblClick, onToggleExpand, onContextMenu, onDropCallback);
      }
    }
  }
}
