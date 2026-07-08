"use client";

import React, { useState, useEffect } from 'react';
import { useDocumentEngine } from '@/context/DocumentContext';
import { Database, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function MaintenancePane({ docId }: { docId: string }) {
  const { role } = useDocumentEngine();
  const [rowCount, setRowCount] = useState<number>(0);
  const [optimizing, setOptimizing] = useState(false);
  const [stats, setStats] = useState<string | null>(null);

  const fetchDeltaMetrics = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setRowCount(data.versions.length);
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

  const handleCompaction = async () => {
    if (role !== 'OWNER') return;
    setOptimizing(true);
    setStats(null);

    try {
      const res = await fetch(`/api/documents/${docId}/compact`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStats(`Successfully compressed ${data.previousRowCount} transaction logs into 1 master snapshot!`);
        await fetchDeltaMetrics();
      }
    } catch {
      setStats("Optimization error running log pruning.");
    } finally {
      setOptimizing(false);
    }
  };

  if (role !== 'OWNER') return null; // Keep configuration tools hidden from standard viewers

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
        className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/20"
      >
        <Zap size={13} className={optimizing ? "animate-bounce" : ""} />
        <span>{optimizing ? "Compacting State Tree..." : "Run Log Compaction"}</span>
      </button>

      {stats && (
        <div className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-md flex items-start gap-1.5 leading-normal">
          <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
          <span>{stats}</span>
        </div>
      )}
    </div>
  );
}