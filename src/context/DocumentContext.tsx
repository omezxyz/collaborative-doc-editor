"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';

export type UserRole = 'OWNER' | 'EDITOR' | 'VIEWER';

interface DocContextProps {
  yDoc: Y.Doc | null;
  isReady: boolean;
  role: UserRole;
  status: 'connected' | 'disconnected' | 'connecting';
  setRole: (role: UserRole) => void;
  userName: string;
  setUserName: (name: string) => void
}

const DocContext = createContext<DocContextProps>({
  yDoc: null,
  isReady: false,
  role: 'VIEWER',
  status: 'connecting',
  setRole: () => {},
  userName: 'Anonymous',
  setUserName: () => {},
});

export const DocumentProvider = ({ docId, children }: { docId: string; children: React.ReactNode }) => {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [userName, setUserName] = useState<string>('Anonymous');

  // 1. Fetch document metadata, caching roles for offline access
  useEffect(() => {
    const initDocumentData = async () => {
      // Pull from cache first so we have immediate offline defaults
      const cachedRole = (typeof window !== 'undefined' ? localStorage.getItem(`role-${docId}`) : null) as UserRole | null;
      const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;

      try {
        if (navigator.onLine) {
          const res = await fetch(`/api/documents/${docId}`);
          const data = await res.json();
          
          const tokenRes = await fetch('/api/auth/token');
          const tokenData = await tokenRes.json();
          
          if (res.ok && tokenRes.ok) {
            setRole(data.role);
            setAuthToken(tokenData.token);
            // 💡 Update local cache for next time they go offline
            localStorage.setItem(`role-${docId}`, data.role);
            localStorage.setItem('auth-token', tokenData.token);
            return;
          }
        }
      } catch (err) {
        console.warn("Network unreachable. Relying on offline cache.", err);
      }

      // 💡 If we reach here, we are offline or the fetch failed. Rely on cache.
      setRole(cachedRole || 'VIEWER');
      setAuthToken(cachedToken || 'anonymous-fallback');
    };

    initDocumentData();
  }, [docId]);

  // 2. Setup Yjs and Hocuspocus ONLY when role and authToken are fully loaded
  useEffect(() => {
    if (!role || !authToken) return;

    const doc = new Y.Doc();
    
    // 💡 1. Initialize Local Database First
    const persistence = new IndexeddbPersistence(docId, doc);
    setIsReady(true);
    // 💡 2. UNLOCK UI INSTANTLY when local database loads (Offline Support)
    persistence.on('synced', () => {
      console.log('✅ Local IndexedDB synced');
      //  setIsReady(true);
    });

    // 💡 3. Connect to Remote Hocuspocus Server silently in background
    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234',
      name: docId,
      document: doc,
      token: authToken,
    });

    provider.on('connect', () => setStatus('connected'));
    provider.on('disconnect', () => setStatus('disconnected'));
    
    setYDoc(doc);

    return () => {
      provider.destroy();
      persistence.destroy();
      doc.destroy();
    };
  }, [role, authToken, docId]);

  // Prevent loading state flashes until context state engines hook up
  if (role === null || authToken === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Assembling auth tokens & document engine...</span>
        </div>
      </div>
    );
  }

  return (
    <DocContext.Provider value={{ yDoc, isReady, role, status, setRole, userName, setUserName }}>
      {children}
    </DocContext.Provider>
  );
};

export const useDocumentEngine = () => useContext(DocContext);