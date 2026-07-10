# Local-First Collaborative Editor

A high-performance, collaborative text editor built with **Next.js**, **Hocuspocus (Yjs)**, and **TipTap**. This application is designed to be **local-first**, ensuring users can continue writing even without an internet connection.

## Architecture
- **Frontend:** Next.js (Deployed on Vercel)
- **Real-time Sync Engine:** Hocuspocus (Deployed on Render as a dedicated Node.js service)
- **Database:** PostgreSQL (via Prisma)
- **Local Storage:** IndexedDB (via y-indexeddb)

## Key Features
- **Offline Resilience:** Auto-saves to IndexedDB; syncs with the remote server when back online.
- **Real-time Collaboration:** Powered by Yjs, enabling multi-user editing with cursor presence.
- **AI-Powered:** Integrated with Grok for real-time text improvement, grammar fixing, and summarization.
- **Version Control:** Automated checkpointing of document states via a version history timeline.

## Deployment Strategy
The app uses a **Split-Stack Architecture**:
1. **Frontend:** Deployed to Vercel for fast edge delivery.
2. **Backend:** Deployed to Render as a persistent Web Service to maintain active WebSocket connections for collaborative editing.

## Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your environment variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_WS_URL`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
4. Run the development server: `npm run dev`
5. Run the sync server: `npm run sync-server`