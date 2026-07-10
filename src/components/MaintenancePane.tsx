"use client";

import React, { useState, useEffect } from 'react';
import { useDocumentEngine } from '@/context/DocumentContext';
import { Database, Zap, CheckCircle2,ShieldAlert } from 'lucide-react';

export default function MaintenancePane({ docId }: { docId: string }) {
  // 💡 1. Pull yDoc out of your collaborative workspace context
  const { role, yDoc } = useDocumentEngine();
  const [rowCount, setRowCount] = useState<number>(0);
  const [optimizing, setOptimizing] = useState(false);
  const [stats, setStats] = useState<string | null>(null);

  const fetchDeltaMetrics = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setRowCount(Math.max(0, data.versions.length - 1));
      }
    } catch (err) {
      console.error("Failed loading mutation metrics:", err);
    }
  };

  useEffect(() => {
    fetchDeltaMetrics();
    const interval = setInterval(fetchDeltaMetrics, 5000);
    return () => clearInterval(interval);
  }, [docId]);

  useEffect(() => {
    if (!stats) return;

    const timer = setTimeout(() => {
      setStats(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [stats]);

  const handleCompaction = async () => {
    if (role !== 'OWNER') return;
    setOptimizing(true);
    setStats(null);

    try {
      const res = await fetch(`/api/documents/${docId}/compact`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const logCount = Math.max(0, data.previousRowCount - 1);
setStats(`Successfully compressed ${logCount} transaction logs into 1 master snapshot!`);
        // Refresh local metrics view
        await fetchDeltaMetrics();
        
        // Fire local event wrapper
        window.dispatchEvent(new Event('timeline-updated'));

        // 💡 2. BROADCAST TO NETWORK: Trip the wire on the shared Yjs coordinate map!
        // This alerts the RevisionTimeline component on ALL other connected user screens
        if (yDoc) {
          const metaMap = yDoc.getMap('metadata');
          metaMap.set('lastCommitSignal', `compact-${Date.now()}`);
        }
      }
    } catch {
      setStats("Optimization error running log pruning.");
    } finally {
      setOptimizing(false);
    }
  };

  if (role !== 'OWNER') return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Database size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-200">Database Optimization</h3>
      </div>

      <div className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/60">
        <span className="text-xs text-slate-400">Active DB Fragment Rows:</span>
        <span className={`font-mono text-xs font-bold ${rowCount > 15 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
          {rowCount} rows
        </span>
      </div>

    <button
  onClick={handleCompaction}
  disabled={optimizing || rowCount <= 1}
  className="w-full h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
>
  <Zap size={15} className={optimizing ? "animate-pulse" : ""} />
  {optimizing ? "Compacting..." : "Run Log Compaction"}
</button>

<div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
  <div className="flex items-start gap-2">
    <ShieldAlert size={15} className="text-amber-400 mt-0.5 shrink-0" />
    <p className="text-xs leading-5 text-slate-400">
      Log compaction permanently removes all previous timeline versions and
      replaces them with a single snapshot of the current document state.
    </p>
  </div>
</div>

{stats && (
  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 flex items-start gap-2">
    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
    <p className="text-xs leading-5 text-emerald-300">
      {stats}
    </p>
  </div>
)}
    </div>
  );
}