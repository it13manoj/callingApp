import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { api } from '../../services/api';
import { Video, Phone, ShieldCheck, Zap, Monitor, Sparkles, AlertCircle, Play, Check } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function MainContent() {
  const { user } = useAuth();
  const { isConnected, isUserOnline, getUserStatus } = useSocket();
  const { startCall, callState, errorMessage, clearError } = useCall();

  const [directDial, setDirectDial] = useState('');
  const [searching, setSearching] = useState(false);
  const [dialError, setDialError] = useState('');

  // Local camera preview
  const videoPreviewRef = useRef(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const togglePreview = async () => {
    if (isPreviewActive) {
      if (videoPreviewRef.current?.srcObject) {
        videoPreviewRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoPreviewRef.current.srcObject = null;
      }
      setIsPreviewActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        setIsPreviewActive(true);
      } catch (e) {
        console.warn('Could not start preview:', e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreviewRef.current?.srcObject) {
        videoPreviewRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleDirectCall = async (type = 'video') => {
    setDialError('');
    if (!directDial.trim()) {
      setDialError('Please enter an Email ID or Mobile Number');
      return;
    }

    try {
      setSearching(true);
      const allUsers = await api.getUsers();
      const trimmed = directDial.trim().toLowerCase();

      // Find matching user by email or phone
      const target = allUsers.find(
        u =>
          u.email.toLowerCase() === trimmed ||
          u.phone?.replace(/\D/g, '') === trimmed.replace(/\D/g, '') ||
          u.displayPhone?.toLowerCase().includes(trimmed)
      );

      if (!target) {
        setDialError('No registered user found with this Email or Mobile Number');
        return;
      }

      if (!isUserOnline(target.id)) {
        setDialError(`${target.name} is currently offline. Wait for them to connect.`);
        return;
      }

      const status = getUserStatus(target.id);
      if (status === 'busy') {
        setDialError(`${target.name} is already in another call.`);
        return;
      }

      startCall(target, type);
    } catch (err) {
      setDialError(err.message || 'Call failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-panel rounded-3xl p-6 border border-slate-800/80 shadow-2xl overflow-y-auto">
      {/* Error Banners */}
      {(errorMessage || dialError) && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMessage || dialError}</span>
          </div>
          <button
            onClick={() => {
              clearError();
              setDialError('');
            }}
            className="text-xs font-semibold text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-500/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Welcome */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>High Definition 1-to-1 WebRTC Peer-to-Peer</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Hello, {user?.name?.split(' ')[0] || 'User'}! Ready for your next call?
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Select any contact on the left panel or enter their mobile number/email below to start an
            instant private 1-to-1 voice or video call.
          </p>

          {/* Quick Direct Call Input */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-xl">
            <input
              type="text"
              value={directDial}
              onChange={(e) => setDirectDial(e.target.value)}
              placeholder="Enter Email or Mobile Number to dial..."
              className="flex-1 py-3 px-4 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDirectCall('voice')}
                disabled={searching || callState !== 'idle'}
                className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-40"
              >
                <Phone className="w-4 h-4" />
                <span>Voice Call</span>
              </button>
              <button
                onClick={() => handleDirectCall('video')}
                disabled={searching || callState !== 'idle'}
                className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-40"
              >
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section: Self Camera Preview & Feature Cards */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Local Camera Test Card */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Self Camera Preview
              </h3>
              <span className="text-[11px] text-slate-400">
                {isPreviewActive ? 'Live' : 'Standby'}
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  !isPreviewActive ? 'hidden' : ''
                }`}
              />
              {!isPreviewActive && (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <Avatar src={user?.avatar} name={user?.name} size="lg" className="mb-2" />
                  <p className="text-xs text-slate-400">Camera preview is off</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={togglePreview}
            className={`mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              isPreviewActive
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
            }`}
          >
            <span>{isPreviewActive ? 'Turn Off Preview' : 'Preview My Camera'}</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: 1-to-1 WebRTC */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Direct Peer-to-Peer</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Streams flow directly between browsers using WebRTC with SRTP/DTLS encryption. No
              intermediary recording or server buffering.
            </p>
          </div>

          {/* Card 2: Voice & Video */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">HD Voice & Video</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Supports both audio-only calls with acoustic echo cancellation and high-definition
              video with dynamic bitrate adaptation.
            </p>
          </div>

          {/* Card 3: Screen Sharing */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Monitor className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Screen Sharing & Chat</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Present documents, slides, or whole screens during a call, and exchange text messages
              and links in real-time.
            </p>
          </div>

          {/* Card 4: Multi-User Testing Tip */}
          <div className="glass-card rounded-2xl p-4 border border-indigo-500/30 bg-indigo-950/20">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-indigo-200">Instant Dual-Tab Test</h4>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Open a second window (or incognito tab), log in as a different demo account (e.g. Alex
              or David), and initiate a 1-to-1 call to watch both sides interact!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
