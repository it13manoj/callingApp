import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Mail, Phone, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    api.getDemoAccounts()
      .then(setDemoAccounts)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your Email ID or Mobile Number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoUser, usePhone = false) => {
    setIdentifier(usePhone ? demoUser.phone : demoUser.email);
    setPassword(demoUser.password);
    setError('');
  };

  const isEmail = identifier.includes('@');
  const isPhone = identifier.length > 0 && !isEmail;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-xl shadow-indigo-500/25 mb-4 ring-1 ring-white/20">
          <LogIn className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Welcome to NexCall
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in using either your <span className="text-indigo-400 font-medium">Email ID</span> or{' '}
          <span className="text-indigo-400 font-medium">Mobile Number</span>
        </p>
      </div>

      {/* Main Login Card */}
      <div className="glass-panel rounded-3xl p-7 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
            <span className="text-rose-400 font-bold">✕</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email or Phone field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email ID or Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {isPhone ? (
                  <Phone className="w-5 h-5 text-indigo-400" />
                ) : (
                  <Mail className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. sarah@nexcall.com or +1 415 555 2671"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                required
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Accepted: name@email.com or +1234567890</span>
              {identifier && (
                <span className="text-indigo-400 font-medium">
                  Signing in via {isEmail ? 'Email' : 'Mobile'}
                </span>
              )}
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-11 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to NexCall</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Picker (for instant 2-user test) */}
        {demoAccounts.length > 0 && (
          <div className="mt-7 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Accounts (1-Click)
              </span>
              <span className="text-[11px] text-slate-500">Auto-fills login</span>
            </div>

            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={acc.avatar} name={acc.name} size="sm" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{acc.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => fillDemo(acc, false)}
                      title="Login using Email"
                      className="text-[11px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-medium transition"
                    >
                      via Email
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemo(acc, true)}
                      title="Login using Mobile"
                      className="text-[11px] px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 font-medium transition"
                    >
                      via Phone
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Switch to Register */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 transition"
          >
            Create an Account
          </button>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>End-to-End Encrypted WebRTC 1-to-1 Voice & Video</span>
      </div>
    </div>
  );
}
