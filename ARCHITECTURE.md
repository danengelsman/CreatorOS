# CreatorOS Architecture Diagram

This document provides a comprehensive overview of the CreatorOS system architecture, including data flow, component relationships, and deployment topology.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer (React + Vite)"
        A[main.tsx] --> B[App.tsx]
        B --> C[Custom Router]
        C --> D[46 Lazy-Loaded Views]
        D --> E[Components]
        D --> F[Services]
        E --> G[Firebase Client SDK]
        F --> H[apiClient]
    end

    subgraph "API Layer (Express + Node)"
        I[security-entry.ts<br/>Dev Entry] --> J[server.ts]
        K[api/_server.js<br/>Vercel Entry] --> J
        J --> L[Express Routes]
        L --> M[Authentication Middleware]
        L --> N[Rate Limiting]
        L --> O[Quota Ledger]
        L --> P[Gemini AI Service]
        L --> Q[OAuth Handlers]
    end

    subgraph "Data Layer"
        R[Firebase Firestore<br/>Client Store]
        S[SQLite (better-sqlite3)<br/>Server Store<br/>Ephemeral on Vercel]
        T[PostgreSQL + Drizzle<br/>Unused Scaffolding]
    end

    subgraph "External Services"
        U[Firebase Auth]
        V[Gemini API]
        W[Google OAuth]
        X[TikTok OAuth]
    end

    H --> L
    M --> U
    P --> V
    Q --> W
    Q --> X
    J --> S
    G --> R
    G --> U
```

## Frontend Architecture

```mermaid
graph TB
    subgraph "Entry Point"
        A[main.tsx] --> B[StrictMode + ErrorBoundary]
        B --> C[initErrorMonitoring]
        C --> D[App.tsx]
    end

    subgraph "App Core"
        D --> E[Auth Gate]
        E --> F{User Authenticated?}
        F -->|No| G[Login/Landing]
        F -->|Yes| H[Main App Layout]
    end

    subgraph "Routing System"
        H --> I[Custom pushState Router]
        I --> J[Navigation Registry]
        J --> K[46 Lazy-Loaded Views]
    end

    subgraph "State Management"
        H --> L[13 useState Hooks]
        L --> M[Props Drilling<br/>14 levels deep]
        M --> N[Firebase Firestore Snapshots]
        N --> O[Full Tree Re-render]
    end

    subgraph "Key Views"
        K --> P[Dashboard]
        K --> Q[Content Studio]
        K --> R[Video Studio]
        K --> S[Scene Planner]
        K --> T[Retention Lab]
        K --> U[Branding Engine]
        K --> V[Creator Hub]
        K --> W[Community]
    end

    subgraph "API Client"
        D --> X[apiClient.ts]
        X --> Y[Authorization: Bearer Token]
        X --> Z[401 → Force Refresh → Retry]
        X --> AA[Second 401 → AuthExpiredError]
        X --> AB[429 → RateLimitError]
    end
