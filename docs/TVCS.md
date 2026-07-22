# TINC Visual Component Standard (TVCS)

## Overview
The **TINC Visual Component Standard (TVCS)** defines how every native component is represented across the Schematic, Physical Workspace, Library, Search, and future Mechanical workspaces. 

Consistent identity ensures that the interface remains "invisible." Users must instantly recognize parts without decoding abstract symbols. TINC prioritizes **"Physical First"**—what you see should closely resemble the real, physical object you will eventually assemble.

---

## 1. Visual Language by Component Family

The following outlines the visual language for all component families.

### Microcontrollers
- **Top View:** Photorealistic top-down vector representation of the physical PCB/chip (e.g., green/black soldermask, metallic RF shields).
- **Physical Scale:** 1:1 real-world dimensions.
- **Pin Style:** Gold or silver pads/headers located exactly where they exist on the physical board.
- **Label Rules:** High-contrast silkscreen typography (white/yellow) matching the physical board.
- **Color Rules:** Dark solder mask (black/dark green), metallic traces.

### Power Supplies
- **Top View:** Rectangular blocks with distinct heat sink fins or large capacitors visible.
- **Physical Scale:** 1:1 real-world footprint including mounting holes.
- **Pin Style:** Heavy-duty screw terminals (green/black) or barrel jacks.
- **Label Rules:** Bold input/output voltage labels (`VIN`, `GND`, `5V`, `12V`).
- **Color Rules:** Industrial green or metallic silver.

### ICs
- **Top View:** Black epoxy mold body with silver/tin leads.
- **Physical Scale:** Exact JEDEC standard dimensions (DIP, SOIC, QFN).
- **Pin Style:** Extruding metallic pins.
- **Label Rules:** Laser-etched grey typography on the black body (Manufacturer logo + Part number). Pin 1 indicated by a physical dimple.
- **Color Rules:** Matte black body, silver pins.

### Passives
- **Top View:** 0402, 0603, 0805, 1206 chip bodies, or through-hole axial cylinders.
- **Physical Scale:** Exact metric/imperial dimensions.
- **Pin Style:** Silver end-caps or through-hole wire leads.
- **Label Rules:** Micro-printed value codes (e.g., `103`, `4R7`) if applicable.
- **Color Rules:** Ceramic tan/brown for caps, black for resistors, polarized bands for diodes/electrolytics.

### Displays
- **Top View:** Glass screen area with physical bezel and flex cable/header outline.
- **Physical Scale:** Exact active area and module dimensions.
- **Pin Style:** Flex ribbon pins or 0.1" headers.
- **Label Rules:** Resolution and display type printed on the back/bezel.
- **Color Rules:** Deep grey/black screen area (simulating powered-off LCD/OLED), colored bezel (e.g., blue for standard 16x2 LCDs).

### Connectors
- **Top View:** Plastic housing with internal metallic contacts.
- **Physical Scale:** 1:1 physical footprint (JST, Molex, USB, RJ45).
- **Pin Style:** Internal sockets or exposed header pins.
- **Label Rules:** Pin numbering on the plastic housing.
- **Color Rules:** White/cream (JST), black (headers), metallic shield (USB/RJ45).

### Relays
- **Top View:** Box-shaped plastic housing.
- **Physical Scale:** 1:1 physical dimensions.
- **Pin Style:** Large solder lugs or through-hole pins.
- **Label Rules:** Coil voltage, max AC/DC current ratings printed on top.
- **Color Rules:** Usually blue, black, or orange plastic bodies.

### Sensors
- **Top View:** Sensor-specific (e.g., metal can for ultrasonic, dome for PIR, small glass window for light).
- **Physical Scale:** 1:1 module or raw sensor dimensions.
- **Pin Style:** 0.1" headers or SMD pads.
- **Label Rules:** Sensor type/identifier silkscreen.
- **Color Rules:** Module-specific (e.g., blue/red/black PCBs).

### Motors
- **Top View:** Metallic cylinder or stepper cube.
- **Physical Scale:** 1:1 physical casing and shaft dimensions.
- **Pin Style:** Wire leads or JST connectors.
- **Label Rules:** Motor specifications (e.g., `NEMA 17`, `5V DC`).
- **Color Rules:** Brushed metal, brass shafts, black end-caps.

### Audio
- **Top View:** Speaker cone or buzzer cylinder.
- **Physical Scale:** 1:1 physical diameter and depth.
- **Pin Style:** Solder tabs or wire leads.
- **Label Rules:** Impedance and wattage (`8Ω 1W`).
- **Color Rules:** Black cone, metallic housing.

