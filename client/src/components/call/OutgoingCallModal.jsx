import React from 'react';
import { useCall } from '../../context/CallContext';
import { PhoneOff, Video, Phone, ShieldCheck } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function OutgoingCallModal() {
  const { otherUser, callType, cancelCall } = useCall();

  if (!otherUser) return null;

  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-indigo-500/30 relative overflow-hidden">
        {/* Decorative radar background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-purple-600/10 pointer-events-none" />

        {/* Call Type Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
          {isVideo ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Outgoing {isVideo ? 'HD Video Call' : '1-to-1 Voice Call'}</span>
        </div>

        {/* Pulsing Avatar with Radar Waves */}
        <div className="relative inline-block my-4">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/30 animate-ping opacity-60" />
          <div className="absolute -inset-4 rounded-3xl border border-indigo-500/30 animate-pulse" />
          <Avatar
            src={otherUser?.avatar}
            name={otherUser?.name}
            size="2xl"
            className="relative z-10 ring-4 ring-indigo-500 shadow-2xl"
          />
        </div>

        {/* Callee Info */}
        <h3 className="text-xl font-extrabold text-white mt-4">{otherUser?.name || 'Contact'}</h3>
        <p className="text-xs text-slate-400 mt-1">{otherUser?.title || 'NexCall Contact'}</p>
        <p className="text-xs text-indigo-300/80 font-mono mt-1">
          {otherUser?.displayPhone || otherUser?.email}
        </p>

        {/* Ringing status indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="text-xs font-medium text-slate-300">Ringing recipient's device...</span>
        </div>

        {/* Cancel Call Button */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={cancelCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition"
            title="Cancel Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <span className="text-xs text-rose-400 font-medium">Cancel Call</span>
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
