"use client";

import React, { useEffect, useState } from 'react';
import { useDocumentEngine } from '@/context/DocumentContext';
import { History, RotateCcw, Eye, Clock, User, MessageSquare } from 'lucide-react';
import * as Y from 'yjs';

interface VersionItem {
  id: string;
  version: number;
  createdAt: string;
  message: string | null; // FIX: Changed from description to message to match database
  user: { name: string | null; email: string } | null;
}

export default function RevisionTimeline({ docId }: { docId: string }) {
  const { yDoc, role, userName } = useDocumentEngine();
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/versions`);
      if (res.ok) {
        const data = await res.json();
        const historyOnly = (data.versions || []).filter((v: VersionItem) => v.version > 0);
        setVersions(historyOnly);
      }
    } catch (err) {
      console.error("Error loading timeline:", err);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [docId]);

const loadPreview = async (versionNum: number) => {
  setLoading(true);
  setPreviewVersion(versionNum);
  try {
    const res = await fetch(`/api/documents/${docId}/versions/${versionNum}`);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      
      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, uint8);
      
      const yXml = tempDoc.getXmlFragment('prosemirror');

      // Helper to recursively extract text from XML nodes
      const extractText = (nodes: any[]): string => {
        return nodes.map(node => {
          if (node.constructor.name === 'YXmlText') {
            return node.toString();
          }
          if (node.constructor.name === 'YXmlElement') {
            return extractText(node.toArray());
          }
          return '';
        }).join('');
      };

      // Set the extracted clean text
      setPreviewText(extractText(yXml.toArray())); 
      setPreviewSnapshot(uint8);
    }
  } catch (err) {
    console.error("Preview failed:", err);
  } finally {
    setLoading(false);
  }
};

  const handleRestore = async () => {
    if (!yDoc || !previewSnapshot || role === 'VIEWER') return;

    // 1. Create a version of the snapshot to apply
    const sourceDoc = new Y.Doc();
    Y.applyUpdate(sourceDoc, previewSnapshot);
    const sourceXml = sourceDoc.getXmlFragment('prosemirror');

    // 2. Perform the transaction on the live document
    yDoc.transact(() => {
      const liveXml = yDoc.getXmlFragment('prosemirror');
      
      // Clear current content
      liveXml.delete(0, liveXml.length);
      
      // Insert content from the version snapshot
      // We loop through the nodes in the source to ensure they are cloned correctly
      sourceXml.forEach((node, index) => {
        liveXml.insert(index, [node.clone()]);
      });
    }, 'revert-operation');

    // 3. Cleanup
    setPreviewVersion(null);
    setPreviewSnapshot(null);
  };

  const handleManualCommit = async () => {
    if (!commitMsg.trim()) return alert("Please enter a version name!");
    if (!yDoc) return alert("Document not ready!");
    
    setCommitting(true);
    try {
      const stateUpdate = Y.encodeStateAsUpdate(yDoc);
      
      let binaryString = "";
      const chunkSize = 8192;
      for (let i = 0; i < stateUpdate.length; i += chunkSize) {
        const chunk = stateUpdate.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64State = btoa(binaryString);

      const res = await fetch(`/api/documents/${docId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          commitMessage: commitMsg,
          author: userName, 
          clientState: base64State 
        }),
      });
      
      if (res.ok) {
        setCommitMsg('');
        fetchTimeline();
      }
    } catch (err) {
      console.error("Manual commit failed:", err);
    } finally {
      setCommitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 max-h-[50vh] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <History size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-200">Version Timeline</h3>
      </div>

      {role !== 'VIEWER' && (
        <div className="flex flex-col gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
          <input 
            type="text"
            placeholder="Commit message..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleManualCommit}
            disabled={committing}
            className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded transition-all disabled:opacity-50"
          >
            {committing ? "Saving..." : "Commit Checkpoint"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {versions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No historical versions saved yet.</p>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="p-2.5 rounded-lg border bg-slate-950 border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-mono text-blue-400 font-semibold text-sm">v{v.version}</span>
                <button
                  onClick={() => loadPreview(v.version)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 transition-colors"
                >
                  <Eye size={12} /> Preview
                </button>
              </div>
              
              <div className="flex items-start gap-1.5 text-xs text-slate-300 bg-slate-900/50 p-1.5 rounded border border-slate-800/40 my-0.5">
                <MessageSquare size={12} className="text-blue-500 mt-0.5 shrink-0" />
                {/* FIX: Reading v.message instead of v.description */}
                <span className="italic line-clamp-2">{v.message || "Compaction version."}</span>
              </div>
              
              <div className="flex flex-col gap-1 border-t border-slate-800/50 pt-1.5 mt-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <User size={10} className="text-slate-500" />
                  <span>{v.user?.name || userName || "Unknown Author"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock size={10} className="text-slate-600" />
                  <span>{formatDate(v.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {previewVersion !== null && (
        <div className="border-t border-slate-800 pt-3 flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between text-[11px]">
             <span className="text-amber-400">Viewing v{previewVersion}</span>
             <button onClick={() => setPreviewVersion(null)} className="text-slate-500 hover:text-slate-300 underline">Exit</button>
          </div>
          <div className="bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-400 max-h-24 overflow-y-auto border border-slate-800 whitespace-pre-wrap">
            {loading ? "Loading..." : previewText || "« Empty »"}
          </div>
          {role !== 'VIEWER' && !loading && (
            <button
              onClick={handleRestore}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded shadow-md"
            >
              <RotateCcw size={12} className="inline mr-1" /> Revert to v{previewVersion}
            </button>
          )}
        </div>
      )}
    </div>
  );
}