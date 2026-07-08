// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { useDocumentEngine } from '@/context/DocumentContext';
// import RevisionTimeline from './RevisionTimeline';
// import MaintenancePane from './MaintenancePane';
// import SharePanel from './SharePanel';
// import PresenceRibbon from './PresenceRibbon';
// import { Wifi, WifiOff, RefreshCw, Lock, FileText } from 'lucide-react';
// import Link from "next/link";

// export default function Editor({ docId }: { docId: string }) {
//   const { yDoc, isReady, role } = useDocumentEngine();
//   const [textValue, setTextValue] = useState('');

//   // 1. State for Document Metadata
//   const [docTitle, setDocTitle] = useState<string>('Loading...');

//   // Network tracking states
//   const [isOnline, setIsOnline] = useState(true);
//   const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
//   const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // 2. Fetch Document Metadata (Title, etc.)
//   useEffect(() => {
//     const fetchMetadata = async () => {
//       try {
//         const res = await fetch(`/api/documents/${docId}`);
//         if (res.ok) {
//           const data = await res.json();

//           // console.log("Database Response for Document:", data);

//           let fetchedTitle = null;

//           if (Array.isArray(data) && data.length > 0) {
//             fetchedTitle = data[0].title; // If it returned an array
//           } else {
//             fetchedTitle = data.title || data.document?.title || data.data?.title; // If it's an object
//           }

//           setDocTitle(fetchedTitle || 'Untitled Document');
//         } else {
//           setDocTitle('Document');
//         }
//       } catch (error) {
//         console.error("Failed to fetch document metadata:", error);
//         setDocTitle('Document');
//       }
//     };

//     fetchMetadata();
//   }, [docId]);

//   // Network listener effect
//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       setIsOnline(navigator.onLine);
//       setSyncState(navigator.onLine ? 'synced' : 'offline');
//     }

//     const handleOnline = () => {
//       setIsOnline(true);
//       setSyncState('syncing');
//       syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 1500);
//     };

//     const handleOffline = () => {
//       setIsOnline(false);
//       setSyncState('offline');
//       if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
//     };

//     window.addEventListener('online', handleOnline);
//     window.addEventListener('offline', handleOffline);

//     return () => {
//       window.removeEventListener('online', handleOnline);
//       window.removeEventListener('offline', handleOffline);
//       if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
//     };
//   }, []);

//   useEffect(() => {
//     if (!isReady || !yDoc) return;

//     const yText = yDoc.getText('content');
//     setTextValue(yText.toString());

//     const syncLocalState = () => {
//       setTextValue(yText.toString());
//     };
//     yText.observe(syncLocalState);

//     return () => {
//       yText.unobserve(syncLocalState);
//     };
//   }, [yDoc, isReady]);

//   const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     if (!yDoc || role === 'VIEWER') return;
//     const yText = yDoc.getText('content');

//     yDoc.transact(() => {
//       yText.delete(0, yText.length);
//       yText.insert(0, e.target.value);
//     });

//     if (isOnline) {
//       setSyncState('syncing');
//       if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
//       syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 800);
//     }
//   };

//   if (!isReady || !yDoc) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//           <span>Replaying historical document delta logs...</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
//       <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
//         <div className="flex items-center gap-4">
//           <Link
//             href="/dashboard"
//             className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-md text-slate-400 hover:text-slate-200 font-medium transition-all"
//           >
//             ← Dashboard
//           </Link>

//           {/* 3. Replaced hardcoded text with dynamic title */}
//           <div className="flex items-center gap-2">
//             <FileText size={16} className="text-blue-400" />
//             <h2 className="text-sm font-semibold tracking-wide text-slate-200">
//               {docTitle}
//             </h2>
//           </div>
//         </div>

//         <div className="flex items-center gap-4 text-xs" role="status">
//           <PresenceRibbon docId={docId} />

//           <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
//             }`}>
//             {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
//             {isOnline ? "Live Network Connection" : "Offline Storage Buffering"}
//           </span>

//           <span className={`flex items-center gap-1 px-2 py-1 rounded font-mono ${syncState === 'offline' ? 'text-slate-500 bg-slate-900' : 'text-slate-400 bg-slate-800'
//             }`}>
//             <RefreshCw size={12} className={syncState === 'syncing' ? 'animate-spin text-blue-400' : ''} />
//             Sync state: {syncState}
//           </span>
//         </div>
//       </header>

