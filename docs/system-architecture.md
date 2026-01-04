# Arc Invoice - System Architecture

**Last Updated**: 2026-01-05
**Phase**: 1 - Project Setup (Complete)
**Version**: 0.1.0

## Architectural Overview

Arc Invoice is a blockchain-enabled invoice application using a **client-side Web3 architecture** with **Next.js server-side rendering**. Phase 1 establishes the foundational layer with wallet integration and UI components.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                         │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router)                                    │
│  ├─ React 19 Components                                     │
│  ├─ Tailwind CSS 4 Styling                                  │
│  └─ shadcn/ui Component Library (13 components)             │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                      │
│  ├─ Wagmi Provider (blockchain wallet state)                │
│  ├─ React Query (async/server state)                        │
│  └─ React Context (local UI state)                          │
├─────────────────────────────────────────────────────────────┤
│  Web3 Integration Layer                                      │
│  ├─ Wagmi v3.1.4 (wallet hooks & connectors)                │
│  ├─ Viem v2.43.5 (chain abstractions & RPCs)                │
│  └─ EIP-6963 (injected wallet support)                      │
├─────────────────────────────────────────────────────────────┤
│  Blockchain Layer                                            │
│  ├─ Arc Mainnet (Chain ID: 185, USDC native)                │
│  └─ Arc Testnet (Chain ID: 18500, USDC native)              │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Application Shell

**File Structure**:
```
app/
├── layout.tsx          # Root layout (providers wrapper)
├── page.tsx            # Landing page
└── providers.tsx       # wagmi + React Query setup
```

**Root Layout (`app/layout.tsx`)**:
- Wraps all routes with Providers component
- Sets global metadata and HTML attributes
- Applies global styles
- Initializes Tailwind CSS

**Providers Component (`app/providers.tsx`)**:
- Creates QueryClient once at mount
- Wraps children with WagmiProvider
- Wraps children with QueryClientProvider
- Configures React Query (60s staleTime)
- Enables SSR (ssr: true in wagmi config)

### 2. UI Component Layer

**13 shadcn/ui Components**:

| Component | Purpose | Status |
|-----------|---------|--------|
| Badge | Status/tag display | Available |
| Button | Clickable actions | Available |
| Card | Content containers | Available |
| Dialog | Modal windows | Available |
| DropdownMenu | Menu selections | Available |
| Input | Text input fields | Available |
| Label | Form labels | Available |
| Select | Dropdown selections | Available |
| Skeleton | Loading placeholders | Available |
| Sonner | Toast notifications | Available |
| Table | Data tables | Available |
| Tabs | Tab navigation | Available |
| Textarea | Multi-line text | Available |

**Architecture**:
- Built on Radix UI (unstyled primitives)
- Styled with Tailwind CSS 4
- Type-safe with TypeScript
- Accessible (WCAG 2.1 compliant)
- Composable and customizable

**Directory**: `components/ui/`

### 3. Web3 Integration Layer

**Wallet Connection Component** (`components/wallet/ConnectButton.tsx`):
- EIP-6963 injected wallet detection
- Connect/disconnect functionality
- Multi-chain support (Arc mainnet + testnet)
- Account display
- Network switching

**Wagmi Configuration** (`lib/wagmi.ts`):
```typescript
export const config = createConfig({
  chains: [arcTestnet, arcMainnet],
  connectors: [injected()],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: true,
});
```

**Features**:
- Two chains configured: testnet (18500) and mainnet (185)
- HTTP transport for read-only operations
- SSR-compatible setup
- EIP-6963 compliant injected wallet support

### 4. Chain Configuration

**Arc Mainnet** (`lib/chains/arc.ts`):
```typescript
export const arcMainnet = defineChain({
  id: 185,
  name: 'Arc',
  nativeCurrency: { decimals: 6, name: 'USD Coin', symbol: 'USDC' },
  rpcUrls: { default: { http: ['https://rpc.arc.circle.com'] } },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.circle.com' }
  }
});
```

