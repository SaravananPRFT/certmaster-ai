# Authentication Plan — CertMasterAI
**Date:** 2026-08-12

---

## User Roles

| Role | Access | Persistence |
|------|--------|-------------|
| Guest | Browse exams, attempt 3 free questions, no history | Session only |
| Student | Full exam access, progress tracking, history | Full persistence |
| Admin | Question review, index management, analytics | Full + admin routes |

---

## Architecture Decision

**Chosen approach: JWT-based local auth + optional Microsoft SSO (Phase 2)**

Rationale:
- No Azure AD dependency for local dev / demo
- Works without external services
- Microsoft SSO added via `next-auth` in Phase 2 without changing the auth model

---

## Frontend Auth Flow

```
User visits app
      │
      ▼
  [AuthGuard] checks localStorage JWT
      │
   ┌──┴──────────────────┐
   │                     │
No token             Valid token
   │                     │
   ▼                     ▼
/login             Decode role → context
   │
   ├─ Guest → GuestSession (3-question limit)
   ├─ Email/Password → POST /api/v1/auth/login → JWT
   └─ Microsoft SSO → (Phase 2)
```

---

## Pages Required

| Route | Description |
|-------|-------------|
| `/login` | Email + password + Guest option |
| `/register` | Sign up form |
| `/forgot-password` | Email input → magic link |
| `/reset-password` | Token + new password |
| `/verify-email` | Token from email link |

---

## Backend Endpoints

```
POST /api/v1/auth/register      — create account
POST /api/v1/auth/login         — returns {access_token, refresh_token, user}
POST /api/v1/auth/refresh        — rotate tokens
POST /api/v1/auth/logout         — invalidate refresh token
POST /api/v1/auth/forgot-password — send reset email
POST /api/v1/auth/reset-password  — consume token + set new password
GET  /api/v1/auth/me             — current user profile
```

---

## User Schema

```typescript
interface User {
  id: string;                    // UUID
  email: string;
  displayName: string;
  role: "guest" | "student" | "admin";
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  preferences: {
    theme: "light" | "dark" | "system";
    defaultExam?: string;
  };
  stats: {
    totalSessions: number;
    totalQuestions: number;
    avgScore: number;
  };
}
```

---

## Session Management

- Access token: JWT, 8-hour TTL, stored in `localStorage`
- Refresh token: 30-day TTL, stored in `httpOnly cookie`
- Guest session: No token, `sessionStorage` only, auto-expires on tab close
- Remember Me: Extends refresh token to 30 days (default 24h)

---

## Authorization Strategy

**Frontend:** `AuthContext` wraps the app. `useAuth()` hook provides user + role.  
Route guards via middleware in `middleware.ts` (Next.js App Router).

```
/admin/*    → role === "admin" required
/dashboard  → role !== "guest" required  
/exam/*     → guest allowed (limited)
/exams/*    → guest allowed
```

**Backend:** FastAPI dependency `get_current_user(token: str = Depends(oauth2_scheme))`.  
Admin routes use additional `require_admin` dependency.

---

## Phase 2 — Microsoft SSO (Future)

Add `next-auth` with Azure AD provider:
```
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
```
Maps Azure AD roles (`CertMasterAdmin`, `CertMasterStudent`) to app roles.

---

## Implementation Priority

1. Login page + Guest mode (unblocks demo)
2. Register + JWT backend
3. AuthContext + route guards
4. Forgot/reset password
5. Microsoft SSO (Phase 2)
