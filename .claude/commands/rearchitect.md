# Rearchitect: Analyze and Reorganize Folder Structure

Analyze project structure against Wave V2 and production best practices, then propose or execute reorganization.

## Arguments
- `$ARGUMENTS` - Action: "analyze", "plan", "execute", or "validate"

## Purpose
Ensure project folder structure follows Wave V2 Aerospace Safety Protocol requirements and production-ready patterns for scalability, maintainability, and team collaboration.

## Actions

### `analyze` (default)
Scan current structure and generate compliance report.

### `plan`
Generate detailed reorganization plan with file moves.

### `execute`
Execute the reorganization plan (requires confirmation).

### `validate`
Verify structure after reorganization.

## Wave V2 Required Structure

```
project-root/
│
├── .claude/                    # Wave V2 Control Center
│   ├── commands/              # Slash commands
│   ├── signals/               # Runtime signal files
│   ├── hooks/                 # Git/tool hooks
│   ├── agents/                # Agent configurations
│   ├── telemetry/             # OpenTelemetry setup
│   ├── rpc/                   # Agent-to-agent RPC
│   └── config.json            # Project configuration
│
├── planning/                   # Pre-Development Artifacts
│   ├── schemas/               # Story/contract schemas
│   ├── checklists/            # Pre-flight checklists
│   ├── hazards/               # Hazard analysis files
│   ├── traceability/          # Requirement traceability matrices
│   ├── rollback/              # Rollback procedures
│   └── rlm/                   # Requirements lifecycle
│
├── stories/                    # AI-Executable Stories
│   ├── wave1/                 # Wave 1 stories
│   ├── wave2/                 # Wave 2 stories
│   └── backlog/               # Unassigned stories
│
├── contracts/                  # Shared Type Definitions
│   ├── api/                   # API contracts (OpenAPI/tRPC)
│   ├── types/                 # Shared TypeScript types
│   └── events/                # Event schemas
│
├── docs/                       # Documentation
│   ├── architecture/          # Architecture decisions (ADRs)
│   ├── api/                   # API documentation
│   ├── runbooks/              # Operational runbooks
│   └── retrospectives/        # Sprint/wave retrospectives
│
└── reports/                    # Generated Reports
    ├── coverage/              # Test coverage reports
    ├── audits/                # Security/compliance audits
    └── metrics/               # Performance metrics
```

## Production App Structure (Next.js/React)

```
src/                            # Source Code
├── app/                       # Next.js App Router
│   ├── (auth)/               # Auth route group
│   ├── (dashboard)/          # Dashboard route group
│   ├── api/                  # API routes
│   └── layout.tsx            # Root layout
│
├── components/                # Shared UI Components
│   ├── ui/                   # Primitives (Button, Input, etc.)
│   ├── layout/               # Layout components (Header, Footer)
│   └── shared/               # Shared business components
│
├── features/                  # Feature Modules (Domain-Driven)
│   └── {feature}/
│       ├── components/       # Feature-specific components
│       ├── hooks/            # Feature-specific hooks
│       ├── lib/              # Feature utilities
│       ├── types/            # Feature types
│       └── __tests__/        # Feature tests
│
├── lib/                       # Shared Utilities
│   ├── utils/                # Utility functions
│   ├── hooks/                # Shared hooks
│   ├── api/                  # API client
│   └── constants/            # App constants
│
├── types/                     # Global TypeScript Types
│   ├── api.d.ts              # API types
│   ├── env.d.ts              # Environment types
│   └── global.d.ts           # Global augmentations
│
└── __tests__/                 # Global Test Utilities
    ├── setup.ts              # Test setup
    ├── mocks/                # Global mocks
    └── fixtures/             # Test fixtures
```

## Backend/Server Structure

```
server/                         # Server Code
├── routes/                    # API Route Handlers
│   ├── auth/                 # Auth routes
│   ├── users/                # User routes
│   └── index.js              # Route registry
│
├── middleware/                # Express Middleware
│   ├── auth.js               # Authentication
│   ├── validation.js         # Request validation
│   └── error-handler.js      # Error handling
│
├── services/                  # Business Logic
│   └── {domain}/             # Domain services
│
├── utils/                     # Server Utilities
│   ├── logger.js             # Logging
│   ├── cache.js              # Caching
│   └── validators/           # Validation schemas
│
└── __tests__/                 # Server Tests
    ├── integration/          # Integration tests
    └── unit/                 # Unit tests
```

## Monorepo Structure (if applicable)

```
/                               # Monorepo Root
├── apps/                      # Applications
│   ├── web/                  # Main web app
│   ├── admin/                # Admin panel
│   └── api/                  # API server
│
├── packages/                  # Shared Packages
│   ├── ui/                   # Shared UI library
│   ├── config/               # Shared configs
│   ├── types/                # Shared types
│   └── utils/                # Shared utilities
│
├── tooling/                   # Development Tools
│   ├── eslint-config/        # ESLint configs
│   ├── typescript-config/    # TSConfig bases
│   └── testing/              # Test utilities
│
└── infrastructure/            # IaC & DevOps
    ├── docker/               # Dockerfiles
    ├── kubernetes/           # K8s manifests
    └── terraform/            # Terraform configs
```

## Analysis Checklist

### Wave V2 Compliance
```
□ .claude/ directory exists with required subdirectories
□ planning/ directory with schemas and checklists
□ stories/ directory with wave organization
□ contracts/ directory for shared types
□ Signal files in .claude/signals/
□ Hook scripts in .claude/hooks/
□ config.json present and valid
```