### Mechanical
- **Top View:** Switches, buttons, encoders, standoffs.
- **Physical Scale:** 1:1 physical dimensions.
- **Pin Style:** Snap-in terminals, through-hole legs.
- **Label Rules:** None, or minimal (e.g., `NO/NC/COM`).
- **Color Rules:** Colored actuators (red/black caps), metallic bodies.

### RF
- **Top View:** Metallic shielding cans, ceramic antennas, or SMA connectors.
- **Physical Scale:** 1:1 real-world dimensions.
- **Pin Style:** SMD pads, U.FL/SMA connectors.
- **Label Rules:** FCC ID, logo, and frequency band (`2.4GHz`, `LoRa`).
- **Color Rules:** Silver shielding, gold-plated connectors, green/blue PCB.

---

## 2. Common Rendering Styles

Regardless of the family, every TVCS component must adhere to these interaction state standards:

- **Connector Style:** Hubs must map identically to the real physical pins.
- **Selection Style:**
  - 2px `var(--accent)` (e.g., `#bd93f9`) solid border or bounding stroke around the physical boundary.
  - No abstract rectangular bounding boxes if the object is circular.
- **Hover Style:**
  - 1px `var(--success)` (e.g., `#50fa7b`) glowing outline.
  - Cursor changes to `grab`.
- **Status Overlay:**
  - Small circular badges anchored to the top-right corner.
- **Powered Overlay:**
  - Subtle glowing aura (`rgba(80, 250, 123, 0.4)`) around power pins or physical LEDs on the board.
- **Fault Overlay:**
  - Red pulsing aura (`rgba(255, 85, 85, 0.6)`) over the component.
  - Exclamation badge with tooltip detailing the ERC failure (e.g., overvoltage).

---

## 3. Iconography Rules

- **Rule 1:** The icon MUST match the physical object. 
- **Rule 2:** Avoid abstract symbols. (e.g., Do not use a zigzag line for a resistor; use the physical resistor body).
- **Rule 3:** The library icon is simply a scaled-down rendering of the "Top View" asset.

---

## 4. Naming Conventions

The naming system must remain consistent to support thousands of components seamlessly. The convention is:
`[Series/Family] [Variant/Specific Part] [Package/Identifier]`

**Examples:**
- `ESP32 DevKit`
- `ESP32-S3 DevKit`
- `Arduino Uno R3`
- `LM2596 Buck Converter Module`
- `10kΩ 0805 Resistor`
- `SSD1306 0.96" OLED I2C`

No cryptic part numbers as the primary name unless the part is a raw IC (e.g., `NE555P`).

---

## 5. Metadata Model

Every component must ship with a standardized JSON-compatible metadata payload.

```typescript
interface TVCSMetadata {
  manufacturer: string;       // e.g., 'Espressif Systems'
  series: string;             // e.g., 'ESP32'
  family: string;             // e.g., 'Microcontroller'
  variant: string;            // e.g., 'ESP32-S3-WROOM-1'
  tags: string[];             // e.g., ['WiFi', 'BLE', 'MCU', 'Dual Core']
  
  package: string;            // e.g., 'Module' or 'QFN-56'
  footprint: string;          // Maps to standard footprint library ID
  physicalDimensions: {
    widthMm: number;
    lengthMm: number;
    heightMm: number;
  };
  
  datasheetUrl?: string;      // Direct link to PDF
  
  electrical: {
    operatingVoltageMin: number;
    operatingVoltageMax: number;
    logicVoltage: number;
  };
  
  interfaces: string[];       // e.g., ['I2C', 'SPI', 'UART']
  protocols: string[];        // e.g., ['802.11 b/g/n', 'Bluetooth 5.0']
  
  categoryPath: string[];     // e.g., ['Microcontrollers', 'Espressif', 'ESP32']
}
```

---

## 6. Future Compatibility (3D Architecture)

To prepare for future mechanical integration and 3D visualization, the data model incorporates 3D metadata placeholders without requiring immediate implementation.

Every TVCS object will maintain an optional `mechanical` node:

```typescript
interface MechanicalMetadata {
  modelType: 'STEP' | 'STL' | 'OBJ';
  modelUri: string;           // Path or UUID to the asset in the vault
  mountPoints: {
    x: number; 
    y: number; 
    diameter: number; 
    type: 'M2' | 'M3' | 'Snap'
  }[];
  keepoutZones: {
    x: number;
    y: number;
    width: number;
    length: number;
    height: number;
  }[];
  zOffset: number;            // Distance from PCB surface to component bottom
}
```

This ensures that adding 3D support later only requires loading the `modelUri` and rendering it over the 2D bounding box, keeping the core TINC architecture unmodified.
