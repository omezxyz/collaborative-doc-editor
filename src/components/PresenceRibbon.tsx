"use client";

import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface Collaborator {
  userId: string;
  name: string;
  role: string;
  isCurrentUser: boolean;
}

export default function PresenceRibbon({ docId }: { docId: string }) {
  const [activeUsers, setActiveUsers] = useState<Collaborator[]>([]);

  const sendHeartbeat = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/presence`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveUsers(data.collaborators);
      }
    } catch (err) {
      console.error("Presence check-in skipped due to network fluctuation:", err);
    }
  };

  useEffect(() => {
    // Fire heartbeat immediately on mount
    sendHeartbeat();

    // Poll server every 5 seconds to keep the active loop accurate
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [docId]);

  return (
    <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-3 py-1 rounded-xl">
      <div className="flex items-center gap-1.5 text-slate-400 border-r border-slate-800 pr-2.5">
        <Users size={14} className="text-blue-400" />
        <span className="text-[11px] font-mono font-medium">{activeUsers.length} Online</span>
      </div>

      <div className="flex -space-x-1.5 overflow-hidden">
        {activeUsers.map((user) => {
          // Compute distinct color weights depending on client capability mappings
          const colorClass = 
            user.role === 'OWNER' ? 'bg-blue-600 ring-blue-500' :
            user.role === 'EDITOR' ? 'bg-emerald-600 ring-emerald-500' : 
            'bg-amber-600 ring-amber-500';

          return (
            <div
              key={user.userId}
              title={`${user.name} (${user.role}) ${user.isCurrentUser ? '- You' : ''}`}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider ring-2 select-none cursor-default shadow-md font-mono ${colorClass}`}
            >
              {user.name.substring(0, 2)}
            </div>
          );
        })}
      </div>
    </div>
  );
}