**Arc Testnet** (`lib/chains/arc.ts`):
```typescript
export const arcTestnet = defineChain({
  id: 18500,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USD Coin', symbol: 'USDC' },
  rpcUrls: { default: { http: ['https://testnet-rpc.arc.circle.com'] } },
  blockExplorers: {
    default: { name: 'Arc Testnet Explorer', url: 'https://testnet-explorer.arc.circle.com' }
  },
  testnet: true
});
```

## Data Flow Architecture

### 1. Initial Load Flow

```
User Visits App
    ↓
Next.js loads page + hydrates React
    ↓
Providers wrapper initializes
    ├─ Creates QueryClient
    ├─ Mounts WagmiProvider
    │   └─ Connects to wagmi config
    │       ├─ Loads chain definitions
    │       ├─ Initializes injected connector
    │       └─ Sets up HTTP transports
    └─ Mounts QueryClientProvider
    ↓
App renders with wallet state available
```

### 2. Wallet Connection Flow

```
User clicks ConnectButton
    ↓
wagmi useConnect() hook triggered
    ↓
EIP-6963 wallet detection
    ↓
User selects wallet (MetaMask, etc)
    ↓
Wagmi establishes connection
    ├─ Requests account access
    ├─ Receives address
    └─ Fetches current chain
    ↓
Component updates with account data
    ↓
React Query triggers dependent queries
```

### 3. Multi-Chain Interaction Flow

```
User connects wallet on Arc Testnet
    ↓
wagmi stores chain ID in state
    ↓
Components can read current chain via useAccount()
    ↓
User wants to switch to Arc Mainnet
    ↓
useSwitchChain() hook called
    ↓
Wallet prompts user to switch
    ↓
Wagmi updates chain state
    ↓
RPC endpoint switches to mainnet
    ├─ All read operations use mainnet RPC
    └─ All write operations go to mainnet
```

## State Management Architecture

### Wagmi State (Blockchain)

**Location**: `WagmiProvider`
**State Type**: Global context
**Managed By**: wagmi library

**Key State**:
- Current connected account
- Current chain
- Connection status
- Wallet provider

**Access Pattern**:
```typescript
import { useAccount, useChainId, useConnect } from 'wagmi';

function MyComponent() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  // ...
}
```

### React Query State (Async Operations)

**Location**: `QueryClientProvider`
**State Type**: Server state cache
**Managed By**: TanStack React Query v5

