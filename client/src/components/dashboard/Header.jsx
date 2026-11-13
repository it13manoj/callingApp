import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { PhoneCall, Sliders, ExternalLink, LogOut, Shield, Wifi, WifiOff, Mail, Phone, Edit2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import DeviceSettingsModal from './DeviceSettingsModal';

export default function Header() {
  const { user, logout, updateProfile } = useAuth();
  const { isConnected } = useSocket();
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(user?.statusMessage || 'Available for 1-to-1 calls');

  const handleOpenSecondWindow = () => {
    // Open clean window for dual testing
    window.open(window.location.origin, '_blank', 'width=1100,height=800');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (statusText.trim()) {
      await updateProfile({ statusMessage: statusText.trim() });
      setIsEditingStatus(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  NexCall
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  1-to-1 P2P
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {isConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 font-medium">Real-time Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="text-rose-400 font-medium">Reconnecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* User profile & controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Dual-Tab Test button */}
            <button
              onClick={handleOpenSecondWindow}
              className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
              title="Open a second window to test calling between 2 users"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test in 2nd Tab</span>
            </button>

            {/* Hardware check / Device preview button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white transition flex items-center gap-2 text-xs font-medium"
              title="Test microphone and camera"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Hardware Check</span>
            </button>

            {/* User Pill */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-800">
              <Avatar
                src={user?.avatar}
                name={user?.name}
                size="sm"
                status={isConnected ? 'available' : 'offline'}
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="truncate max-w-[130px]">{user?.email}</span>
                  <span>•</span>
                  <span>{user?.displayPhone || user?.phone}</span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hardware Settings Modal */}
      {showSettings && (
        <DeviceSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
