# Arc Invoice - Code Standards & Guidelines

**Last Updated**: 2026-01-05
**Phase**: 1 - Project Setup
**Applies To**: All code in the Arc Invoice project

## Overview

This document defines coding standards, naming conventions, file organization, and best practices for the Arc Invoice project. All code must adhere to these standards to ensure consistency, maintainability, and quality.

## Development Principles

### YAGNI (You Aren't Gonna Need It)
- Implement features only when needed
- Avoid over-engineering and premature optimization
- Don't build infrastructure for hypothetical requirements
- Start simple, refactor when necessary

### KISS (Keep It Simple, Stupid)
- Prefer simple, straightforward solutions
- Avoid unnecessary complexity
- Write code that's easy to understand and modify
- Choose clarity over cleverness

### DRY (Don't Repeat Yourself)
- Eliminate code duplication
- Extract common logic into reusable functions/utilities
- Use composition and abstraction appropriately
- Maintain single source of truth

## File Organization Standards

### Directory Structure

```
arc-invoice/
├── .claude/                    # Claude Code configuration
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── api/                   # API routes (Phase 2+)
├── components/                 # React components
│   ├── ui/                    # shadcn/ui components (13)
│   ├── wallet/                # Web3 components
│   ├── forms/                 # Form components (Phase 2+)
│   ├── invoice/               # Invoice features (Phase 2+)
│   └── layout/                # Layout components
├── lib/                        # Utility functions
│   ├── chains/
│   │   └── arc.ts
│   ├── wagmi.ts
│   ├── utils.ts
│   └── api/                   # API client utilities (Phase 2+)
├── types/                      # TypeScript definitions
│   ├── database.ts
│   ├── api.ts                 # API types (Phase 2+)
│   └── index.ts               # Re-exports
├── hooks/                      # Custom React hooks (Phase 2+)
├── styles/                     # Global styles
├── public/                     # Static assets
├── docs/                       # Project documentation
├── plans/                      # Development plans
├── .env.example               # Environment template
├── eslint.config.mjs          # ESLint rules
├── next.config.ts             # Next.js config
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
├── package.json               # Dependencies
└── README.md                   # Project overview
```

### Naming Conventions

#### Files & Directories

**React Components** (PascalCase):
```
components/
├── Button.tsx          # Single component
├── InvoiceForm.tsx     # Feature component
└── wallet/
    └── ConnectButton.tsx
```

**TypeScript Files** (camelCase):
```
lib/
├── wagmi.ts            # Configuration exports
├── chains/
│   └── arc.ts         # Chain definitions
└── utils.ts           # Utility functions
```

**Hook Files** (camelCase with 'use' prefix):
```
hooks/
├── useInvoice.ts      # Custom hook
├── usePayment.ts
└── useWallet.ts       # wagmi hooks pattern
```

**Type Definition Files** (camelCase or PascalCase):
```
types/
├── database.ts        # Database models
├── api.ts             # API response types
└── index.ts           # Type re-exports
```

**Test Files** (match source + .test or .spec):
```
Button.tsx
Button.test.tsx
Button.spec.tsx
```

**Directories** (kebab-case):
```
components/
├── ui/
├── wallet/
├── invoice-form/
└── payment-gateway/
```

#### JavaScript/TypeScript Naming

**Variables** (camelCase):
```typescript
const userName = 'John';
const isConnected = true;
const invoiceTotal = 1000;
```

**Functions** (camelCase):
```typescript
function calculateTotal(items) { }
const getUserInvoices = (userId: string) => { };
const formatCurrency = (amount: number): string => { };
```

**Classes** (PascalCase):
```typescript
class InvoiceService { }
class PaymentProcessor { }
```

**Constants** (UPPER_SNAKE_CASE):
```typescript
const API_ENDPOINT = 'https://api.example.com';
const MAX_INVOICE_AMOUNT = 1000000;
const DEFAULT_CHAIN_ID = 185; // Arc Mainnet
```

**Enums** (PascalCase):
```typescript
enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
}
```

**Interfaces/Types** (PascalCase):
```typescript
interface Invoice {
  id: string;
  amount: number;
  status: InvoiceStatus;
}

type InvoiceInput = Omit<Invoice, 'id'>;
```

**Private Members** (underscore prefix):
```typescript
class Database {
  private _connectionPool: Connection[] = [];

  private _connect() { }
}
```

#### Component Props

