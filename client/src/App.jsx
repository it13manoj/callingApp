import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Header from './components/dashboard/Header';
import Sidebar from './components/dashboard/Sidebar';
import MainContent from './components/dashboard/MainContent';
import IncomingCallModal from './components/call/IncomingCallModal';
import OutgoingCallModal from './components/call/OutgoingCallModal';
import ActiveCallModal from './components/call/ActiveCallModal';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0F19] text-white">
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Initializing NexCall...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0B0F19] text-white relative overflow-hidden">
        {/* Subtle background ambient lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {authView === 'login' ? (
          <Login onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <Register onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <SocketProvider>
      <CallProvider>
        <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
            <Sidebar />
            <MainContent />
          </main>

          {/* Call Modals */}
          <IncomingCallModal />
          <OutgoingCallModal />
          <ActiveCallModal />
        </div>
      </CallProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