//       <div className="flex flex-1 overflow-hidden">
//         <main className="flex-1 p-6 flex flex-col gap-4">
//           <div className="relative flex-1">
//             <textarea
//               className={`w-full h-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-300 font-mono text-sm leading-relaxed resize-none ${role === 'VIEWER' ? 'opacity-60 cursor-not-allowed select-none bg-slate-900/40' : ''
//                 }`}
//               value={textValue}
//               onChange={handleInput}
//               disabled={role === 'VIEWER'}
//               placeholder={role === 'VIEWER' ? "Read-Only Mode: You don't have write privileges for this layout." : "Type document mutations here. Works completely offline..."}
//             />
  
//             {role === 'VIEWER' && (
//               <div className="absolute top-4 right-4 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-medium text-amber-400 flex items-center gap-1">
//                 <Lock size={12} />
//                 <span>Read Only</span>
//               </div>
//             )}
//           </div>
//         </main>

//         <aside className="w-80 border-l border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-6 overflow-y-auto">
//           <SharePanel docId={docId} />
//           <MaintenancePane docId={docId} />
//           <RevisionTimeline docId={docId} />
//         </aside>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDocumentEngine } from '@/context/DocumentContext';
import RevisionTimeline from './RevisionTimeline';
import MaintenancePane from './MaintenancePane';
import SharePanel from './SharePanel';
import PresenceRibbon from './PresenceRibbon';
import { Wifi, WifiOff, RefreshCw, Lock, FileText, Bold, Italic, Strikethrough, Heading1, Heading2, Undo, Redo, List, ListOrdered } from 'lucide-react';
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

  if (!isReady || !yDoc) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Hydrating document engine...</span>
        </div>
      </div>
    );
  }

  return <TipTapCanvas docId={docId} yDoc={yDoc} role={role} />;
}

