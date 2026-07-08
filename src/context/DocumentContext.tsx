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
  userName: string; // <-- ADD THIS
  setUserName: (name: string) => void
}

const DocContext = createContext<DocContextProps>({
  yDoc: null,
  isReady: false,
  role: 'VIEWER',
  status: 'connecting',
  setRole: () => {},
  userName: 'Anonymous', // <-- ADD THIS
  setUserName: () => {},
});

export const DocumentProvider = ({ docId, children }: { docId: string; children: React.ReactNode }) => {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [userName, setUserName] = useState<string>('Anonymous');
useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/documents/${docId}/sync`);
        const data = await res.json();
        
        // ADD THIS LOG to verify what the server thinks you are
        console.log("DEBUG: Server returned role:", data.role);
        
        if (res.ok && data.role) {
          setRole(data.role);
        } else {
          setRole('VIEWER');
        }
      } catch (err) {
        console.error("DEBUG: Failed to fetch role:", err);
        setRole('VIEWER');
      }
    };
    fetchRole();
  }, [docId]);

  useEffect(() => {
    if (!role) return;

    const doc = new Y.Doc();
    const persistence = new IndexeddbPersistence(docId, doc);

    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234',
      name: docId,
      document: doc,
      token: role,
    });

    provider.on('connect', () => setStatus('connected'));
    provider.on('disconnect', () => setStatus('disconnected'));
    provider.on('synced', () => setIsReady(true));

    setYDoc(doc);

    return () => {
      provider.destroy();
      persistence.destroy();
      doc.destroy();
    };
  }, [role, docId]);

  if (role === null) return <div className="p-4 text-white">Loading document...</div>;

 return (
    <DocContext.Provider value={{ yDoc, isReady, role, status, setRole, userName, setUserName }}>
      {children}
    </DocContext.Provider>
  );
};

export const useDocumentEngine = () => useContext(DocContext);