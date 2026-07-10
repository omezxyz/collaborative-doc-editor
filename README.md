# Documesh: Local-First Collaborative Editor

Documesh is a high-performance, collaborative text editor built with **Next.js**, **Hocuspocus (Yjs)**, and **TipTap**. It is engineered to be **local-first**, ensuring a zero-latency writing experience with full offline resilience.

## Architecture
- **Frontend:** Next.js (Deployed on Vercel)
- **Real-time Sync Engine:** Hocuspocus (Deployed on Render as a persistent WebSocket service)
- **Database:** PostgreSQL (via Prisma)
- **Local Storage:** IndexedDB (via `y-indexeddb`)
- **Offline Shell:** Service Workers (via `next-pwa`)

## Key Features
- **True Offline-First:** The UI shell is cached via **Service Workers**, allowing you to refresh and use the app even without an internet connection. Data is saved locally to **IndexedDB** and synced to the server once reconnected.
- **Instant Hydration:** The editor interface renders immediately upon load, decoupling the UI from network latency.
- **Real-time Collaboration:** Powered by **Yjs**, providing conflict-free multi-user editing with cursor presence.
- **AI-Powered:** Integrated with Grok for real-time text improvement, grammar fixing, and summarization.
- **Version Control:** Automated checkpointing of document states via a visual version history timeline.

## Deployment Strategy
The app utilizes a **Split-Stack Architecture**:
1. **Frontend:** Deployed to Vercel for fast edge delivery; configured as a PWA for offline asset serving.
2. **Backend:** Deployed to Render as a persistent Web Service to maintain stable WebSocket connections.
3. **Build Configuration:** Uses specific flag management to ensure full compatibility with Webpack-based PWA plugins, overriding Turbopack defaults.

## CI/CD Pipeline
Documesh employs a robust GitHub Actions pipeline to enforce code quality and prevent deployment failures.
* **Automated Checks:** Every push triggers a build that runs strict TypeScript type checking.
* **Prisma Integration:** Includes a `postinstall` hook that runs `prisma generate` automatically. 
* **Environment Handling:** The pipeline uses dummy variables for build-time generation, ensuring Prisma types are created on the CI server without needing a live database connection during the test phase.

## Database & ORM
Utilized **Prisma** as the ORM to bridge the application logic and the PostgreSQL database.
* **Type Safety:** The Prisma schema provides end-to-end type safety for all database queries.
* **Migration Strategy:** Use `npx prisma db push` for rapid prototyping or `npx prisma migrate dev` for production-ready schema versioning.
* **Type Generation:** Prisma types are automatically regenerated on install, ensuring the build pipeline is always synchronized with the database schema.

# Security & Mitigation Strategy

This document outlines the security considerations and mitigation strategies implemented in the Documesh editor to ensure system stability and data integrity.

## 1. Malicious Payload Mitigation (OOM Prevention)
To prevent malicious actors from sending massive, malformed synchronization payloads that could cause Out of Memory (OOM) errors, we implement strict input validation:
*   **Payload Size Limiting:** The server-side Hocuspocus configuration enforces a maximum size limit (1MB) on all incoming WebSocket updates. Payloads exceeding this limit are rejected immediately, and the connection is flagged.
*   **Update Validation:** Incoming updates are checked at the `onUpdate` hook stage before being merged into the document state.

## 2. Authorization & Tenant Isolation
*   **JWT-Based Authentication:** All WebSocket connections require a valid JWT token passed during the connection handshake.
*   **Role-Based Access Control (RBAC):** We distinguish between `Owner`, `Editor`, and `Viewer` roles. 
    *   **Viewers:** The server-side hooks verify the user's role; if a `Viewer` attempts to push an update, the operation is blocked.
*   **ORM Scoping:** Prisma is configured with row-level scoping, ensuring users can only fetch or modify documents they are authorized to access. We prevent cross-tenant data leaks by enforcing ownership checks on every database query.

## 3. Rate Limiting
*   While not currently enforced via a global rate-limiter, the current architecture supports per-connection throttling, ensuring that a single user cannot flood the server with excessive WebSocket events.

## 4. Contingency Plans
*   **Graceful Degradation:** In the event of a server-side error, the frontend is designed to buffer the changes locally in `IndexedDB` until the synchronization service is back online.

## Environment Variables
Ensure the following variables are configured in your environment (Local `.env` and Vercel/Render Project Settings):

| Variable | Description | Required |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for session authentication | Yes |
| `GROQ_API_KEY` | API Key for AI text features | Yes |

## Getting Started

### 1. Installation
```bash
git clone [https://github.com/omezxyz/collaborative-doc-editor.git](https://github.com/omezxyz/collaborative-doc-editor.git)
cd collaborative-doc-editor
npm install