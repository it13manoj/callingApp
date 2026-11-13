import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Signal,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import Avatar from '../common/Avatar';
import AudioVisualizer from './AudioVisualizer';
import InCallChat from './InCallChat';

export default function ActiveCallModal() {
  const {
    callState,
    callType,
    otherUser,
    localStream,
    remoteStream,
    isMicMuted,
    isVideoMuted,
    isScreenSharing,
    isRemoteVideoMuted,
    isRemoteMicMuted,
    callDuration,
    inCallMessages,
    endCall,
    toggleMic,
    toggleVideo,
    toggleScreenShare
  } = useCall();

  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Attach local stream to local video element
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    video.srcObject = localStream || null;
    if (localStream) {
      video.play().catch(error => {
        console.warn('Could not start local video playback:', error);
      });
    }
  }, [localStream, callState, callType]);

  // Attach remote stream to remote video element
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;

    video.srcObject = remoteStream || null;
    if (remoteStream) {
      video.play().catch(error => {
        console.warn('Could not start remote video playback:', error);
      });
    }
  }, [remoteStream, callState, callType]);

  // Format call duration MM:SS or HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (callState !== 'connected' && callState !== 'connecting') return null;

  const isVideo = callType === 'video';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex bg-[#070a12] text-white overflow-hidden animate-fadeIn select-none"
    >
      {/* Main Call View Area */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Floating Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
          {/* Peer info */}
          <div className="flex items-center gap-3">
            <Avatar src={otherUser?.avatar} name={otherUser?.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">{otherUser?.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {isVideo ? 'HD Video' : 'Voice Only'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                <span className="font-mono text-emerald-400 font-semibold">{formatTime(callDuration)}</span>
                <span>•</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Signal className="w-3 h-3 text-emerald-400" />
                  HD 1-to-1 Encrypted
                </span>
              </div>
            </div>
          </div>

          {/* Top right badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-xs text-slate-300 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Peer-to-Peer</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition backdrop-blur-md"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Call Center Media Stage */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950">
          {isVideo ? (
            /* Video Call Layout */
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${
                  isRemoteVideoMuted ? 'hidden' : ''
                }`}
              />

              {callState === 'connecting' && !remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 rounded-xl bg-slate-900/80 text-sm text-slate-200">
                    Connecting to {otherUser?.name || 'participant'}...
                  </span>
                </div>
              )}

              {/* Remote Video Muted Placeholder */}
              {isRemoteVideoMuted && (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="relative mb-4">
                    <Avatar src={otherUser?.avatar} name={otherUser?.name} size="2xl" />
                    <span className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-900 border border-slate-700 text-rose-400">
                      <VideoOff className="w-5 h-5" />
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white">{otherUser?.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">Camera is turned off</p>
                </div>
              )}

              {/* Remote Mic Muted Indicator */}
              {isRemoteMicMuted && (
                <div className="absolute top-20 left-4 z-10 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{otherUser?.name} is muted</span>
                </div>
              )}

              {/* Local Video Stream Picture-in-Picture */}
              <div
                className={`absolute z-20 transition-all duration-300 ${
                  isPipMinimized
                    ? 'bottom-24 right-4 w-28 h-20'
                    : 'bottom-24 right-4 sm:right-6 w-36 sm:w-56 h-24 sm:h-36'
                } rounded-2xl overflow-hidden shadow-2xl border-2 border-indigo-500/50 bg-slate-900`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    isVideoMuted ? 'hidden' : ''
                  }`}
                />
                {isVideoMuted && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-2 text-center">
                    <Avatar src={user?.avatar} name={user?.name} size="sm" />
                    <span className="text-[10px] text-slate-400 mt-1">Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 text-[10px] text-slate-300 font-medium backdrop-blur-sm">
                  You {isMicMuted ? '(Muted)' : ''}
                </div>
              </div>
            </div>
          ) : (
            /* Voice Call Layout */
            <div className="flex flex-col items-center justify-center text-center p-6 sm:p-12 z-10">
              {/* Pulsing Avatar with Glowing Sound Wave Rings */}
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping opacity-50" />
                <div className="absolute -inset-6 rounded-full border border-indigo-500/20 animate-pulse-subtle" />
                <Avatar
                  src={otherUser?.avatar}
                  name={otherUser?.name}
                  size="2xl"
                  className="relative z-10 ring-4 ring-indigo-500/60 shadow-2xl"
                />
                {isRemoteMicMuted && (
                  <span className="absolute -bottom-2 -right-2 p-2 rounded-full bg-rose-600 text-white shadow-lg">
                    <MicOff className="w-4 h-4" />
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight">{otherUser?.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{otherUser?.title || 'NexCall Contact'}</p>
              <p className="text-xs text-indigo-400 font-mono mt-1">
                {otherUser?.displayPhone || otherUser?.email}
              </p>

              {/* Dynamic Audio Visualizer */}
              <div className="mt-8">
                <AudioVisualizer
                  stream={remoteStream || localStream}
                  isMuted={isRemoteMicMuted && isMicMuted}
                  height={90}
                  width={320}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HD Audio Calling Connected</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Call Controls Dock */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center">
          <div className="glass-panel px-4 sm:px-6 py-3 rounded-3xl border border-slate-700/80 shadow-2xl flex items-center gap-2 sm:gap-4 backdrop-blur-2xl">
            {/* Toggle Mic */}
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center justify-center ${
                isMicMuted
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            </button>

            {/* Toggle Camera */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center justify-center ${
                isVideoMuted
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-indigo-400" />}
            </button>

            {/* Toggle Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`p-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center justify-center ${
                isScreenSharing
                  ? 'bg-purple-600 text-white shadow-purple-600/30 ring-2 ring-purple-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* In-Call Chat Drawer Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`relative p-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center justify-center ${
                showChat
                  ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title="Open In-Call Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {inCallMessages.length > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                  {inCallMessages.length}
                </span>
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="p-3.5 sm:px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition active:scale-95 shadow-lg shadow-rose-600/40 flex items-center gap-2"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline text-xs">End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over In-Call Chat Drawer */}
      {showChat && <InCallChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