**Configuration**:
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
})
```

**Use Cases for Phase 2+**:
- Fetching invoice data
- Loading blockchain transaction history
- Polling wallet balance
- Caching API responses

### Local Component State (UI)

**Location**: Individual React components
**State Type**: Local UI state
**Managed By**: useState, useCallback, useReducer

**Examples**:
- Form input values
- Modal open/closed state
- Expanded/collapsed sections
- Pagination state

## Type System Architecture

### TypeScript Configuration

**File**: `tsconfig.json`

**Key Settings**:
- **target**: ES2020 (modern browsers)
- **module**: ESNext (native ES modules)
- **jsx**: react-jsx (new JSX transform)
- **strict**: true (all strict checks enabled)
- **lib**: ES2020, DOM, DOM.Iterable
- **paths**: `@/*` → `./` (path aliases)

**Enforced Rules**:
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noImplicitReturns`: true
- `noFallthroughCasesInSwitch`: true

### Type Definitions

**File**: `types/database.ts`

Purpose: Defines domain models for:
- Invoices
- Users
- Payments
- Audit logs

Status: Skeleton ready for Phase 2

## Forms & Validation Architecture

### Form Handling

**Framework**: React Hook Form 7.70.0
**Validation**: Zod 4.3.5

**Pattern for Phase 2+**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const invoiceSchema = z.object({
  amount: z.number().positive(),
  dueDate: z.date(),
  description: z.string().min(1),
});

export function InvoiceForm() {
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

**Benefits**:
- Type-safe form values
- Runtime validation
- Automatic error messages
- Minimal bundle size

## Styling Architecture

### Tailwind CSS 4

**Configuration File**: `tailwind.config.ts`

**Features**:
- PostCSS v4 support
- Custom theme variables
- Dark mode via `next-themes`
- Animation utilities via `tw-animate-css`

**Usage Pattern**:
```typescript
// Component with Tailwind classes
export function Button({ variant = 'default' }: Props) {
  return (
    <button className={cn(
      'px-4 py-2 rounded-md font-medium',
      variant === 'primary' && 'bg-blue-600 text-white',
      variant === 'secondary' && 'bg-gray-200 text-gray-900'
    )}>
      {children}
    </button>
  );
}
```

**Class Merging**: `clsx` + `tailwind-merge` via `cn()` utility

### Theme Management

**Library**: `next-themes`

**Features**:
- Dark mode toggle
- Automatic theme persistence
- SSR-safe
- System preference detection

**Phase 2 Usage**:
```typescript
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // ...
}
```

## Icon System

**Library**: Lucide React

**Available Icons**: 500+ icon set
**Usage**: Import and use as components

```typescript
import { Settings, LogOut, Menu } from 'lucide-react';

function Header() {
  return (
    <>
      <Settings size={20} />
      <LogOut size={20} />
      <Menu size={20} />
    </>
  );
}
```

## Notifications System

**Library**: Sonner (toast notifications)

**Phase 2 Usage**:
```typescript
import { toast } from 'sonner';

function InvoiceForm() {
  const handleSubmit = async () => {
    try {
      await saveInvoice(data);
      toast.success('Invoice created successfully');
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };
}
```

## Build & Deployment Architecture

### Next.js Build Process

**Phases**:
1. **Compilation**: TypeScript → JavaScript
2. **Bundle**: Dependencies bundled
3. **Optimization**: Code splitting, minification
4. **Static Generation**: If applicable (Phase 2+)
5. **Output**: `.next/` directory

**Optimizations**:
- Automatic code splitting per route
- Tree shaking of unused exports
- CSS extraction and minification
- JavaScript minification

### Production Deployment

**Requirements**:
- Node.js 18.0.0+
- Environment variables configured
- Static files served via CDN (optional)

**Startup Command**:
```bash
npm start
```

**Environment Variables** (Phase 2):
- `NEXT_PUBLIC_CHAIN_ID`: Default network
- `NEXT_PUBLIC_RPC_URL`: Custom RPC
- Database connection strings
- API keys for external services

## Performance Architecture

### Initial Load Optimization

1. **Code Splitting**: Each route gets minimal JavaScript
2. **Image Optimization**: Next.js Image component (ready)
3. **Font Optimization**: Geist font pre-loaded (Next.js default)
4. **CSS**: Tailwind extracts only used classes

### Runtime Performance

1. **React Query Caching**: 60s default staleTime
2. **Wagmi State Caching**: Chain/account data cached
3. **Component Memoization**: Ready for Phase 2 (React.memo)
4. **Virtual Lists**: Ready for Table component (Phase 2)

### Bundle Size Analysis

**Current**:
- React + DOM: ~40KB
- Next.js: ~50KB
- Tailwind CSS: ~10KB (purged)
- wagmi + viem: ~50KB
- Other deps: ~30KB
- **Total**: ~180KB (gzipped)

## Security Architecture

### Environment Variables

**Pattern**:
- `.env.example` - Committed template
- `.env.local` - Local development (gitignored)
- `.env.production` - Production secrets

**Public vs Private**:
- `NEXT_PUBLIC_*` - Available in browser
- Regular variables - Server-only

### Blockchain Security

**Phase 1 Measures**:
- No private keys stored in code
- Wallet management delegated to wallets
- RPC endpoints are public (read-only safe)
- EIP-6963 standard compliance

**Phase 2+ Measures**:
- Transaction signing via wallet
- Contract interaction validation
- Nonce management for transactions
- Gas estimation before sending

### Input Validation

**Pattern (Phase 2+)**:
```typescript
// Use Zod for runtime validation
const createInvoiceSchema = z.object({
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().positive().max(1000000),
  description: z.string().max(500),
});

// Type inference for free
type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
```

## Extensibility Points

### Adding New Chains

**Steps**:
1. Define chain in `lib/chains/` directory
2. Add to `wagmi.ts` chains array
3. Update ConnectButton chain selector

**Example (Phase 2+)**:
```typescript
// lib/chains/ethereum.ts
export const ethereum = defineChain({
  id: 1,
  name: 'Ethereum',
  // ...
});
```

### Adding New Components

**Steps**:
1. Run `npx shadcn-ui@latest add [component]`
2. Place in `components/ui/`
3. Import and use in features

### Adding New Pages

**Pattern (Phase 2+)**:
```typescript
// app/invoices/page.tsx
export default function InvoicesPage() {
  return (
    <main>
      {/* Page content */}
    </main>
  );
}
```

### Adding New API Routes

**Pattern (Phase 3)**:
```typescript
// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  // Process invoice creation
  return NextResponse.json({ success: true });
}
```

## Testing Architecture

### Unit Testing (Phase 2)

**Framework**: Jest + React Testing Library

**Pattern**:
```typescript
import { render, screen } from '@testing-library/react';
import { ConnectButton } from '@/components/wallet/ConnectButton';

