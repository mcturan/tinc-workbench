export interface ExplorerNode {
  id: string;
  name: string;
  type:
    | 'project'
    | 'logical-folder'
    | 'sheet'
    | 'component'
    | 'wire'
    | 'net-label'
    | 'global-signal'
    | 'category-folder'
    | 'bus'
    | 'annotation'
    | 'connector'
    | 'net-class'
    | 'board'
    | 'layer'
    | 'footprint'
    | 'zone'
    | 'track'
    | 'via'
    | 'device-workspace'
    | 'inventory-item'
    | 'document';
  icon: string;
  parentId: string | null;
  children: ExplorerNode[];
  isExpanded: boolean;
  isSelected: boolean;
  badges?: ('warning' | 'error' | 'connected' | 'modified' | 'running')[];
}
