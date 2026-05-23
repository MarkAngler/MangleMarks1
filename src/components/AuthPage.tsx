import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Sparkles, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled by user.');
      } else {
        setError(err.message || 'Failed to authenticate via Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-zinc-100">
        
        {/* Title */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold font-sans text-zinc-900 tracking-tight">
            MangleMarks
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            A secure home for your dashboards, categories, and web links
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google SSO Login */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full inline-flex justify-center items-center py-3 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-semibold text-zinc-700 transition cursor-pointer shadow-xs gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {/* Google Logo Icon SVG */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.27-.63-.41-1.3-.41-2.09s.14-1.46.41-2.09z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-2 text-xs text-zinc-400">
          Sign in secure, instant access using Google Workspace
        </div>

      </div>
    </div>
  );
}

