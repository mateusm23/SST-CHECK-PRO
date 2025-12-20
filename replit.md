# SST Check Pro

## Overview

SST Check Pro is a digital safety inspection checklist application for workplace safety in Brazil. It enables safety professionals to conduct inspections on construction sites, document non-conformities with photos, generate PDF reports, and create AI-powered action plans based on Brazilian regulatory standards (NRs - Normas Regulamentadoras).

The application follows a freemium SaaS model with subscription tiers that control inspection limits, logo uploads, and advanced features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful endpoints defined in shared route schemas
- **Authentication**: Replit Auth with OpenID Connect (Passport.js strategy)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` for shared models, `shared/models/` for domain-specific models
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync

### Key Data Models
- **Users/Sessions**: Mandatory tables for Replit Auth
- **Subscription Plans/User Subscriptions**: SaaS billing tiers with Stripe integration
- **Companies**: Client companies with branding (logo upload)
- **Inspections**: Safety inspection records with checklist responses
- **Inspection Photos**: Photo evidence attached to inspections
- **Action Plans**: Remediation tasks generated from non-conformities
- **NR Checklists**: Regulatory checklist templates

### AI Integration
- **Provider**: Google Gemini via Replit AI Integrations
- **Models Used**: gemini-2.5-flash (fast), gemini-2.5-pro (reasoning), gemini-2.5-flash-image (images)
- **Features**: AI-generated action plans from inspection data, chat functionality, image generation
- **Batch Processing**: Built-in utilities for rate-limited concurrent AI requests

### Payments
- **Provider**: Stripe via Replit Connectors
- **Features**: Subscription checkout, webhook processing, customer management
- **Schema**: Separate `stripe` schema namespace for Stripe sync tables

## External Dependencies

### Third-Party Services
- **Replit Auth**: User authentication via OpenID Connect
- **Replit AI Integrations**: Gemini API access without separate API keys
- **Stripe**: Payment processing and subscription management

### Key NPM Packages
- **Database**: `pg`, `drizzle-orm`, `drizzle-zod`, `connect-pg-simple`
- **Authentication**: `passport`, `openid-client`, `express-session`
- **Payments**: `stripe`, `stripe-replit-sync`
- **AI**: `@google/genai`
- **PDF Generation**: `html2canvas`, `jspdf` (client-side)
- **UI**: Full Radix UI component suite, `tailwindcss`, `class-variance-authority`

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `AI_INTEGRATIONS_GEMINI_API_KEY`: Gemini API key from Replit AI Integrations
- `AI_INTEGRATIONS_GEMINI_BASE_URL`: Gemini base URL from Replit AI Integrations
- Stripe credentials managed via Replit Connectors