```

## Backend Architecture

```mermaid
graph TB
    subgraph "Entry Points"
        A[security-entry.ts<br/>Development] --> B[Monkey-patch Express.post]
        B --> C[server.ts]
        D[api/_server.js<br/>Vercel] --> C
    end

    subgraph "server.ts Core"
        C --> E[Express App]
        E --> F[CORS Middleware]
        F --> G[Body Parser]
        G --> H[Cookie Parser]
    end

    subgraph "Security Layers"
        H --> I[authenticateUser<br/>Firebase Token Verification]
        I --> J[protectAIRoute<br/>AI-specific Protection]
        J --> K[Per-Minute Rate Limiting<br/>In-Memory Map]
        K --> L[Quota Ledger<br/>Daily Token Budget]
        L --> M[Model Allowlist]
        M --> N[Payload Guards<br/>Video Size, URI Validation]
    end

    subgraph "API Routes"
        N --> O[/api/user]
        N --> P[/api/brand]
        N --> Q[/api/content]
        N --> R[/api/analytics]
        N --> S[/api/habits]
        N --> T[/api/gemini/*]
        N --> U[/api/auth/*]
    end

    subgraph "AI Services"
        T --> V[generate]
        T --> W[analyze-video]
        T --> X[generate-image]
        T --> Y[generate-video]
        T --> Z[video-status]
        T --> AA[video-download]
    end

    subgraph "OAuth Handlers"
        U --> AB[Google OAuth]
        U --> AC[TikTok OAuth]
        AB --> AD[oauth-state.ts<br/>Signed State]
        AC --> AD
        AB --> AE[crypto.ts<br/>Token Encryption]
        AC --> AE
    end
```

## Data Layer Architecture

```mermaid
graph TB
    subgraph "Client Side (Firebase)"
        A[Firebase Client SDK] --> B[Firestore]
        B --> C[Users Collection]
        B --> D[Brands Collection]
        B --> E[Content Collection]
        B --> F[Analytics Collection]
        B --> G[Preferences Collection]
        B --> H[Creator Journey State]
    end

    subgraph "Server Side (SQLite)"
        I[better-sqlite3] --> J[users Table]
        I --> K[brands Table]
        I --> L[content Table]
        I --> M[analytics Table]
        I --> N[streaks Table]
        I --> O[challenges Table]
        I --> P[user_accounts Table<br/>OAuth Tokens]
        I --> Q[ai_usage_ledger Table<br/>Quota Tracking]
    end

    subgraph "Unused Scaffolding"
        R[PostgreSQL] --> S[Drizzle ORM]
        S --> T[schema.ts]
    end

    subgraph "Deployment Issue"
        U[Vercel Serverless] --> V[/tmp/creator_os.db]
        V --> W[Ephemeral Storage<br/>Data Loss Between Invocations]
    end

    I --> U
    style W fill:#ff6b6b
```

## AI Integration Flow

```mermaid
sequenceDiagram
    participant UI as React Component
    participant SVC as gemini.ts Service
    participant API as apiClient
    participant SRV as server.ts
    participant AI as Gemini API
    participant QL as Quota Ledger

    UI->>SVC: generateBrandKit(userInput)
    SVC->>API: apiFetch('/api/gemini/generate')
    API->>API: Attach Bearer Token
    API->>SRV: POST /api/gemini/generate

    SRV->>SRV: protectAIRoute
    SRV->>SRV: Verify Firebase Token
    SRV->>SRV: Check Per-Minute Rate Limit
    SRV->>QL: Check Daily Quota
    QL-->>SRV: {allowed, usedToday, dailyBudget}

    alt Over Budget
        SRV-->>API: 429 Rate Limit Exceeded
        API-->>SVC: RateLimitError
        SVC-->>UI: Error
    else Within Budget
        SRV->>AI: generateContent()
        AI-->>SRV: Response + usageMetadata
        SRV->>QL: record(tokensUsed)
        SRV-->>API: 200 OK + Response
        API-->>SVC: JSON Response
        SVC-->>UI: Brand Kit Data
    end
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React App
    participant FC as Firebase Client
    participant AC as apiClient
    participant SRV as server.ts
    participant FA as Firebase Admin

    U->>UI: Click "Sign in with Google"
    UI->>FC: signInWithPopup()
    FC->>FC: Popup Authentication
    FC-->>UI: User Credential
    UI->>UI: onAuthStateChanged

    UI->>AC: apiFetch('/api/user')
    AC->>AC: Attach Bearer Token
    AC->>SRV: GET /api/user

    SRV->>FA: verifyIdToken(token)
    FA-->>SRV: Decoded Token
    SRV->>SRV: Check user in SQLite
    SRV-->>AC: 200 OK + User Data
    AC-->>UI: User Data

    alt Token Expired (401)
        SRV-->>AC: 401 Unauthorized
        AC->>FC: getIdToken(true)
        FC-->>AC: Refreshed Token
        AC->>SRV: Retry with New Token
        SRV-->>AC: 200 OK
    end

    alt Second 401
        SRV-->>AC: 401 Unauthorized
        AC->>AC: Dispatch AUTH_EXPIRED_EVENT
        AC-->>UI: AuthExpiredError
        UI->>FC: logout()
        UI->>UI: Redirect to Login
    end
```

## Deployment Topology

```mermaid
graph TB
    subgraph "Development"
        A[npm run dev] --> B[tsx security-entry.ts]
        B --> C[Monkey-patch Express.post]
        C --> D[server.ts]
        D --> E[Vite Dev Server<br/>HMR]
        D --> F[SQLite: creator_os.db<br/>Persistent]
    end

    subgraph "Vercel Production"
        G[vercel.json] --> H[buildCommand]
        H --> I[npm run build && npm run build:server]
        I --> J[dist/server.js<br/>Client Bundle]
        I --> K[api/_server.js<br/>Server Bundle]
        L[API Routes] --> K
        M[Static Assets] --> J
        K --> N[SQLite: /tmp/creator_os.db<br/>Ephemeral!]
    end

    subgraph "Security Warning"
        O[security-entry.ts] -->|Not Used in Vercel| P[Bypassed]
        Q[Intrinsic Protection in server.ts] -->|Applied| R[Works]
        style P fill:#ff6b6b
        style R fill:#51cf66
    end

    subgraph "Environment Variables"
        S[GEMINI_API_KEY]
        T[FIREBASE_SERVICE_ACCOUNT]
        U[TOKEN_ENCRYPTION_KEY]
        V[OAUTH_STATE_SECRET]
        W[GOOGLE_CLIENT_ID/SECRET]
        X[TIKTOK_CLIENT_KEY/SECRET]
    end

    F --> S
    N --> S
    D --> T
    K --> T
```

## Key Services Diagram

```mermaid
graph TB
    subgraph "AI Services (src/services/gemini.ts)"
        A[generateBrandKit]
        B[generateContentIdeas]
        C[scoreContent]
        D[remixContent]
        E[optimizeSearchTerms]
        F[quickPolish]
        G[repurposeContent]
        H[generateSpeech]
        I[transcribeAudio]
        J[generateVideo]
        K[getOperationStatus]
        L[fetchVideoDownloadResponse]
        M[generateSmartSuggestions]
        N[generateScenePlan]
    end

    subgraph "Journey Services (src/services/creatorJourney.ts)"
        O[recordJourneyEvent]
        P[initialize]
        Q[skip_idea]
        R[start_draft]
        S[save_draft]
    end

    subgraph "Infrastructure (src/server/)"
        T[quotaLedger.ts<br/>Daily AI Budget]
        U[oauth-state.ts<br/>OAuth State Management]
        V[crypto.ts<br/>Token Encryption]
    end

    subgraph "Client Utilities (src/lib/)"
        W[apiClient.ts<br/>Unified Fetch]
        X[logger.ts<br/>Error Monitoring]
        Y[friendlyError.ts<br/>Error Messages]
        Z[utils.ts<br/>Helper Functions]
    end

    A --> W
    B --> W
    C --> W
    D --> W
    J --> T
    K --> T
    R --> O
    S --> O
```

## Component Hierarchy (Sample)

```mermaid
graph TB
    A[App.tsx] --> B[Dashboard]
    A --> C[ContentStudio]
    A --> D[VideoStudio]
    A --> E[ScenePlanner]

    B --> F[CalendarView]
    B --> G[DailyGoalTracker]
    B --> H[FirstDollarDashboard]

    C --> I[ContentEditorView]
    C --> J[AIToolPanel]
    C --> K[ContentRepurposer]

    D --> L[VideoScriptEditor]
    D --> M[VideoGenerationPlayer]
    D --> N[CustomVideoPlayer]

    E --> O[AINicheCoach]
    E --> P[VideoIdeas]
    E --> Q[PerfectPromptCopilot]
```

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication"
        A[Firebase Auth] --> B[ID Token]
        B --> C[Bearer Header]
        C --> D[Server Verification]
        D --> E[Firebase Admin SDK]
    end

    subgraph "Rate Limiting"
        F[Per-Minute Limit] --> G[In-Memory Map]
        G --> H[Route-Specific Limits]
        H --> I[429 + Retry-After]
    end

    subgraph "Quota Management"
        J[Per-User Daily Budget] --> K[SQLite Ledger]
        K --> L[Token Accounting]
        L --> M[Usage Metadata]
        M --> N[429 at Midnight Reset]
    end

    subgraph "Input Validation"
        O[Model Allowlist] --> P[whitelist: gemini-3.8-flash, etc.]
        Q[Video Size Limit] --> R[Max 50MB]
        S[URI Validation] --> T[Google-hosted only]
    end

    subgraph "OAuth Security"
        U[OAuth State] --> V[Signed HMAC]
        W[Token Storage] --> X[Encrypted at Rest]
    end

    D --> F
    F --> J
    J --> O
    O --> U
```

## Known Issues & Technical Debt

Based on the APP_EVALUATION.md:

1. **Critical: Unauthenticated Gemini Abuse in Production**
   - Vercel deploys server.ts directly without security-entry.ts wrapper
   - Gemini routes may lack intrinsic protection in some paths
   - Fix: Move all auth + rate limiting into server.ts route handlers

2. **High: Server Data Loss on Vercel**
   - SQLite at /tmp/creator_os.db is ephemeral
   - Server writes vanish between invocations
   - Split-brain: Client uses Firestore, Server uses SQLite
   - Fix: Converge on Firestore for all persistence

3. **High: OAuth Account-Linking Forgery**
   - OAuth state = userId without session binding
   - Tokens stored plaintext in SQLite
   - Fix: Signed, session-bound state; encrypt tokens

4. **Medium: TypeScript Strict Mode Off**
   - 157 `any` types in codebase
   - AI payloads unvalidated
   - Fix: Enable strict mode incrementally; add zod schemas

5. **Medium: Navigation Ephemeral**
   - Tabs aren't URLs
   - No deep links
   - Back button doesn't restore state
   - Fix: Implement proper router with URL-based routing

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Motion (framer-motion) |
| Backend | Node.js, Express, TypeScript |
| Auth | Firebase Authentication (Client + Admin SDK) |
| Database | Firebase Firestore (Client), SQLite (Server - ephemeral) |
| AI | Google GenAI SDK (Gemini 3.8-flash, 3.1-flash-lite) |
| OAuth | Google OAuth2, TikTok OAuth |
| Deployment | Vercel (serverless functions) |
| Icons | Phosphor Icons, Lucide React |
| Charts | Recharts |

## File Structure

```
CreatorOS_Repo/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component + router
│   ├── firebase.ts              # Firebase client config
│   ├── db.ts                    # SQLite server database
│   ├── components/              # 46 React components
│   │   ├── Dashboard.tsx
│   │   ├── ContentStudio.tsx
│   │   ├── VideoStudio.tsx
│   │   ├── ScenePlanner.tsx
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── gemini.ts           # AI functions
│   │   ├── creatorJourney.ts   # Onboarding tracking
│   │   └── dailyGoals.ts
│   ├── lib/                     # Utilities
│   │   ├── apiClient.ts        # Unified fetch
│   │   ├── logger.ts           # Error monitoring
│   │   └── utils.ts
│   ├── server/                  # Server-side modules
│   │   ├── quotaLedger.ts      # AI quota tracking
│   │   ├── oauth-state.ts      # OAuth state management
│   │   └── crypto.ts           # Token encryption
│   └── hooks/                   # React hooks
│       └── useVideoGeneration.ts
├── server.ts                    # Express server
├── security-entry.ts            # Dev security wrapper
├── api/_server.js              # Vercel server bundle
├── vercel.json                 # Vercel config
├── firebase-applet-config.json # Firebase config
└── package.json                # Dependencies
```

## Data Flow Summary

1. **User Action** → React Component
2. **Component** → Service Function (gemini.ts, etc.)
3. **Service** → apiClient (attaches Bearer token)
4. **apiClient** → Express Route (/api/*)
5. **Express** → Firebase Admin (verify token)
6. **Express** → Quota Ledger (check budget)
7. **Express** → Gemini API (AI generation)
8. **Gemini** → Express (response + usage)
9. **Express** → Quota Ledger (record usage)
10. **Express** → apiClient (response)
11. **apiClient** → Service (parsed data)
12. **Service** → Component (state update)
13. **Component** → Firebase Firestore (persist)
