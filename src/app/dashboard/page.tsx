"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Plus, Trash2, Calendar, Loader2, LogOut, User, AlertTriangle, WifiOff } from 'lucide-react';

interface DocumentMetadata {
  id: string;
  title: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [activeUser, setActiveUser] = useState<{ name: string; email: string } | null>(null);

  // 💡 Local-First Network States
  const [isOnline, setIsOnline] = useState(true);

  // Custom Modal Core Engine States
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 💡 1. Track Network Connectivity
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const fetchUserProfile = async () => {
    // 💡 Pull from cache immediately for instant offline rendering
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('dashboard-user') : null;
    if (cachedUser) setActiveUser(JSON.parse(cachedUser));

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setActiveUser(data.user);
          localStorage.setItem('dashboard-user', JSON.stringify(data.user)); // Update cache
        }
      } catch (err) {
        console.warn("Network offline: using cached user session.");
      }
    }
  };

  const refreshDocumentCatalog = async () => {
    // 💡 Pull from cache immediately
    const cachedCatalog = typeof window !== 'undefined' ? localStorage.getItem('dashboard-catalog') : null;
    if (cachedCatalog) {
      setDocuments(JSON.parse(cachedCatalog));
      setLoading(false); // Unlock UI instantly if we have cached data
    }

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents);
          localStorage.setItem('dashboard-catalog', JSON.stringify(data.documents)); // Update cache
        }
      } catch (err) {
        console.warn("Network offline: using cached document catalog.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // Ensure loading stops even if offline with no cache
    }
  };

const [isCreating, setIsCreating] = useState(false);

const handleCreateDoc = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newTitle.trim() || !isOnline) return;

  setIsCreating(true);
  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });

    const data = await res.json();

    // 💡 FIX: Access the id through data.document.id
    if (res.ok && data?.document?.id) {
      const newDoc = { 
        id: data.document.id, 
        title: data.document.title, 
        role: 'OWNER', 
        updatedAt: data.document.updatedAt 
      };
      
      // Update local catalog
      const updatedCatalog = [newDoc, ...documents];
      localStorage.setItem('dashboard-catalog', JSON.stringify(updatedCatalog));
      
      // Cache metadata for Editor
      localStorage.setItem(`doc-meta-${newDoc.id}`, JSON.stringify(newDoc));
      
      // Navigate to the correct ID
      router.push(`/documents/${newDoc.id}`);
    } else {
      console.error("API response format unexpected:", data);
      setIsCreating(false);
    }
  } catch (err) {
    console.error("Failed creating record:", err);
    setIsCreating(false);
  }
};

  const openDeleteModal = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!isOnline) {
      alert("You must be connected to the internet to delete workspaces.");
      return;
    }
    setDeleteError(null);
    setDeleteTarget({ id, title });
  };

  const executeWorkspaceDeletion = async () => {
    if (!deleteTarget || !isOnline) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshDocumentCatalog();
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Deletion access failure occurred.");
      }
    } catch (err) {
      setDeleteError("Network error executing workspace demolition.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.clear(); // 💡 Clear caches on explicit logout
        router.push('/');
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      await fetchUserProfile();
      await refreshDocumentCatalog();
    };
    initializeDashboard();
  }, []);

  if (loading && !activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Modern Authenticated Header block */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
              Collaborative Document Editor
              {!isOnline && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                  <WifiOff size={12} /> Offline Mode
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage and collaborate across your isolated network document grid.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl p-2 pl-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <User size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {activeUser?.name || 'Loading user...'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {activeUser?.email}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 rounded-lg transition-all"
              title="Sign Out of Session"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Creation Console panel block */}
        <form onSubmit={handleCreateDoc} className={`flex gap-3 bg-slate-900 p-4 rounded-xl border ${!isOnline ? 'border-rose-900/50 opacity-80' : 'border-slate-800/80'}`}>
          <input
            type="text"
            disabled={!isOnline}
            placeholder={isOnline ? "Enter document title name..." : "Connection lost. Reconnect to create documents."}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        <button
  type="submit"
  disabled={!isOnline || !newTitle.trim() || isCreating}
  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
    isOnline 
      ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50' 
      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
  }`}
>
  {isCreating ? (
    <Loader2 size={16} className="animate-spin" />
  ) : isOnline ? (
    <Plus size={16} />
  ) : (
    <WifiOff size={16} />
  )}
  <span>{isCreating ? 'Creating...' : isOnline ? 'Create Document' : 'Offline'}</span>
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
                    <span>Created {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Only render delete button if online AND owner */}
                {doc.role === 'OWNER' && isOnline && (
                  <button
                    onClick={(e) => openDeleteModal(e, doc.id, doc.title)}
                    className="absolute bottom-4 right-4 p-1.5 bg-slate-950 border border-slate-800/80 hover:border-rose-900 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Workspace Permanently"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                {doc.role === 'OWNER' && !isOnline && (
                   <div className="absolute bottom-4 right-4 p-1.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" title="Must be online to delete">
                     <WifiOff size={13} />
                   </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Operations Console Interface Modal */}
      {deleteTarget !== null && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in"
          onClick={() => { if (!isDeleting) setDeleteTarget(null); }} 
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl shrink-0 border border-rose-500/10">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-slate-100">Delete Document Workspace</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you absolutely sure you want to permanently delete <span className="font-semibold text-slate-200 italic font-mono">"{deleteTarget.title}"</span>? All real-time node branches, synchronization logs, and historical version data will be permanently wiped.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-lg leading-snug">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3 mt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800/80 text-slate-300 font-medium text-xs rounded-lg transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeWorkspaceDeletion}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 tracking-wide"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}