# ModelSweeper Roadmap v0.2.0

Target: convert early interest into daily active usage with faster setup, better reliability, and visible workflow wins.

## Release Theme
From "useful utility" to "daily driver" for AI workflow operations.

## Must-Ship (P0)
1. Reviewer Role Completion
- Add full reviewer role assignment and management parity with thinker/coder flows.
- Acceptance: reviewer can be assigned, persisted, edited, and activated from all relevant screens.

2. Accurate Live Memory Readings
- Align dashboard memory values with OS-level memory signals.
- Add clear labels for app memory vs system-used memory.
- Acceptance: values update on interval and remain within expected tolerance against system monitor.

3. Hardware Calculator 2.0 (Simple Mode)
- Keep only critical inputs via sliders:
  - Model Size (B params)
  - Context Length (tokens)
  - System RAM (GB)
  - VRAM per GPU (GB)
- Output clear fit states: `Fits`, `Tight`, `Likely OOM`.
- Acceptance: calculation result understandable in <5 seconds for first-time users.

## Should-Ship (P1)
1. Preset Templates
- Add practical starter templates: Coding, Research, Review, Fast Chat.

2. Integration Export Profiles
- Export structured configs for multiple clients with stable schema.

3. Session Diagnostics
- Add a lightweight diagnostics panel for failed runs and memory pressure events.

## Nice-to-Have (P2)
1. Benchmark Snapshot
- Save basic latency/tokens-per-second observations per preset.

2. Preset Sharing
- Import/export presets as files for community sharing.

## Success Metrics
- Activation: user creates first preset in <3 minutes
- Reliability: reduce memory-related failed attempts by 30%
- Retention: 7-day return rate increases release-over-release
- Feedback: at least 20 actionable issues/discussions post-launch

## Suggested Milestones
- Week 1: Reviewer parity + memory labeling correctness
- Week 2: Hardware Calculator 2.0 + fit states
- Week 3: preset templates + integration export profiles
- Week 4: stabilization, bug fixes, and v0.2.0 release notes