**Props Interface** (use `Props` suffix):
```typescript
interface ConnectButtonProps {
  onConnect?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ConnectButton(props: ConnectButtonProps) {
  // ...
}
```

#### API Naming

**Endpoints** (kebab-case, plural resources):
```
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices
PUT    /api/invoices/:id
DELETE /api/invoices/:id
GET    /api/invoices/:invoiceId/payments
```

**Request/Response Fields** (camelCase):
```json
{
  "invoiceId": "inv_123",
  "recipientAddress": "0x...",
  "amountUSDC": 1000,
  "issuedAt": "2026-01-05T10:00:00Z",
  "dueDate": "2026-02-05T10:00:00Z"
}
```

## Code Style Guidelines

### Formatting

**Indentation**:
- Use 2 spaces (not tabs)
- Consistent throughout file
- No trailing whitespace

**Line Length**:
- Preferred: 80-100 characters
- Hard limit: 120 characters
- Break long lines logically

**Whitespace**:
- One blank line between functions/methods
- Two blank lines between classes
- Space after keywords: `if (`, `for (`, `while (`
- Space after commas in lists

**Semicolons**:
- Always use semicolons
- Configured via ESLint

**Quotes**:
- Prefer single quotes for strings
- Double quotes for JSX attributes
- Template literals for interpolation

### Comments & Documentation

**File Headers** (optional but recommended):
```typescript
/**
 * Wallet Connection Component
 *
 * Provides EIP-6963 compliant wallet connection UI with multi-chain support.
 * Supports Arc mainnet and testnet chains.
 *
 * @module components/wallet/ConnectButton
 */
```

**Function Documentation**:
```typescript
/**
 * Connects wallet via EIP-6963 injected wallet provider
 *
 * @param connector - The wallet connector to use
 * @returns Promise that resolves when wallet is connected
 * @throws WalletConnectionError if connection fails
 */
async function connectWallet(connector: Connector): Promise<Account> {
  // Implementation
}
```

**Inline Comments**:
- Explain WHY, not WHAT
- Only for non-obvious logic
- Keep concise and helpful

```typescript
// Arc mainnet uses USDC as native currency (6 decimals)
const arcNativeCurrency = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
};
```

**TODO Comments**:
```typescript
// TODO: Add error boundary for wallet connection (Phase 2)
// BUG: Connection sometimes fails on network switch
// HACK: Temporary fix for chain ID mismatch
```

## React Component Standards

### Component Structure

**Functional Components with Hooks**:
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

/**
 * Reusable button component with variants
 */
export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Component Best Practices**:
1. Use functional components (no class components)
2. Props interface for type safety
3. Default props clearly documented
4. Children typed explicitly
5. Spread HTML attributes for extensibility

### Hook Usage

**Custom Hook Pattern**:
```typescript
/**
 * Hook for managing invoice data
 */
export function useInvoice(invoiceId: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch invoice on mount
    fetchInvoice(invoiceId)
      .then(setInvoice)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  return { invoice, loading };
}
```

**Dependencies Array**:
- Always include dependencies
- List all values that affect logic
- Use linting to catch missing deps

**Clean Up**:
```typescript
useEffect(() => {
  const unsubscribe = subscribeToUpdates();

  return () => {
    unsubscribe(); // Clean up on unmount
  };
}, []);
```

## TypeScript Standards

### Type Safety

**Always Type Props**:
```typescript
// GOOD
interface ComponentProps {
  title: string;
  count: number;
  onComplete: () => void;
}

export function Component(props: ComponentProps) { }

// AVOID
export function Component(props: any) { }
```

**Use Strict Null Checks**:
```typescript
// GOOD
function processInvoice(invoice: Invoice | null) {
  if (!invoice) return;
  console.log(invoice.id); // Safe - type is Invoice
}

// AVOID
function processInvoice(invoice: Invoice) {
  // Could error if invoice is null
  console.log(invoice.id);
}
```

**Generic Types for Reusability**:
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

async function fetchInvoice(id: string): Promise<ApiResponse<Invoice>> {
  // Implementation
}
```

### Union Types vs Enums

**Use Unions for Options**:
```typescript
// GOOD - Discriminated union
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// GOOD - Enum for constants
enum ChainId {
  ArcMainnet = 185,
  ArcTestnet = 18500,
}
```

### Utility Types

**Common Utility Patterns**:
```typescript
// Partial - make all props optional
type PartialInvoice = Partial<Invoice>;

