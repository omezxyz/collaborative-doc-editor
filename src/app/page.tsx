"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Shield, Zap, Mail, Lock, User, Loader2 } from 'lucide-react';
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function LandingPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // NOTE: Replace this with your actual API endpoint for login/register
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password };

     
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Authentication failed");
      

      // Simulating network request for the UI
      await new Promise(resolve => setTimeout(resolve, 800));

      // Redirect to the dashboard upon success
      router.push('/dashboard');
    } catch (error) {
      console.error("Auth error:", error);
      alert("Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-500 font-bold text-lg tracking-tight">
            <FileText size={24} />
            <span>DocuMesh</span>
          </div>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            {isLogin ? "Create an account" : "Sign in instead"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 w-full gap-12 lg:gap-24 py-12">
        
        {/* Left Column: Landing Page Copy */}
        <div className="flex-1 space-y-8 max-w-xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
              <Zap size={14} /> v1.0 Now Live
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Collaborative <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Document Editor.
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Collaborate on relational document grids in real-time. Secure, fast, and built for complex organizational structures with granular role-based access.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Shield className="text-emerald-400 shrink-0" size={20} />
              <span>Enterprise-grade access control (Owner, Editor, Viewer)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <FileText className="text-blue-400 shrink-0" size={20} />
              <span>Real-time document synchronization via Yjs</span>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Form */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {isLogin ? "Enter your credentials to access your workspace." : "Start collaborating in seconds."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Platform"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {isLogin && <a href="#" className="text-[11px] text-blue-400 hover:underline">Forgot password?</a>}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            By continuing, you agree to our <a href="#" className="text-slate-400 hover:text-slate-300 underline">Terms of Service</a> and <a href="#" className="text-slate-400 hover:text-slate-300 underline">Privacy Policy</a>.
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-800 py-5 px-6">
  <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
    <p>
      Built by <span className="text-slate-300 font-medium">Omesh Rabha</span>
    </p>

    <div className="flex items-center gap-5">
      <a
        href="https://github.com/omezxyz"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-slate-200 transition-colors"
      >
        <FaGithub size={18} />
        <span>GitHub</span>
      </a>

      <a
        href="https://linkedin.com/in/omez-dev"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-blue-400 transition-colors"
      >
        <FaLinkedin size={18} />
        <span>LinkedIn</span>
      </a>
    </div>
  </div>
</footer>
    </div>
  );
}