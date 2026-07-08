"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2, Calendar, ShieldAlert, UserCheck, Shield, Loader2 } from 'lucide-react';

interface DocumentMetadata {
  id: string;
  title: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  updatedAt: string;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [activeUser, setActiveUser] = useState<{ name: string; role: string } | null>(null);

  // Simulation Login seeding configuration tool
  const seedDashboardSession = async (role: string, email: string, name: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });
      if (res.ok) {
        setActiveUser({ name, role });
        await refreshDocumentCatalog();
      }
    } catch (err) {
      console.error("Dashboard auth swap failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshDocumentCatalog = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch {
      console.error("Failed to load catalog framework updates.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setNewTitle('');
        await refreshDocumentCatalog();
      }
    } catch (err) {
      console.error("Failed creating record:", err);
    }
  };

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault(); // Halt standard link routing behaviors
    if (!confirm("Are you sure you want to delete this document workspace?")) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshDocumentCatalog();
      } else {
        const data = await res.json();
        alert(data.error || "Deletion access failure");
      }
    } catch (err) {
      console.error("Deletion execution halted:", err);
    }
  };

  useEffect(() => {
    // Attempt parsing existing cookie session context on mount
    refreshDocumentCatalog();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Central Identity Control Dashboard Header block */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Multi-Tenant Engineering Canvas</h1>
            <p className="text-xs text-slate-400 mt-1">Select an identity node to load its corresponding relational document grid.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => seedDashboardSession('OWNER', 'alex@platform.com', 'Alex (Owner)')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                activeUser?.name.includes('Alex') ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <ShieldAlert size={14} /> Alex
            </button>
            <button
              onClick={() => seedDashboardSession('EDITOR', 'blake@platform.com', 'Blake (Editor)')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                activeUser?.name.includes('Blake') ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <UserCheck size={14} /> Blake
            </button>
            <button
              onClick={() => seedDashboardSession('VIEWER', 'charlie@platform.com', 'Charlie (Viewer)')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                activeUser?.name.includes('Charlie') ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Shield size={14} /> Charlie
            </button>
          </div>
        </header>

        {activeUser ? (
          <>
            {/* Creation Console panel block */}
            <form onSubmit={handleCreateDoc} className="flex gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800/80">
              <input
                type="text"
                placeholder="Enter document title name..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all"
              >
                <Plus size={16} />
                <span>Create Document</span>
              </button>
            </form>

            {/* Document Core Matrix Catalog Grid */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-600" size={32} /></div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <FileText className="mx-auto text-slate-700 mb-3" size={40} />
                <h3 className="text-sm font-semibold text-slate-400">No documents found</h3>
                <p className="text-xs text-slate-500 mt-1">Create a new workspace document above to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Link
                    href={`/documents/${doc.id}`}
                    key={doc.id}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        doc.role === 'OWNER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        doc.role === 'EDITOR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {doc.role}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                        {doc.title}
                      </h2>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-mono">
                        <Calendar size={12} />
                        <span>Edited {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {doc.role === 'OWNER' && (
                      <button
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className="absolute bottom-4 right-4 p-1.5 bg-slate-950 border border-slate-800/80 hover:border-rose-900 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Workspace Permanently"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <h2 className="text-base font-semibold text-slate-300">Authentication Required</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Please select a simulation persona at the top of the interface to mount your tenant data mesh context.</p>
          </div>
        )}
      </div>
    </div>
  );
}