// ==========================================
// 2. THE UI CANVAS
// ==========================================
function TipTapCanvas({ docId, yDoc, role }: { docId: string, yDoc: Y.Doc, role: string }) {
  const [docTitle, setDocTitle] = useState<string>('Loading...');
  const [isOnline, setIsOnline] = useState(true);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        if (res.ok) {
          const data = await res.json();
          setDocTitle((Array.isArray(data) ? data[0]?.title : (data.title || data.document?.title)) || 'Untitled Document');
        }
      } catch (e) { setDocTitle('Document'); }
    };
    fetchMetadata();
  }, [docId]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setSyncState('syncing'); syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 1500); };
    const handleOffline = () => { setIsOnline(false); setSyncState('offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const editor = useEditor({
    editable: role !== 'VIEWER',
    extensions: [StarterKit.configure({ history: false }), Collaboration.configure({ document: yDoc, field: 'prosemirror' })],
    editorProps: {
      attributes: { class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[800px] p-12' }
    },
    onUpdate: () => {
      if (isOnline) {
        setSyncState('syncing');
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 800);
      }
    }
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
<header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-6 shrink-0">
  <div className="flex items-center gap-4">
    <Link href="/dashboard" className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-md text-slate-400 hover:text-slate-200 font-medium transition-all">
      ← Dashboard
    </Link>
    <div className="flex items-center gap-2">
      <FileText size={16} className="text-blue-400" />
      <h2 className="text-sm font-semibold tracking-wide text-slate-200">{docTitle}</h2>
    </div>
  </div>

  <div className="flex items-center gap-4 text-xs" role="status">
    <PresenceRibbon docId={docId} />

    {/* RESTORED: Network Connection Status */}
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
      {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
      {isOnline ? "Live Network Connection" : "Offline Storage Buffering"}
    </span>

    {/* RESTORED: Sync State */}
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
          <div className="flex-grow" />
          <ToolbarButton icon={<Undo size={16}/>} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
          <ToolbarButton icon={<Redo size={16}/>} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-slate-950/30 p-8">
          <div className="max-w-[800px] mx-auto min-h-[1056px] bg-slate-900 border border-slate-800 shadow-2xl rounded-sm">
            <EditorContent editor={editor} />
          </div>
        </main>
        <aside className="w-80 border-l border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-6 overflow-y-auto">
          <SharePanel docId={docId} />
          <MaintenancePane docId={docId} />
          <RevisionTimeline docId={docId} />
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


// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { useDocumentEngine } from '@/context/DocumentContext';
// import RevisionTimeline from './RevisionTimeline';
// import MaintenancePane from './MaintenancePane';
// import SharePanel from './SharePanel';
// import PresenceRibbon from './PresenceRibbon';
// import { Wifi, WifiOff, RefreshCw, Lock, FileText, Bold, Italic, Strikethrough, Heading1, Heading2, Undo, Redo, List, ListOrdered, PanelRightClose, PanelRightOpen, CheckCircle2 } from 'lucide-react';
// import Link from "next/link";
// import { useEditor, EditorContent } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Collaboration from '@tiptap/extension-collaboration';
// import * as Y from 'yjs';

// // ==========================================
// // 1. MAIN EXPORT (Wrapper)
// // ==========================================
// export default function Editor({ docId }: { docId: string }) {
//   const { yDoc, isReady, role } = useDocumentEngine();

//   if (!isReady || !yDoc) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//           <span>Replaying historical document delta logs...</span>
//         </div>
//       </div>
//     );
//   }

//   return <TipTapCanvas docId={docId} yDoc={yDoc} role={role} />;
// }

// // ==========================================
// // 2. THE UI CANVAS
// // ==========================================
// function TipTapCanvas({ docId, yDoc, role }: { docId: string, yDoc: Y.Doc, role: string }) {
//   const [docTitle, setDocTitle] = useState<string>('Loading...');
//   const [isOnline, setIsOnline] = useState(true);
//   const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
//   const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // Metadata Fetch
//   useEffect(() => {
//     const fetchMetadata = async () => {
//       try {
//         const res = await fetch(`/api/documents/${docId}`);
//         if (res.ok) {
//           const data = await res.json();
//           let title = Array.isArray(data) ? data[0]?.title : (data.title || data.document?.title);
//           setDocTitle(title || 'Untitled Document');
//         }
//       } catch (e) { setDocTitle('Document'); }
//     };
//     fetchMetadata();
//   }, [docId]);

//   // Network Listener
//   useEffect(() => {
//     const handleOnline = () => { setIsOnline(true); setSyncState('syncing'); syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 1500); };
//     const handleOffline = () => { setIsOnline(false); setSyncState('offline'); };
//     window.addEventListener('online', handleOnline);
//     window.addEventListener('offline', handleOffline);
//     return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
//   }, []);

//   // TipTap Init
//   const editor = useEditor({
//     editable: role !== 'VIEWER',
//     extensions: [StarterKit.configure({ history: false }), Collaboration.configure({ document: yDoc, field: 'prosemirror' })],
//     editorProps: {
//       attributes: { class: 'w-full h-full p-4 focus:outline-none text-slate-300 font-mono text-sm leading-relaxed' }
//     },
//     onUpdate: () => {
//       if (isOnline) {
//         setSyncState('syncing');
//         if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => setSyncState('synced'), 800);
//       }
//     }
//   });

//   if (!editor) return null;

//   return (
//     <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
//       {/* HEADER */}
//       <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
//         <div className="flex items-center gap-4">
//           <Link href="/dashboard" className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 hover:text-slate-200 font-medium">← Dashboard</Link>
//           <div className="flex items-center gap-2"><FileText size={16} className="text-blue-400" /><h2 className="text-sm font-semibold text-slate-200">{docTitle}</h2></div>
//         </div>
//         <div className="flex items-center gap-4 text-xs" role="status">
//           <PresenceRibbon docId={docId} />
//           <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
//             {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} {isOnline ? "Live Network Connection" : "Offline Storage Buffering"}
//           </span>
//           <span className={`flex items-center gap-1 px-2 py-1 rounded font-mono ${syncState === 'offline' ? 'text-slate-500 bg-slate-900' : 'text-slate-400 bg-slate-800'}`}>
//             <RefreshCw size={12} className={syncState === 'syncing' ? 'animate-spin text-blue-400' : ''} /> Sync state: {syncState}
//           </span>
//         </div>
//       </header>

//       {/* TOOLBAR */}
//       {role !== 'VIEWER' && (
//         <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-6 py-2 shrink-0">
//           <button onClick={() => editor.chain().focus().toggleBold().run()} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded"><Bold size={16}/></button>
//           <button onClick={() => editor.chain().focus().toggleItalic().run()} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded"><Italic size={16}/></button>
//           <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded"><Undo size={16}/></button>
//         </div>
//       )}

//       {/* CONTENT AREA */}
//       <div className="flex flex-1 overflow-hidden">
//         <main className="flex-1 p-6 flex flex-col gap-4">
//           <div className="relative flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto">
//             <EditorContent editor={editor} />
//             {role === 'VIEWER' && <div className="absolute top-4 right-4 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-medium text-amber-400"><Lock size={12} /> Read Only</div>}
//           </div>
//         </main>

//         <aside className="w-80 border-l border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-6 overflow-y-auto">
//           <SharePanel docId={docId} />
//           <MaintenancePane docId={docId} />
//           <RevisionTimeline docId={docId} />
//         </aside>
//       </div>
//     </div>
//   );
// }