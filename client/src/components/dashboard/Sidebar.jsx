import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { Search, Phone, Video, Users, Clock, ArrowDownLeft, ArrowUpRight, PhoneMissed, RefreshCw, AlertCircle } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'history'
  const [users, setUsers] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { getUserStatus, isUserOnline } = useSocket();
  const { startCall, callState } = useCall();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersList, historyList] = await Promise.all([
        api.getUsers(),
        api.getCallHistory()
      ]);
      setUsers(usersList);
      setCallHistory(historyList);
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter contacts by Name, Email, or Mobile Number
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.displayPhone?.toLowerCase().includes(term)
    );
  });

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-full lg:w-96 flex-shrink-0 flex flex-col glass-panel rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl h-[calc(100vh-6.5rem)]">
      {/* Top Tabs */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center gap-2 bg-slate-900/50">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeTab === 'contacts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Contacts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Call Logs ({callHistory.length})</span>
        </button>

        <button
          onClick={loadData}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Refresh contacts & logs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar (Search by Name, Email, or Mobile) */}
      <div className="p-3.5 border-b border-slate-800/60">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mx-3.5 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'contacts' ? (
          <>
            {filteredUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Users className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
                <p className="text-sm font-semibold text-slate-400">No contacts found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching with a different name, email, or mobile number.
                </p>
              </div>
            ) : (
              filteredUsers.map((targetUser) => {
                const online = isUserOnline(targetUser.id);
                const status = getUserStatus(targetUser.id);
                const isBusy = status === 'busy' || status === 'ringing';
                const isCallingDisabled = callState !== 'idle' || !online || isBusy;

                return (
                  <div
                    key={targetUser.id}
                    className="p-3 rounded-2xl glass-card transition hover:border-indigo-500/40 group flex items-center justify-between gap-3"
                  >
                    {/* User profile info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={targetUser.avatar}
                        name={targetUser.name}
                        size="md"
                        status={online ? (isBusy ? 'busy' : 'available') : 'offline'}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">
                            {targetUser.name}
                          </h4>
                          {online && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Online
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {targetUser.title || 'Member'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 truncate">
                          <span>{targetUser.displayPhone || targetUser.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Call Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* 1-to-1 Voice Call */}
                      <button
                        type="button"
                        onClick={() => startCall(targetUser, 'voice')}
                        disabled={isCallingDisabled}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-transparent transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                        title={
                          !online
                            ? 'User is currently offline'
                            : isBusy
                            ? 'User is busy on another call'
                            : `Start 1-to-1 Voice Call with ${targetUser.name}`
                        }
                      >
                        <Phone className="w-4 h-4 text-emerald-400 group-hover:text-white" />
                      </button>

                      {/* 1-to-1 Video Call */}
                      <button
                        type="button"
                        onClick={() => startCall(targetUser, 'video')}
                        disabled={isCallingDisabled}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-transparent transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                        title={
                          !online
                            ? 'User is currently offline'
                            : isBusy
                            ? 'User is busy on another call'
                            : `Start 1-to-1 Video Call with ${targetUser.name}`
                        }
                      >
                        <Video className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          /* Call History Tab */
          <>
            {callHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Clock className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
                <p className="text-sm font-semibold text-slate-400">No call history yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Your finished and missed 1-to-1 calls will show up here.
                </p>
              </div>
            ) : (
              callHistory.map((call) => {
                const isMissed = call.status === 'missed' || call.status === 'rejected';
                return (
                  <div
                    key={call.id}
                    className="p-3 rounded-2xl glass-card border border-slate-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={call.callerAvatar}
                        name={call.callerName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          ) : call.callType === 'video' ? (
                            <Video className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          )}
                          <h4 className="text-xs font-semibold text-white truncate">
                            {call.callerName}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {isMissed ? (
                            <span className="text-rose-400 font-medium">Missed Call</span>
                          ) : (
                            <span>Duration: {formatDuration(call.duration)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 flex-shrink-0">
                      <span>{formatTime(call.startedAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </aside>
  );
}
