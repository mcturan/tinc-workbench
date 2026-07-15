# UX Gate 01 Execution Program

## 1. Product Hypothesis
TINC's clean separation of visual Wire geometry from logical nets enables a 10x faster diagramming experience than general-purpose tools, and a significantly lower setup friction than professional CAD systems. By automating wire routing and port/pin snapped targeting, a user can place, wire, and move objects dynamically in under 60 seconds with zero layout repairs.

## 2. UX Gate 01 Contract
A first-time technical user must successfully complete the validation scenario within 60 seconds and under a strict gesture budget.

### Target Validation Scenario:
Create a system with:
- **12V Power Supply** (PSU)
- **Relay Module**
- **Lamp**
- **ESP32**

### Target Wiring Connections:
- 12V PSU V+ -> Relay COM
- Relay NO -> Lamp +
- Lamp - -> 12V PSU V-
- ESP32 GPIO23 -> Relay IN1

### Validation Constraints:
- Zero setup wizard.
- Zero project creation modal.
- Zero manual wire vertex editing.
- Zero required internal architecture terminology.

---

## 3. 60-Second Timeline
* **T <= 5s**: Application is fully launched and the first component (ESP32) is placed on the canvas.
* **T <= 15s**: All four components are placed on the canvas.
* **T <= 25s**: The first wiring connection (ESP32 -> Relay) is completed.
* **T <= 50s**: All four wiring connections are completed.
* **T <= 55s**: One component is moved; all wires route automatically.
* **T <= 60s**: The user explains the system connectivity, and the validation completes.

---

## 4. 9-Main-Gesture Budget
The user must complete the physical layout tasks using exactly 9 discrete gestures:
1. **Summon/Place 12V PSU** (1 gesture: Drag/Drop or Summon + Click)
2. **Summon/Place Relay Module** (1 gesture)
3. **Summon/Place Lamp** (1 gesture)
4. **Summon/Place ESP32** (1 gesture)
5. **Wire ESP32 -> Relay** (1 gesture: Drag-line from Pin to Pin)
6. **Wire PSU -> Relay** (1 gesture)
7. **Wire Relay -> Lamp** (1 gesture)
8. **Wire Lamp -> PSU** (1 gesture)
9. **Move component** (1 gesture: Click-drag selected component)

---

## 5. Three-Batch Execution Plan

### UX Batch 01 — See Something
* **Objective**: Get a blank canvas to render instantly and place a component via quick summon.
* **Tasks**: UX-001, UX-002, UX-003, UX-004.
* **Exit Condition**: Running one command opens a canvas, and typing `ESP32` summons a component instantly.

### UX Batch 02 — Touch Something
* **Objective**: Select, drag, and target ports/pins.
* **Tasks**: UX-005, UX-006, UX-007, UX-008.
* **Exit Condition**: Components can be selected, dragged directly, and display visual feedback on ports/pins.

### UX Batch 03 — Connect Something
* **Objective**: Draw Manhattan wires, commit connections, recompute wires on move, and run the test harness.
* **Tasks**: UX-009, UX-010, UX-011, UX-012.
* **Exit Condition**: Complete system can be wired, moved, and validated in under 60 seconds.

---

## 6. UX-001 through UX-012 Dependency Graph
- **UX-001** (Geometry) -> No dependencies.
- **UX-002** (Rendering) -> UX-001.
- **UX-003** (Viewport) -> UX-002.
- **UX-004** (Summon) -> UX-002.
- **UX-005** (Pointer) -> UX-003.
- **UX-006** (Selection) -> UX-001.
- **UX-007** (Direct Drag) -> UX-005, UX-006.
- **UX-008** (Port Snap) -> UX-001, UX-005.
- **UX-009** (Manhattan Preview) -> UX-001, UX-008.
- **UX-010** (Connection Commit) -> UX-009.
- **UX-011** (Move Preservation) -> UX-007, UX-010.
- **UX-012** (Validation Harness) -> UX-004, UX-011.

---

## 7. SAFE INTERIM Registry
1. **O(N) Geometry Candidates**: Query component bounds linearly; defer Quadtree spatial optimization.
2. **Manhattan Routing**: Line routes source -> X -> Y. Defer A* pathfinding obstacles.
3. **Array-backed Selection**: Maintain a simple list of selected IDs; defer bounds caching.
4. **No Persistence**: Storage Engine saving/loading is completely bypassed during in-memory interactive editing.

---

## 8. Deferred Production Systems
- **Task 009/010**: TWH History Sidecar & Coexistence Matrix.
- **Task 012/013**: Spatial Quadtree and Geometry Cache system.
- **Task 015**: Selection Bounds Cache.
- **Task 022**: Connection Pathfinder A*.
- **Task 026-029**: Plugin Sandbox, Permissions, Scoped storage, and SDK Facade.

---

## 9. Architecture Boundary Rules
- **Pure Domain Math**: All coordinate transforms and AABB hit testing must belong solely to `GeometryEngine`.
- **Pure Rendering**: The canvas DOM element is drawn to only by `RenderingEngine` and viewport calculations.
- **Mutation Isolation**: Wires must be created and moved via the `CommandEngine` mutation path.

---

## 10. Stop/Kill Criteria
The UX Gate validation fails, and the track is aborted, if:
- Placed component is not rendered within 5 seconds.
- Placing 4 components requires category menus, sidebar scrolling, or modal confirmation dialogs.
- Creating a connection requires manually clicking a wire-tool toolbar button (it should be modeless).
- Port/Pin targeting is visually ambiguous or requires pixel-perfect clicking.
- Moving a component breaks the logical netlist relationship.
- Moving a component leaves wire segments disconnected, requiring manual repair.
- The workflow requires more than 9 main gestures.
- The user is required to interact with, see, or configure architecture concepts (`LogicalConnection`, `Wire`, `Endpoints`, etc.).
- Safe interim code leaks into persistent schema files.

---

## 11. Measurement Methodology
UX-012 provides a test harness that logs timestamps and gesture counts for:
- Component Placements (UX-004)
- Port snappings and Wire creations (UX-008/UX-010)
- Moves (UX-007)

---

## 12. Human Validation Procedure
1. Launch TINC via documented command (`npm run start:harness`).
2. Timed run begins on first keystroke/summon.
3. User types `/`, types `ESP32`, clicks canvas. (ESP32 placed).
4. User places Relay Module, Lamp, 12V Power Supply.
5. User draws the four connections.
6. User drags ESP32 to a new location.
7. Verification checks:
   - Wires correctly routed? (Yes)
   - Connection identities preserved? (Yes)
   - Timed duration <= 60 seconds? (Yes)
   - Gesture count exactly 9? (Yes)
8. **Verdict Assignment**: Final UX Gate status remains `UNVALIDATED` until a human manually performs and signs off on the timed test.

---

## 13. Production-Roadmap Reintegration Rules
- Post-validation, the Manhattan router inside the routing interface will be replaced by the A* Pathfinder (Task 022).
- The O(N) list-search query inside Geometry Engine will be replaced by the Quadtree index (Task 012).
- Security, permissions, and storage persistence will be integrated using the defined interfaces.
