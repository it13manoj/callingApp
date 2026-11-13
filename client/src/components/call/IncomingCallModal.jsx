import React from 'react';
import { useCall } from '../../context/CallContext';
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function IncomingCallModal() {
  const { incomingCallData, callType, acceptCall, rejectCall } = useCall();

  if (!incomingCallData) return null;

  const { caller } = incomingCallData;
  const isVideo = incomingCallData.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-indigo-500/30 relative overflow-hidden">
        {/* Pulsing background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-purple-600/10 pointer-events-none" />

        {/* Incoming badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
          {isVideo ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Incoming {isVideo ? 'HD Video Call' : '1-to-1 Voice Call'}</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative inline-block my-4">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/30 animate-ping opacity-75" />
          <Avatar
            src={caller?.avatar}
            name={caller?.name}
            size="2xl"
            className="relative z-10 ring-4 ring-indigo-500 shadow-2xl"
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-extrabold text-white mt-4">{caller?.name || 'Incoming Caller'}</h3>
        <p className="text-xs text-slate-400 mt-1">{caller?.title || 'NexCall Contact'}</p>
        <p className="text-xs text-indigo-300/80 font-mono mt-1">
          {caller?.displayPhone || caller?.email}
        </p>

        {/* Audio Ringing Notice */}
        <p className="text-xs text-slate-400 mt-6 animate-pulse">
          Ringing... Click accept to start the conversation
        </p>

        {/* Action Buttons: Decline (Red) and Accept (Green) */}
        <div className="mt-8 flex items-center justify-center gap-6">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => rejectCall('declined')}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition relative ring-pulsing"
              title="Accept Call"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-emerald-400 font-medium">Accept</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Direct P2P</span>
        </div>
      </div>
    </div>
  );
}
