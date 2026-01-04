# Arc Invoice - Documentation Index

**Last Updated**: 2026-01-05
**Phase**: 1 - Project Setup (Complete)
**Total Docs**: 21 markdown files organized across docs/, plans/, and project root

## Quick Navigation

### Core Documentation (Start Here)

These three documents provide everything needed to understand the project:

1. **[Codebase Summary](./codebase-summary.md)** (389 lines)
   - What: Project structure and technology stack
   - When: First time setup and onboarding
   - Contains: Project overview, file organization, dependencies, metrics
   - Time to read: 15-20 minutes

2. **[System Architecture](./system-architecture.md)** (796 lines)
   - What: How the system is designed and organized
   - When: Understanding design patterns and data flows
   - Contains: Component architecture, state management, data flows, patterns
   - Time to read: 25-30 minutes

3. **[Code Standards](./code-standards.md)** (994 lines)
   - What: How to write code for this project
   - When: Before writing code, during code review
   - Contains: Naming conventions, patterns, standards, best practices
   - Time to read: 20-25 minutes

### Phase 1 Specific Documentation

**Phase 1 Completion Report**:
- [Phase 1 Documentation Completion](./plans/reports/260105-0003-docs-phase1-completion.md)
  - Status of documentation updates
  - Coverage analysis
  - Validation results
  - Phase 2 recommendations

## Documentation Organization

### docs/ Directory

```
docs/
├── DOCUMENTATION-INDEX.md          ← You are here
├── codebase-summary.md             ← Project structure & tech stack
├── system-architecture.md          ← Design patterns & data flows
├── code-standards.md               ← Coding standards & patterns
├── project-overview-pdr.md         ← Project goals & requirements
├── project-roadmap.md              ← Phase 2-4 timeline
├── assets/                         ← Demo images & reports
│   ├── demo-landing-page.jpg
│   ├── demo-landing-page-2.png
│   ├── demo-landing-page-3.png
│   └── ...other assets
└── journals/                       ← Development journal entries
    └── INDEX.md
```

### plans/ Directory

```
plans/
├── reports/                        ← Agent communication reports
│   ├── 260105-0003-docs-phase1-completion.md  ← Phase 1 docs report
│   └── ...other reports
└── ...other planning files
```

## By Use Case

### I'm new to this project

Start here:
1. Read [README.md](../README.md) (5 min) - Quick overview
2. Read [Codebase Summary](./codebase-summary.md) (15 min) - What exists
3. Read [System Architecture](./system-architecture.md) (25 min) - How it works
4. Skim [Code Standards](./code-standards.md) (10 min) - Coding rules

**Total time**: ~55 minutes

### I need to write a new component