### Production Patterns
```
□ Feature-based organization (not type-based)
□ Colocated tests (__tests__/ next to code)
□ Shared components in components/ui/
□ Type definitions properly organized
□ No deeply nested directories (max 4 levels)
□ Clear separation of concerns
□ Index files for clean imports
```

### Anti-Patterns to Fix
```
□ Flat structure with too many files in root
□ Type-based organization (all components in one folder)
□ Tests separated from source
□ Circular dependencies between features
□ Mixed concerns in single directories
□ Inconsistent naming conventions
□ Missing index.ts barrel files
```

## Execution

### Step 1: Scan Current Structure
```bash
# Generate directory tree
find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | head -100

# Count files per directory
find . -type f -not -path '*/node_modules/*' | cut -d/ -f2 | sort | uniq -c | sort -rn
```

### Step 2: Identify Issues
For each directory, check:
- Purpose clarity (what belongs here?)
- Naming convention compliance
- Depth appropriateness
- Colocation of related files

### Step 3: Generate Move Plan
```json
{
  "moves": [
    {
      "from": "components/LoginForm.tsx",
      "to": "src/features/auth/components/LoginForm.tsx",
      "reason": "Colocate with auth feature"
    }
  ],
  "creates": [
    {
      "path": "src/features/auth/index.ts",
      "reason": "Barrel export for auth feature"
    }
  ],
  "deletes": [
    {
      "path": "src/utils/oldHelper.ts",
      "reason": "Unused, replaced by lib/utils"
    }
  ]
}
```

### Step 4: Execute with Safety
```bash
# Create backup
git stash push -m "Pre-rearchitect backup"

# Execute moves
# ... automated file operations ...

# Verify build
npm run build

# If failed, rollback
git stash pop
```

## Output Format

### Analysis Report
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STRUCTURE ANALYSIS REPORT                                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  WAVE V2 COMPLIANCE                                                          ║
║  ──────────────────                                                          ║
║  Score: 85/100                                                               ║
║                                                                              ║
║  ✓ .claude/ directory present                                                ║
║  ✓ planning/ directory with schemas                                          ║
║  ✓ stories/ organized by waves                                               ║
║  ✗ contracts/ missing API contracts                                          ║
║  ✗ Missing traceability matrices                                             ║
║                                                                              ║
║  PRODUCTION PATTERNS                                                         ║
║  ───────────────────                                                         ║
║  Score: 72/100                                                               ║
║                                                                              ║
║  ✓ Feature-based organization                                                ║
║  ✓ Colocated tests                                                           ║
║  ✗ Components not in ui/ subdirectory                                        ║
║  ✗ Mixed concerns in lib/                                                    ║
║  ⚠ Deep nesting in features/auth/components/forms/fields/                    ║
║                                                                              ║
║  ANTI-PATTERNS DETECTED                                                      ║
║  ──────────────────────                                                      ║
║  1. 47 files in src/utils/ - split by domain                                 ║
║  2. Circular import: auth → user → auth                                      ║
║  3. Tests in separate /tests directory                                       ║
║                                                                              ║
║  RECOMMENDATIONS                                                             ║
║  ───────────────                                                             ║
║  1. Move components/ui/* to src/components/ui/                               ║
║  2. Create contracts/api/ for OpenAPI specs                                  ║
║  3. Split utils/ into feature-specific lib/ directories                      ║
║  4. Add planning/traceability/ for requirement tracking                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Run `/rearchitect plan` to generate detailed move plan                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Reorganization Plan
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  REORGANIZATION PLAN                                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PHASE 1: Wave V2 Infrastructure (0 risk)                                    ║
║  ─────────────────────────────────────────                                   ║
║  CREATE: planning/traceability/                                              ║
║  CREATE: contracts/api/                                                      ║
║  CREATE: contracts/events/                                                   ║
║                                                                              ║
║  PHASE 2: Component Organization (low risk)                                  ║
║  ──────────────────────────────────────────                                  ║
║  MOVE: components/*.tsx → src/components/ui/                                 ║
║  MOVE: components/layout/* → src/components/layout/                          ║
║  CREATE: src/components/ui/index.ts (barrel)                                 ║
║                                                                              ║
║  PHASE 3: Feature Consolidation (medium risk)                                ║
║  ─────────────────────────────────────────────                               ║
║  MOVE: utils/auth* → src/features/auth/lib/                                  ║
║  MOVE: hooks/useAuth.ts → src/features/auth/hooks/                           ║
║  UPDATE: Import paths in 12 files                                            ║
║                                                                              ║
║  PHASE 4: Test Colocation (low risk)                                         ║
║  ────────────────────────────────────                                        ║
║  MOVE: tests/auth/* → src/features/auth/__tests__/                           ║
║  MOVE: tests/components/* → src/components/__tests__/                        ║
║                                                                              ║
║  IMPACT SUMMARY                                                              ║
║  ──────────────                                                              ║
║  Files to move: 34                                                           ║
║  Directories to create: 8                                                    ║
║  Import updates: 67                                                          ║
║  Estimated time: 5-10 minutes (automated)                                    ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Run `/rearchitect execute` to apply changes (creates backup first)          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Safety Measures

1. **Pre-execution backup**: Always stash or commit current state
2. **Dry-run first**: Show planned changes before execution
3. **Incremental execution**: Apply phase by phase with verification
4. **Build verification**: Run build after each phase
5. **Rollback ready**: Keep backup until validation passes

## Related Commands
- `/gap-analysis` - Find missing requirements and implementations
- `/validate-research` - Validate story research
- `/protocol-verify` - Check Wave V2 compliance
- `/design-system validate` - Validate component organization
