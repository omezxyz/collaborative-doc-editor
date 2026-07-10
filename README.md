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
- **AI-Powered:** Integrated with Groq for real-time text improvement, grammar fixing, and summarization.
- **Version Control:** Automated checkpointing of document states via a visual version history timeline.

## Deployment Strategy
The app utilizes a **Split-Stack Architecture**:
1. **Frontend:** Deployed to Vercel for fast edge delivery; configured as a PWA for offline asset serving.
2. **Backend:** Deployed to Render as a persistent Web Service to maintain stable WebSocket connections.
3. **Build Configuration:** Uses `--no-turbopack` to ensure full compatibility with Webpack-based PWA plugins.

## Getting Started
1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install