describe('ConnectButton', () => {
  it('should render connect button', () => {
    render(<ConnectButton />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });
});
```

### E2E Testing (Phase 3)

**Framework**: Playwright or Cypress

**Scenarios**:
- Wallet connection flow
- Invoice creation flow
- Payment processing flow

## Monitoring & Observability

### Development

**Tools**:
- Next.js dev server with HMR
- Browser DevTools
- React DevTools Extension
- ESLint + TypeScript checks

### Production (Phase 2+)

**Monitoring**:
- Error tracking (Sentry)
- Analytics (Vercel Analytics)
- Performance monitoring (Web Vitals)
- User tracking (if GDPR compliant)

### Logging

**Phase 2+ Implementation**:
```typescript
// Structured logging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  event: 'invoice_created',
  invoiceId: '123',
  userId: '456',
}));
```

## Error Handling Architecture

### Client-Side Error Handling

**Pattern (Phase 2+)**:
```typescript
// Error boundary wrapper
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const [error, setError] = useState(null);

  if (error) {
    return <ErrorPage error={error} />;
  }

  return <>{children}</>;
}
```

### Async Error Handling

**Pattern**:
```typescript
async function saveInvoice(data: InvoiceData) {
  try {
    const result = await api.createInvoice(data);
    toast.success('Invoice saved');
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      toast.error(`Validation failed: ${error.message}`);
    } else if (error instanceof NetworkError) {
      toast.error('Network error. Please check connection.');
    } else {
      toast.error('Unexpected error');
      console.error('Unhandled error:', error);
    }
    throw error;
  }
}
```

## Integration with External Services (Phase 2+)

### Database Integration

**Technology**: Supabase (PostgreSQL)

**Connection Pattern**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);
```

### API Integration

**Pattern**:
```typescript
async function fetchInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch invoice: ${response.status}`);
  }

  return response.json();
}
```

### Wallet/Blockchain Integration

**Pattern**:
```typescript
import { useContractWrite } from 'wagmi';

function PaymentButton() {
  const { write: pay } = useContractWrite({
    address: invoiceContractAddress,
    abi: invoiceContractABI,
    functionName: 'payInvoice',
    args: [invoiceId],
  });

  return <button onClick={() => pay()}>Pay Invoice</button>;
}
```

## Deployment Considerations

### Development Environment

```bash
npm run dev
# Starts on http://localhost:3000
# Hot reload enabled
# Debugging available
```

### Production Build

```bash
npm run build
npm start
```

**Process**:
1. Compiles TypeScript
2. Bundles dependencies
3. Creates optimized build
4. Ready for deployment

### Hosting Options (Phase 2)

1. **Vercel** (Recommended)
   - Built for Next.js
   - Automatic deployments
   - Zero-config

2. **Docker** (Self-hosted)
   - Full control
   - Custom infrastructure

3. **Traditional Server**
   - Node.js server
   - Nginx reverse proxy

## Unresolved Questions / Future Considerations

1. **API Route Organization**: How to structure API routes for invoices, payments, and users (Phase 3)?
2. **Middleware**: Need for authentication middleware (Phase 2)?
3. **Caching Strategy**: What should be cached at different layers (Phase 2+)?
4. **Real-time Updates**: Should WebSockets be used for transaction status (Phase 3)?
5. **Database Schema**: Finalize schema for invoices and related data (Phase 2)?

---

**Status**: Phase 1 Architecture Complete
**Last Verified**: 2026-01-05