// Pick - select specific properties
type InvoicePreview = Pick<Invoice, 'id' | 'amount' | 'status'>;

// Omit - exclude properties
type InvoiceInput = Omit<Invoice, 'id' | 'createdAt'>;

// Record - key-value mapping
type ChainConfig = Record<number, Chain>;

// Readonly - immutable properties
type ReadonlyInvoice = Readonly<Invoice>;
```

## Web3 & Blockchain Standards

### Chain Configuration

**Chain Definition Pattern**:
```typescript
import { defineChain } from 'viem';

export const arcMainnet = defineChain({
  id: 185,
  name: 'Arc',
  nativeCurrency: {
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.arc.circle.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.circle.com',
    },
  },
});
```

### Wallet Integration

**wagmi Hooks Pattern**:
```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWalletConnection() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    address,
    isConnected,
    chainId,
    connect,
    disconnect,
    connectors,
  };
}
```

**Address Validation**:
```typescript
import { isAddress } from 'viem';

function validateRecipientAddress(address: string): boolean {
  if (!isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  return true;
}
```

## Forms & Validation Standards

### React Hook Form Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define schema with Zod
const invoiceSchema = z.object({
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountUSDC: z.number().positive().max(1000000),
  description: z.string().min(10).max(500),
  dueDate: z.date().min(new Date()),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

// 2. Use in component
export function InvoiceForm() {
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      amountUSDC: 0,
      description: '',
    },
  });

  async function onSubmit(data: InvoiceFormData) {
    try {
      await createInvoice(data);
      toast.success('Invoice created');
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields with form.register() */}
    </form>
  );
}
```

## Error Handling Standards

### Try-Catch Pattern

```typescript
/**
 * Always use try-catch for async operations
 */
async function createInvoice(data: InvoiceData) {
  try {
    const result = await api.invoices.create(data);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Handle validation errors
      console.error('Validation failed:', error.message);
      throw error;
    } else if (error instanceof NetworkError) {
      // Handle network errors
      console.error('Network error:', error.message);
      throw error;
    } else {
      // Handle unknown errors
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}
```

### Custom Error Classes

```typescript
/**
 * Custom error for better error handling
 */
export class InvoiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InvoiceError';
  }
}

// Usage
throw new InvoiceError(
  'Invalid recipient address',
  'INVALID_ADDRESS',
  { address: recipientAddress }
);
```

## Testing Standards (Phase 2)

### Test File Organization

```
components/
├── Button.tsx
├── Button.test.tsx        # Unit tests
├── Button.stories.tsx     # Storybook (optional)
└── Button.types.ts        # Type exports
```

### Test Pattern

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should apply primary variant by default', () => {
      const { container } = render(<Button>Test</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-blue-600');
    });
  });

  describe('interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByText('Click');
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalled();
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Click</Button>);

      const button = screen.getByText('Click');
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
```

## File Size Management

### Hard Limits

**Maximum file size**: 500 lines of code

**Refactoring Strategies**:

If a file exceeds 500 lines:
1. Extract utility functions to separate files
2. Break components into smaller focused components
3. Extract business logic to services
4. Create custom hooks for stateful logic

### Example Refactoring

```
Before:
InvoiceForm.tsx (750 lines)

After:
InvoiceForm.tsx (200 lines)     # Main component
├── InvoiceFormFields.tsx (150) # Form fields
├── InvoiceValidator.ts (120)   # Validation
└── useInvoiceForm.ts (100)     # Custom hook
```

## Import Organization

### Import Order

```typescript
// 1. React and Next.js imports
import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party imports
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// 3. Absolute imports from project
import { Button } from '@/components/ui/button';
import { useInvoice } from '@/hooks/useInvoice';
import { Invoice } from '@/types/database';

// 4. Relative imports
import { validateAddress } from '../utils';
import { InvoiceForm } from './InvoiceForm';

// 5. CSS/style imports
import styles from './Component.module.css';
```

## Accessibility Standards

### WCAG 2.1 AA Compliance

**Semantic HTML**:
```typescript
// GOOD - Semantic elements
<button type="button" onClick={handleClick}>
  Connect Wallet
</button>

// AVOID - Div as button
<div onClick={handleClick} role="button">
  Connect Wallet
</div>
```

**ARIA Attributes**:
```typescript
// Menu with ARIA
<div role="menu" aria-label="Invoice actions">
  <button role="menuitem" onClick={onEdit}>
    Edit
  </button>
  <button role="menuitem" onClick={onDelete}>
    Delete
  </button>
