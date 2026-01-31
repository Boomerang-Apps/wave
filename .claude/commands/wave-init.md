# Wave Init: Initialize Wave V2 Framework

Initialize the Wave V2 Aerospace Safety Protocol for any project.

## Arguments
- `$ARGUMENTS` - Optional: project type hint (e.g., "nextjs", "python", "go", "rust")

## Purpose
Set up the Wave V2 framework structure in any project, detecting or configuring project-specific commands.

## Execution

### 1. Create Directory Structure
```
.claude/
├── commands/           # Custom commands (this file)
├── signals/            # Runtime signal files
└── config.json         # Project configuration

planning/
├── schemas/            # Story schema definitions
├── checklists/         # Pre-flight checklists
├── hazards/            # Hazard analysis files
├── traceability/       # Traceability matrices
├── rollback/           # Rollback procedures
└── rlm/                # Requirements lifecycle

stories/
├── wave1/              # Wave 1 stories
├── wave2/              # Wave 2 stories
└── ...

contracts/              # Shared type definitions / interfaces
```

### 2. Detect Project Type
Automatically detect based on files present:
- `package.json` → Node.js (npm/pnpm/yarn)
- `requirements.txt` / `pyproject.toml` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `pom.xml` / `build.gradle` → Java
- `Gemfile` → Ruby
- `*.csproj` → .NET

### 3. Generate Config File
Create `.claude/config.json`:
```json
{
  "framework": "wave-v2",
  "version": "1.0",
  "project": {
    "type": "auto-detected or specified",
    "name": "from package.json or directory name"
  },
  "commands": {
    "install": "pnpm install | pip install -r requirements.txt | go mod download",
    "build": "pnpm build | python -m build | go build ./...",
    "test": "pnpm test | pytest | go test ./...",
    "testCoverage": "pnpm test:coverage | pytest --cov | go test -cover ./...",
    "lint": "pnpm lint | ruff check | golangci-lint run",
    "typeCheck": "pnpm tsc --noEmit | mypy . | N/A",
    "securityAudit": "pnpm audit | safety check | govulncheck ./..."
  },
  "paths": {
    "stories": "stories/",
    "contracts": "contracts/",
    "planning": "planning/",
    "signals": ".claude/signals/"
  },
  "gates": {
    "coverageThreshold": 70,
    "branchCoverageThreshold": 60,
    "maxBundleSize": "500KB",
    "retryLimit": 3
  },
  "agents": ["be-dev", "fe-dev", "qa", "pm", "cto"]
}
```

### 4. Create Schema Template
Generate `planning/schemas/story-schema.json` with V4.1 specification.

### 5. Create Sample Story
Generate a sample story file demonstrating the format.

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WAVE V2 FRAMEWORK INITIALIZED                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Project: {name}                                                             ║
║  Type: {detected/specified type}                                             ║
║  Framework: Wave V2 Aerospace Safety Protocol                                ║
║                                                                              ║
║  Created:                                                                    ║
║    ✓ .claude/config.json                                                     ║
║    ✓ planning/ directory structure                                           ║
║    ✓ stories/ directory structure                                            ║
║    ✓ contracts/ directory                                                    ║
║    ✓ Story schema V4.1                                                       ║
║                                                                              ║
║  Commands configured for: {project type}                                     ║
║    Build: {build command}                                                    ║
║    Test: {test command}                                                      ║
║    Lint: {lint command}                                                      ║
║                                                                              ║
║  Next steps:                                                                 ║
║    1. Review .claude/config.json and adjust commands if needed               ║
║    2. Create stories in stories/wave1/                                       ║
║    3. Run /gate-0 to validate pre-flight checklist                           ║
║    4. Run /execute-story {STORY-ID} to begin implementation                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
