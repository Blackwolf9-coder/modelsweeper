# ModelSweeper

ModelSweeper is a desktop control center for AI model workflows.  
It helps teams and solo builders manage model presets, monitor memory feasibility, compare hardware requirements, and push configuration changes to external tools from one place.

## Why ModelSweeper

Modern AI workflows usually involve multiple model roles, multiple tools, and constant hardware tradeoffs.  
ModelSweeper provides a unified layer to:

- Manage **role-based presets** (`thinker`, `coder`, `reviewer`, custom slots)
- Evaluate **live RAM feasibility** before switching workloads
- Explore local model inventory and tool capability status
- Use a clean **Hardware Calculator** for VRAM / RAM planning
- Apply generated config payloads to supported integrations

## Core Features

- **Dashboard**
  - Live system memory snapshot
  - Active preset load estimate
  - Quick feasibility signal (safe / tight / exceeds)

- **Models**
  - Fetch local models via provider endpoint
  - Search, sort, and filter by tool support
  - Assign models directly to preset roles (Coder / Thinker / Reviewer)
  - Convert eligible models to tools-capable variants

- **Preset Builder**
  - Build and edit workflow presets
  - Switch between simultaneous vs sequential execution modes
  - Add custom role slots

- **Hardware Calculator**
  - Estimate required VRAM
  - Estimate on-disk model size
  - Estimate minimum system RAM
  - Compare discrete GPU vs unified memory fit

- **Integrations**
  - Generate/apply config payloads for supported clients
  - Keep active preset context synchronized across tooling

## Tech Stack

- Electron
- React + TypeScript
- Vite
- Zustand
- Tailwind CSS

## Project Structure

```text
electron/            # Electron main/preload and system IPC
src/
  components/        # Shared UI components
  lib/               # Calculation and utility modules
  pages/             # Route-level views (Dashboard, Models, etc.)
  store/             # Zustand state stores
```

## Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Type-check

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Package desktop app

```bash
npm run dist
```

## Notes

- Calculations are estimation-oriented and intended for planning, not strict benchmarking.
- Hardware results vary by runtime backend, quantization implementation, and batch behavior.

## License

MIT
