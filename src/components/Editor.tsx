"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDocumentEngine } from '@/context/DocumentContext';
import RevisionTimeline from './RevisionTimeline';
import MaintenancePane from './MaintenancePane';
import SharePanel from './SharePanel';
import PresenceRibbon from './PresenceRibbon';
import { 
  Wifi, WifiOff, RefreshCw, FileText, Bold, Italic, 
  Strikethrough, Heading1, Heading2, Undo, Redo, 
  List, ListOrdered, Sparkles, Loader2, Wand2, FileSearch, CheckCircle2 
} from 'lucide-react';
import Link from "next/link";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

// ==========================================
// 1. MAIN EXPORT (Wrapper)
// ==========================================
export default function Editor({ docId }: { docId: string }) {
  const { yDoc, isReady, role } = useDocumentEngine();

  // if (!isReady || !yDoc) {
  //   return (
  //     <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
  //       <div className="flex flex-col items-center gap-3">
  //         <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  //         <span>Hydrating document engine...</span>
  //       </div>
  //     </div>
  //   );
  // }

  // return <TipTapCanvas docId={docId} yDoc={yDoc} role={role} />;
  return <TipTapCanvas docId={docId} yDoc={yDoc} role={role} isReady={isReady} />;
}

// ==========================================
// 2. THE UI CANVAS WITH AI EXTENSIONS
// ==========================================
function TipTapCanvas({ docId, yDoc, role }: { docId: string, yDoc: Y.Doc, role: string }) {
  const [docTitle, setDocTitle] = useState<string>('Loading...');
  const [isOnline, setIsOnline] = useState(true);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 💡 AI Features UI Engine States
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMounting = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => { isMounting.current = false }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle clicking outside the AI menu to close it automatically
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAiDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 💡 OFFINE-CAPABLE TITLE CACHE
  useEffect(() => {
    const fetchMetadata = async () => {
      // 1. Pull from local cache first for instant offline rendering
      const cachedTitle = localStorage.getItem(`doc-title-${docId}`);
      if (cachedTitle) setDocTitle(cachedTitle);

      // 2. If online, fetch fresh data from the network
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/documents/${docId}`);
          if (res.ok) {
            const data = await res.json();
            const title = (Array.isArray(data) ? data[0]?.title : (data.title || data.document?.title)) || 'Untitled Document';
            
            setDocTitle(title);
            localStorage.setItem(`doc-title-${docId}`, title); // Update cache
          }
        } catch (e) {
          console.warn("Failed to fetch fresh metadata, relying on cache.");
        }
      }
    };
    fetchMetadata();
  }, [docId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentStatus = window.navigator.onLine;
      setIsOnline(currentStatus);
      if (!currentStatus) setSyncState('offline');
    }

    const handleOnline = () => { 
      setIsOnline(true); 
      setSyncState('syncing'); 
      syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 1500); 
    };
    
    const handleOffline = () => { 
      setIsOnline(false); 
      setSyncState('offline'); 
      setAiDropdownOpen(false); // Force close AI menu if connection drops
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const editor = useEditor({
    editable: role !== 'VIEWER',
    extensions: [
      StarterKit.configure({ undoRedo: false}), 
      Collaboration.configure({ document: yDoc, field: 'prosemirror' })
    ],
    editorProps: {
      attributes: { class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[800px] p-12' }
    },
    onUpdate: () => {
      if (isMounting.current) return;
      if (isOnline) {
        setSyncState('syncing');
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 800);
      }
    }
  });

  // 💡 Core AI Operation Processing Loop
  const handleAiMutation = async (promptType: 'improve' | 'summarize' | 'fix-grammar' | 'continue') => {
    if (!editor || aiLoading || !isOnline) return;

    // Grab current user highlight selection parameters
    const { from, to } = editor.state.selection;
    let selectedText = editor.state.doc.textBetween(from, to, ' ');

    // Fallback: If nothing highlighted, read the entire document view
    if (!selectedText.trim()) {
      selectedText = editor.getText();
    }

    if (!selectedText.trim()) {
      alert("Please enter or select some text first before calling AI workflows.");
      setAiDropdownOpen(false);
      return;
    }

    setAiLoading(true);
    setAiDropdownOpen(false);

    try {
     const response = await fetch(`/api/documents/${docId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, mode: promptType }),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedText = data.result;

        // Apply mutations via Tiptap transaction context
        if (promptType === 'continue') {
          editor.chain().focus().insertContentAt(to, ` ${generatedText}`).run();
        } else {
          editor.chain().focus().insertContentAt({ from, to }, generatedText).run();
        }
    } else {
        const errorData = await response.json();
        console.error("Backend rejected AI request:", errorData);
        
        if (errorData.diagnosticMessage) {
          alert(`🚨 Server Crash Details:\n${errorData.diagnosticMessage}`);
        } else {
          alert(`AI Error: ${errorData.error}`); 
        }
      }
    } catch (err) {
      console.error("Network or execution fault:", err);
    } finally {
      setAiLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-md text-slate-400 hover:text-slate-200 font-medium transition-all">
            Close Document
          </Link>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">{docTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs" role="status">
          {/* PresenceRibbon only works properly when online */}
          {isOnline && <PresenceRibbon docId={docId} />}
          
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Live Network Connection" : "Offline Storage Buffering"}
          </span>

          {/* upadted code */}
<span className="text-xs text-slate-500">
  {!isReady ? "Loading cached content..." : "Synced"}
</span>
          <span className={`flex items-center gap-1 px-2 py-1 rounded font-mono ${syncState === 'offline' ? 'text-slate-500 bg-slate-900' : 'text-slate-400 bg-slate-800'}`}>
            <RefreshCw size={12} className={syncState === 'syncing' ? 'animate-spin text-blue-400' : ''} />
            Sync state: {syncState}
          </span>
        </div>
      </header>

      {role !== 'VIEWER' && (
        <div className="flex items-center gap-1 bg-slate-900/50 border-b border-slate-800 px-4 py-1.5 shrink-0">
          <ToolbarButton icon={<Bold size={16}/>} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarButton icon={<Italic size={16}/>} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarButton icon={<Strikethrough size={16}/>} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <div className="w-px h-6 bg-slate-700 mx-2" />
          <ToolbarButton icon={<Heading1 size={16}/>} active={editor.isActive('heading', {level: 1})} onClick={() => editor.chain().focus().toggleHeading({level: 1}).run()} />
          <ToolbarButton icon={<Heading2 size={16}/>} active={editor.isActive('heading', {level: 2})} onClick={() => editor.chain().focus().toggleHeading({level: 2}).run()} />
          <div className="w-px h-6 bg-slate-700 mx-2" />
          <ToolbarButton icon={<List size={16}/>} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarButton icon={<ListOrdered size={16}/>} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          
          <div className="w-px h-6 bg-slate-700 mx-2" />

          {/* 💡 AI ACTIONS POPPING GRID CONTROLLER */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAiDropdownOpen(!aiDropdownOpen)}
              disabled={aiLoading || !isOnline}
              className={`p-2 rounded flex items-center gap-1 text-xs font-semibold shadow-sm transition-all ${
                !isOnline
                  ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : aiLoading 
                    ? 'bg-purple-950/40 border border-purple-500/20 text-purple-400 cursor-not-allowed' 
                    : 'bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600/20 text-purple-400'
              }`}
              title={!isOnline ? "Connect to network to use AI features" : "AI Actions"}
            >
              {aiLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : !isOnline ? (
                <WifiOff size={15} />
              ) : (
                <Sparkles size={15} className="animate-pulse" />
              )}
              <span>
                {!isOnline ? "AI Offline" : (aiLoading ? "AI Engineering Text..." : "Ask AI")}
              </span>
            </button>

            {aiDropdownOpen && isOnline && (
              <div className="absolute left-0 mt-1.5 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 p-1 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800/60 mb-1">
                  Selection Transformation Features
                </div>
                <AiDropdownItem 
                  icon={<Wand2 size={13} />} 
                  label="Improve Writing Polish" 
                  onClick={() => handleAiMutation('improve')} 
                />
                <AiDropdownItem 
                  icon={<CheckCircle2 size={13} />} 
                  label="Fix Spelling & Grammar" 
                  onClick={() => handleAiMutation('fix-grammar')} 
                />
                <AiDropdownItem 
                  icon={<FileSearch size={13} />} 
                  label="Summarize Selection" 
                  onClick={() => handleAiMutation('summarize')} 
                />
                <AiDropdownItem 
                  icon={<Sparkles size={13} />} 
                  label="Continue Writing..." 
                  onClick={() => handleAiMutation('continue')} 
                />
              </div>
            )}
          </div>

          <div className="flex-grow" />
          <ToolbarButton icon={<Undo size={16}/>} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
          <ToolbarButton icon={<Redo size={16}/>} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-slate-950/30 p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          <div className="max-w-[800px] mx-auto min-h-[1056px] bg-slate-900 border border-slate-800 shadow-2xl rounded-sm">
            <EditorContent editor={editor} />
          </div>
        </main>
        
        <aside className="w-80 border-l border-slate-800 bg-slate-900/40 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {/* 💡 SIDEBAR OFFLINE LOCKDOWN */}
          {isOnline ? (
            <div className="p-6 flex flex-col gap-6 h-max pb-12">
              <div className="shrink-0"><SharePanel docId={docId} /></div>
              <div className="shrink-0"><RevisionTimeline docId={docId} /></div>
              <div className="shrink-0"><MaintenancePane docId={docId} /></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-70 mt-24">
              <div className="p-4 bg-slate-800/50 rounded-full mb-4 border border-slate-700/50">
                <WifiOff size={32} className="text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Sidebar Offline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect to the internet to manage permissions, view active users, and access document history.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, active, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`p-2 rounded transition-all ${active ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:bg-slate-800'} disabled:opacity-30`}>
      {icon}
    </button>
  );
}

function AiDropdownItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-2.5 py-1.5 flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:bg-purple-600/20 rounded-md text-left transition-all"
    >
      <div className="text-purple-400 shrink-0">{icon}</div>
      <span className="truncate font-medium">{label}</span>
    </button>
  );
}