# ModelSweeper
[![CI](https://github.com/Blackwolf9-coder/modelsweeper/actions/workflows/ci.yml/badge.svg)](https://github.com/Blackwolf9-coder/modelsweeper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Issues](https://img.shields.io/github/issues/Blackwolf9-coder/modelsweeper)](https://github.com/Blackwolf9-coder/modelsweeper/issues)

ModelSweeper is a desktop control center for AI model operations across local and cloud workflows.
It helps you orchestrate role-based model presets, evaluate memory fit before execution, and synchronize settings into external clients from one unified interface.

## Highlights
- Role-based presets for `Thinker`, `Coder`, `Reviewer`, plus custom slots
- One-click role assignment directly from the model catalog
- Live memory feasibility checks based on current machine RAM
- Hardware calculator for VRAM, system RAM, on-disk size, and GPU fit
- Integration payload generation for toolchain consistency
- Desktop-first UX with Electron + React

## Product Areas
- `Dashboard`: system memory health + active preset load signal
- `Models`: search/sort/filter catalog + tools capability status + direct role assignment
- `Preset Builder`: profile authoring with simultaneous or sequential execution mode
- `Hardware Calculator`: practical capacity planning for real inference setups
- `Integrations`: export/apply active preset context to connected tools

## Tech Stack
- Electron
- React + TypeScript
- Zustand
- Vite
- Tailwind CSS

## Project Structure
```text
electron/            # Main process, preload bridge, IPC handlers
src/
  components/        # UI primitives and feature components
  lib/               # Calculators, providers, and utility functions
  pages/             # Route-level screens
  store/             # Zustand state domains
```

## Getting Started
### Requirements
- Node.js 18+
- npm 9+

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```

### Validate
```bash
npm run typecheck
npm run lint
```

### Production Build
```bash
npm run build
```

### Package Desktop App
```bash
npm run dist
```

## Roadmap
- Provider adapters beyond local model endpoints
- Team preset export/import and versioning
- Better runtime benchmarking and latency estimates
- Integration templates marketplace

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## Security
If you discover a vulnerability, follow [SECURITY.md](SECURITY.md).

## License
MIT