</div>
```

**Keyboard Navigation**:
```typescript
function Modal({ onClose }: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return <dialog open>{/* content */}</dialog>;
}
```

## Performance Standards

### Code Splitting

```typescript
// Dynamic imports for large components
const InvoiceViewer = dynamic(
  () => import('@/components/invoice/InvoiceViewer'),
  { loading: () => <Skeleton /> }
);

export function Page() {
  return <InvoiceViewer />;
}
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize component if props don't change frequently
const InvoiceRow = memo(function InvoiceRow({ invoice }: Props) {
  return <tr>{/* row content */}</tr>;
});

// Memoize expensive calculations
function InvoiceSummary({ invoices }: Props) {
  const total = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );

  // Memoize callbacks passed to children
  const handleDelete = useCallback(
    (id: string) => deleteInvoice(id),
    []
  );

  return <div>{total}</div>;
}
```

## Environment Variables

### Naming Convention

```
# Public (available in browser)
NEXT_PUBLIC_CHAIN_ID=185
NEXT_PUBLIC_RPC_URL=https://rpc.arc.circle.com

# Private (server only)
DATABASE_URL=postgresql://...
API_SECRET=secret_key_...
```

### Usage Pattern

```typescript
// Public variables
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

// Private variables (server-side only)
if (typeof window === 'undefined') {
  const dbUrl = process.env.DATABASE_URL;
}
```

## Git & Commit Standards

### Conventional Commits

**Format**:
```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature (minor version bump)
- `fix`: Bug fix (patch version bump)
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `style`: Code style changes
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

**Examples**:
```
feat(wallet): add multi-chain support for Arc Testnet

Implements EIP-6963 compliant wallet connection with support for
both Arc mainnet (185) and testnet (18500) chains.

Closes #42

---

fix(forms): resolve validation error on invoice creation

Use Zod validation resolver instead of custom validator.
Fixes race condition with async validation.

---

docs: update installation instructions for Phase 1 setup
```

## Code Review Checklist

Before submitting code for review:

- ✅ Code follows naming conventions
- ✅ Components are under 500 lines
- ✅ TypeScript types are complete
- ✅ No `any` types used (except justified cases)
- ✅ Error handling is comprehensive
- ✅ No hardcoded secrets or sensitive data
- ✅ Comments explain complex logic
- ✅ No console.logs in production code
- ✅ Tests written and passing
- ✅ Linting passes (ESLint + TypeScript)
- ✅ Accessibility standards met
- ✅ Performance optimizations applied

## ESLint Configuration

**File**: `eslint.config.mjs`

**Enforced Rules**:
- No unused variables or parameters
- No unreachable code
- No duplicate imports
- Consistent naming conventions
- Proper TypeScript usage
- Tailwind CSS class sorting

**Running Linting**:
```bash
npm run lint
```

## Troubleshooting & Common Issues

### TypeScript Errors

**"Object is possibly null"**:
```typescript
// Add type guard
if (!invoice) return null;

// Or use optional chaining
const amount = invoice?.amount;

// Or use nullish coalescing
const amount = invoice?.amount ?? 0;
```

**"Parameter '[prop]' implicitly has an 'any' type"**:
```typescript
// Add explicit type
interface Props {
  data: string;  // Add type
}

function Component({ data }: Props) {
  // Now 'data' is string type
}
```

### Runtime Errors

**"Cannot read property of undefined"**:
```typescript
// Add defensive checks
const amount = invoice?.amount || 0;

// Or use safe optional chaining
const formatted = invoice?.amount?.toFixed(2);
```

## References

- [ESLint Configuration](../eslint.config.mjs)
- [TypeScript Configuration](../tsconfig.json)
- [Next.js Best Practices](https://nextjs.org/docs)
- [React Best Practices](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

## Unresolved Questions / Future Updates

1. **Strict Component Props**: Should all components require explicit Props interface? (Current: Yes)
2. **Monorepo Support**: Will Phase 2 split into monorepo structure?
3. **Testing Framework**: Finalize testing framework choice (Jest vs Vitest)
4. **API Documentation**: Should we use OpenAPI/Swagger for API docs? (Phase 3)
5. **Database Migrations**: Version control strategy for database schema? (Phase 2)

---

**Status**: Phase 1 Code Standards Complete
**Last Verified**: 2026-01-05
