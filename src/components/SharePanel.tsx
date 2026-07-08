"use client";

import React, { useState, useEffect } from 'react';
import { useDocumentEngine, UserRole } from '@/context/DocumentContext';
import { Users, UserPlus, UserMinus, ShieldAlert, UserCheck, Shield } from 'lucide-react';

interface SharedUser {
  role: UserRole;
  user: { id: string; name: string | null; email: string };
}

export default function SharePanel({ docId }: { docId: string }) {
  const { role } = useDocumentEngine();
  const [aclList, setAclList] = useState<SharedUser[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('EDITOR');
  const [submitting, setSubmitting] = useState(false);

  const fetchAccessControlList = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/share`);
      if (res.ok) {
        const data = await res.json();
        setAclList(data.permissions);
      }
    } catch (err) {
      console.error("Error drawing collaboration tree:", err);
    }
  };

  useEffect(() => {
    fetchAccessControlList();
  }, [docId]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${docId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, role: targetRole })
      });

      if (res.ok) {
        setEmailInput('');
        fetchAccessControlList();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to alter authorization status");
      }
    } catch {
      alert("Network transmission error updating permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (email: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'REVOKE' })
      });
      if (res.ok) fetchAccessControlList();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Users size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-200">Access Management</h3>
      </div>

      {/* Grant Form Option restricted to Owners exclusively */}
      {role === 'OWNER' && (
        <form onSubmit={handleGrantAccess} className="flex flex-col gap-2">
          <input
            type="email"
            required
            placeholder="collaborator@company.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 font-mono"
          />
          <div className="flex gap-2 justify-between items-center">
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as UserRole)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="EDITOR">Editor (Write)</option>
              <option value="VIEWER">Viewer (Read Only)</option>
            </select>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <UserPlus size={12} />
              <span>Invite</span>
            </button>
          </div>
        </form>
      )}

      {/* List of active users with access to the document */}
      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
        {aclList.map((entry) => (
          <div key={entry.user.id} className="flex items-center justify-between bg-slate-950 border border-slate-800/60 p-2 rounded-lg text-xs">
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="text-slate-300 font-medium truncate font-mono text-[11px]">{entry.user.email}</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                {entry.role === 'OWNER' && <ShieldAlert size={10} className="text-blue-400" />}
                {entry.role === 'EDITOR' && <UserCheck size={10} className="text-emerald-400" />}
                {entry.role === 'VIEWER' && <Shield size={10} className="text-amber-400" />}
                {entry.role}
              </span>
            </div>
            
            {role === 'OWNER' && entry.role !== 'OWNER' && (
              <button
                onClick={() => handleRevokeAccess(entry.user.email)}
                className="p-1 text-slate-500 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-950 rounded-md transition-colors"
                title="Revoke Permissions"
              >
                <UserMinus size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}