Reference these:
1. [Code Standards - React Component Standards](./code-standards.md#react-component-standards)
2. [Code Standards - TypeScript Standards](./code-standards.md#typescript-standards)
3. [System Architecture - Component Architecture](./system-architecture.md#component-architecture)
4. [Code Standards - Component Props](./code-standards.md#component-props)

### I need to add a new page

Reference these:
1. [Code Standards - File Organization](./code-standards.md#file-organization-standards)
2. [System Architecture - Extensibility Points](./system-architecture.md#extensibility-points)
3. [Code Standards - Import Organization](./code-standards.md#import-organization)

### I need to integrate with blockchain

Reference these:
1. [Codebase Summary - Chain Support](./codebase-summary.md#key-features-phase-1)
2. [System Architecture - Web3 Integration Layer](./system-architecture.md#3-web3-integration-layer)
3. [Code Standards - Web3 & Blockchain Standards](./code-standards.md#web3--blockchain-standards)

### I need to set up forms

Reference these:
1. [Code Standards - Forms & Validation Standards](./code-standards.md#forms--validation-standards)
2. [System Architecture - Forms & Validation Architecture](./system-architecture.md#forms--validation-architecture)
3. [Code Standards - React Hook Form Pattern](./code-standards.md#react-hook-form-pattern)

### I'm reviewing someone's code

Use the checklist:
1. [Code Standards - Code Review Checklist](./code-standards.md#code-review-checklist)

## Technology Stack Reference

### Frontend Framework
- **Next.js 16.1.1** - [Docs](https://nextjs.org/docs)
- **React 19.2.3** - [Docs](https://react.dev)

### Styling
- **Tailwind CSS 4** - [Docs](https://tailwindcss.com/docs)
- **shadcn/ui** - [Docs](https://ui.shadcn.com)

### Blockchain
- **wagmi v3.1.4** - React hooks for blockchain
- **viem v2.43.5** - TypeScript Ethereum library
- **Arc Chain** - Mainnet ID: 185, Testnet ID: 18500

### Forms & Validation
- **React Hook Form 7.70.0** - Form state management
- **Zod 4.3.5** - TypeScript-first validation

### State Management
- **TanStack React Query 5.90.16** - Server state
- **wagmi** - Blockchain state
- **React Hooks** - Local state

### Dev Tools
- **TypeScript 5** - Type safety
- **ESLint 9** - Linting
- **Tailwind CSS PostCSS 4** - CSS processing

## Key Decisions Made (Phase 1)

### Architecture
✅ Client-side Web3 architecture with Next.js SSR
✅ File-based component organization (ui/, wallet/, forms/)
✅ Wagmi v3 for wallet integration (not wagmi v2)
✅ React Query for async state management

### Code Organization
✅ Components: PascalCase (.tsx files)
✅ Utilities: camelCase (.ts files)
✅ Hooks: camelCase with 'use' prefix
✅ Types: PascalCase interfaces

### Standards
✅ TypeScript strict mode enabled
✅ 500-line file size limit
✅ YAGNI, KISS, DRY principles
✅ Conventional Commits for git

### Component Library
✅ shadcn/ui (13 components) instead of building custom
✅ Radix UI for unstyled primitives
✅ Tailwind CSS for styling
✅ Lucide React for icons

## Statistics

### Documentation Coverage

| Category | Count | Status |
|----------|-------|--------|
| Core docs | 3 | Complete |
| Complementary docs | 2 | Partial |
| Implementation plans | 1 | In progress |
| Code examples | 40+ | Complete |
| Diagrams/flows | 6+ | Complete |
| References | 15+ | Complete |

### Project Metrics

| Metric | Value |
|--------|-------|
| Components (UI) | 13 |
| Components (Custom) | 1 |
| Chain definitions | 2 |
| Type files | 1 |
| Configuration files | 6 |
| Dependencies (prod) | 18 |
| Dependencies (dev) | 5 |
| Documentation lines | 2,179 |

## Phase 1 Completion Status

### Documentation
- ✅ Codebase Summary - 100%
- ✅ System Architecture - 100%
- ✅ Code Standards - 100%
- ⏳ Project Overview PDR - Ready for update
- ⏳ Project Roadmap - Ready for creation

### Project Setup
- ✅ Next.js 16 configured
- ✅ React 19 integrated
- ✅ TypeScript strict mode
- ✅ Tailwind CSS 4
- ✅ wagmi v3 + viem v2
- ✅ Arc chain definitions
- ✅ 13 shadcn/ui components
- ✅ Wallet connection component
- ✅ Provider setup

### Ready for Phase 2
- ✅ Foundation solid
- ✅ Standards documented
- ✅ Patterns established
- ✅ Team can start implementation

## Common Questions

### Q: Where do I find coding guidelines?
A: [Code Standards](./code-standards.md) has everything from naming conventions to testing patterns.

### Q: How do I add a new dependency?
A: Update `package.json`, then document it in [Codebase Summary - Dependencies](./codebase-summary.md).

### Q: What's the component structure?
A: See [System Architecture - Component Architecture](./system-architecture.md#component-architecture).

### Q: How do I connect a wallet?
A: See [Code Standards - Wallet Integration](./code-standards.md#wallet-integration).

### Q: What's the file size limit?
A: 500 lines per file. See [Code Standards - File Size Management](./code-standards.md#file-size-management).

### Q: How do I name variables?
A: [Code Standards - Naming Conventions](./code-standards.md#naming-conventions).

### Q: What type of errors should I handle?
A: [Code Standards - Error Handling Standards](./code-standards.md#error-handling-standards).

## Maintenance & Updates

### When to Update Documentation

- ✅ When adding new dependencies
- ✅ When creating new components
- ✅ When changing architecture
- ✅ When establishing new patterns
- ✅ When completing major phases

### Who Maintains Documentation

- **Phase 1-2**: docs-manager agent
- **Ongoing**: Development team with code reviews

### Update Frequency

- Core docs: Reviewed each Phase
- Code Standards: Updated as patterns emerge
- Codebase Summary: Updated after major changes

## Related Resources

### Internal
- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Claude Code instructions
- [package.json](../package.json) - Dependencies
- [tsconfig.json](../tsconfig.json) - TypeScript config
- [eslint.config.mjs](../eslint.config.mjs) - Linting rules

### External
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [wagmi Documentation](https://wagmi.sh)
- [viem Documentation](https://viem.sh)

## Feedback & Contributions

### Documentation Issues
If you find outdated or unclear documentation:
1. Create a GitHub issue with the documentation reference
2. Suggest improvements with examples
3. Tag with `docs` label

### Contributing Documentation
1. Follow [Code Standards - Comments & Documentation](./code-standards.md#comments--documentation)
2. Use existing document structure as reference
3. Include code examples for new patterns
4. Cross-reference related sections

## Quick Links

**Setup & Getting Started**:
- [Codebase Summary](./codebase-summary.md)
- [Development Scripts](./codebase-summary.md#development-scripts)

**Architecture & Design**:
- [System Architecture](./system-architecture.md)
- [Component Architecture](./system-architecture.md#component-architecture)
- [Data Flow Diagrams](./system-architecture.md#data-flow-architecture)

**Coding Guidelines**:
- [Code Standards](./code-standards.md)
- [Naming Conventions](./code-standards.md#naming-conventions)
- [React Component Standards](./code-standards.md#react-component-standards)
- [TypeScript Standards](./code-standards.md#typescript-standards)

**Reference**:
- [Dependencies List](./codebase-summary.md#dependencies-summary)
- [File Organization](./codebase-summary.md#project-structure)
- [Technology Stack](./codebase-summary.md#core-technologies)

---

**Last Updated**: 2026-01-05
**Status**: Phase 1 Documentation Complete
**Next Phase**: Phase 2 - Invoice Management Implementation
