/**
 * Physical Design Platform — Persistence Extension
 * PART 11: Persist all physical structures, maintain backward compatibility
 */

import {
  BoardDocument,
  PhysicalDesignSnapshot,
} from './types';
import { BoardManager } from './board';

// ── Physical Design Serializer ────────────────────────────────────────────────

export class PhysicalDesignSerializer {
  serialize(board: BoardDocument): string {
    const snapshot: PhysicalDesignSnapshot = {
      version: '1.0',
      boardDocument: board,
    };
    return JSON.stringify(snapshot, null, 2);
  }

  deserialize(content: string): BoardDocument {
    const parsed = JSON.parse(content) as PhysicalDesignSnapshot;
    if (!parsed.version || !parsed.boardDocument) {
      throw new Error('Invalid PhysicalDesignSnapshot: missing version or boardDocument');
    }
    if (parsed.version !== '1.0') {
      throw new Error(`Unsupported snapshot version: ${parsed.version}`);
    }
    return parsed.boardDocument;
  }

  validate(content: string): { valid: boolean; error?: string } {
    try {
      const parsed = JSON.parse(content);
      if (!parsed.version) return { valid: false, error: 'Missing version field' };
      if (!parsed.boardDocument) return { valid: false, error: 'Missing boardDocument field' };
      if (!parsed.boardDocument.id) return { valid: false, error: 'Missing boardDocument.id' };
      if (!parsed.boardDocument.uuid) return { valid: false, error: 'Missing boardDocument.uuid' };
      if (!Array.isArray(parsed.boardDocument.layers)) return { valid: false, error: 'layers must be an array' };
      if (!Array.isArray(parsed.boardDocument.objects)) return { valid: false, error: 'objects must be an array' };
      return { valid: true };
    } catch (e: unknown) {
      return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

// ── Persistence Manager Extension ─────────────────────────────────────────────

/**
 * PhysicalDesignPersistenceManager integrates with the existing PersistenceStorage
 * interface and extends the project file format with physical design data.
 * Backward compatible: if no physicalDesign key exists, returns null.
 */
export class PhysicalDesignPersistenceManager {
  private serializer = new PhysicalDesignSerializer();
  private readonly storageKey = 'tinc_physical_design';

  constructor(
    private boardManager: BoardManager,
    private storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
  ) {}

  /** Save the active board to storage */
  save(boardId?: string): string | null {
    const board = boardId
      ? this.boardManager.getBoard(boardId)
      : this.boardManager.getActiveBoard();
    if (!board) return null;
    const content = this.serializer.serialize(board);
    this.storage.setItem(this.storageKey, content);
    return content;
  }

  /** Load board from storage */
  load(): BoardDocument | null {
    const content = this.storage.getItem(this.storageKey);
    if (!content) return null;
    const validation = this.serializer.validate(content);
    if (!validation.valid) return null;
    const board = this.serializer.deserialize(content);
    // Register board in manager
    this.boardManager['boards'].set(board.id, board);
    if (!this.boardManager.getActiveBoard()) {
      this.boardManager.setActiveBoard(board.id);
    }
    return board;
  }

  /** Export a board as a standalone JSON file (content string) */
  export(boardId: string): string {
    const board = this.boardManager.getBoard(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    return this.serializer.serialize(board);
  }

  /** Import a board from a JSON string */
  import(content: string): BoardDocument {
    const board = this.serializer.deserialize(content);
    this.boardManager['boards'].set(board.id, board);
    return board;
  }

  validate(content: string): { valid: boolean; error?: string } {
    return this.serializer.validate(content);
  }

  /** Embed physical design data into an existing project file format JSON */
  embedInProjectFile(projectJson: string, boardId: string): string {
    const board = this.boardManager.getBoard(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    const project = JSON.parse(projectJson);
    project.physicalDesign = {
      version: '1.0',
      boardDocument: board,
    };
    return JSON.stringify(project, null, 2);
  }

  /** Extract physical design data from a project file */
  extractFromProjectFile(projectJson: string): BoardDocument | null {
    const project = JSON.parse(projectJson);
    if (!project.physicalDesign) return null;
    const snapshot = project.physicalDesign as PhysicalDesignSnapshot;
    return snapshot.boardDocument;
  }
}
