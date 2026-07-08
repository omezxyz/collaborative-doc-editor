"use client";

import React, { useState } from 'react';
import { useDocumentEngine, UserRole } from '@/context/DocumentContext';
import { ShieldAlert, UserCheck, Shield } from 'lucide-react';

export default function IdentitySwitcher({ docId }: { docId: string }) {
  const { role, setRole, setUserName, userName } = useDocumentEngine();
  const [loading, setLoading] = useState(false);

  const switchPersona = async (targetRole: UserRole, email: string, name: string) => {
    setLoading(false);
    try {
      setLoading(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, docId, role: targetRole }),
      });

      if (res.ok) {
        setRole(targetRole);
        setUserName(name);
      }
    } catch (err) {
      console.error("Identity simulation swap broken:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Identity Simulation Pane</h3>
        <p className="text-xs text-slate-400 mt-0.5">Simulate different user credentials to test backend RBAC guarding.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => switchPersona('OWNER', 'owner@edtech.com', 'Alex (Owner)')}
          disabled={loading}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
            role === 'OWNER'
              ? 'bg-blue-600/10 border-blue-500 text-blue-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Owner</span>
        </button>

        <button
          onClick={() => switchPersona('EDITOR', 'editor@edtech.com', 'Blake (Editor)')}
          disabled={loading}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
            role === 'EDITOR'
              ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <UserCheck size={16} />
          <span>Editor</span>
        </button>

        <button
          onClick={() => switchPersona('VIEWER', 'viewer@edtech.com', 'Charlie (Viewer)')}
          disabled={loading}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
            role === 'VIEWER'
              ? 'bg-amber-600/10 border-amber-500 text-amber-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Shield size={16} />
          <span>Viewer</span>
        </button>
      </div>

      <div className="text-[11px] text-slate-500 font-mono bg-slate-950 px-2 py-1.5 rounded border border-slate-800/60">
        Current Actor: <span className="text-slate-300 font-semibold">{userName}</span> ({role})
      </div>
    </div>
  );
}