# TINC Workbench

Engineering without boundaries. An open-source, plugin-first engineering workspace built around an infinite canvas.

TINC exists to help people transform an electronic idea into a real physical product. Not just a schematic. Not just a PCB. A real manufacturable object.

## Current Status
TINC Workbench is currently in **Internal Alpha**. The core architecture (Entity-Component System, Infinite Canvas, Design System) is stable, and active migration is underway to unify the UI components into the TINC Visual Component Standard (TVCS).

## Current Roadmap
- **Design System Migration**: Unifying all UI elements into a consistent design language.
- **Component Discovery**: Overhauling how users find and instantiate components via a scalable library architecture.
- **Pro-Schematic Enhancements**: Maturing schematic routing and electrical rules checking.
- **PCB Workflow Preparation**: Establishing constraints and board design precursors.

## Architecture Overview
TINC utilizes a modular, plugin-oriented architecture to maintain flexibility:
- **Core State**: Managed via an Entity-Component System (ECS) pattern within the `ObjectEngine`.
- **Rendering Engine**: Responsible for visualizing the infinite canvas and interactive elements in standard layers (background, schematic, overlays).
- **Command Engine**: Centralized interaction and mutation handling with built-in undo/redo support.
- **Component Library**: Scalable component metadata, symbol, footprint, and datasheet management.

## Folder Structure
- `src/`: Core application source code.
  - `ai/`: Intent-based AI assistant interfaces and workflows.
  - `canvas-engine/`: Rendering loop, pan/zoom behavior.
  - `command-engine/`: Reversible actions and global dispatch.
  - `component-library/`: Component models and metadata registry.
  - `pro-schematic/`: Hardware design logic (routing, nets, junction handling).
  - `ui/`: Standardized interface components mapping to the design system.
- `docs/`: Product philosophies, architecture audits, and design specifications.
- `scripts/`: Development and maintenance utilities.
- `tests/`: Extensive unit and integration tests (JSDOM/Node).

## Development Setup

### Build
To check types and compile the project, run:
```bash
npm run typecheck
npm run build
```

### Run
To launch the local development server (Vite):
```bash
npm run dev
```

### Test
We rely heavily on unit and integration testing via Jest:
```bash
npm test -- --run
```
To run tests in watch mode:
```bash
npm run test:watch
```

## Documentation
For deeper context into our design and engineering decisions, please read:
- [Product Philosophy](docs/PRODUCT_PHILOSOPHY.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [TVCS (Visual Component Standard)](docs/TVCS.md)
