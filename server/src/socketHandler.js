import { storage } from './storage.js';

// In-memory mapping of connected users
// userId -> { socketId, user, status: 'available' | 'busy' | 'ringing', currentCallWith: null }
const onlineUsers = new Map();
const socketToUser = new Map();
const readySockets = new Set();

// Active call metadata: callId -> { callerId, calleeId, callType, startedAt, duration }
const activeCalls = new Map();

export function setupSocketHandlers(io) {
  function broadcastOnlineUsers() {
    const onlineList = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      status: data.status,
      currentCallWith: data.currentCallWith
    }));
    io.emit('presence:update', onlineList);
  }

  io.on('connection', (socket) => {
    // 1. User registers presence
    socket.on('user:join', ({ user }) => {
      if (!user || !user.id) return;
      
      const userId = user.id;
      socketToUser.set(socket.id, userId);
      onlineUsers.set(userId, {
        socketId: socket.id,
        user,
        status: 'available',
        currentCallWith: null
      });

      // Send initial list of all online users to this client
      const onlineList = Array.from(onlineUsers.entries()).map(([uId, data]) => ({
        userId: uId,
        status: data.status,
        currentCallWith: data.currentCallWith
      }));
      socket.emit('presence:list', onlineList);

      // Broadcast to all other clients that this user is online
      socket.broadcast.emit('presence:user-online', {
        userId,
        status: 'available'
      });
    });

    socket.on('call:ready', () => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      readySockets.add(socket.id);
      let hasPendingCall = false;
      for (const [callId, call] of activeCalls.entries()) {
        if (call.calleeId !== userId || call.status !== 'ringing') continue;

        hasPendingCall = true;
        socket.emit('call:incoming', {
          callId,
          callType: call.callType,
          caller: call.callerUser,
          offer: call.offer
        });

        for (const queued of call.pendingIceCandidates) {
          if (queued.toUserId === userId) {
            socket.emit('call:ice-candidate', {
              fromUserId: call.callerId,
              candidate: queued.candidate
            });
          }
        }
        call.pendingIceCandidates = call.pendingIceCandidates.filter(
          queued => queued.toUserId !== userId
        );
      }
      if (hasPendingCall) {
        const userData = onlineUsers.get(userId);
        if (userData) {
          userData.status = 'ringing';
          userData.currentCallWith = Array.from(activeCalls.values()).find(
            call => call.calleeId === userId && call.status === 'ringing'
          )?.callerId || null;
          broadcastOnlineUsers();
        }
      }
    });

    // 2. Caller initiates a call (Video or Voice)
    socket.on('call:initiate', ({ toUserId, offer, callType = 'video' }) => {
      const callerId = socketToUser.get(socket.id);
      if (!callerId) return;

      const callerData = onlineUsers.get(callerId);
      const calleeData = onlineUsers.get(toUserId);

      if (!calleeData) {
        socket.emit('call:error', {
          reason: 'offline',
          message: 'The recipient is currently offline.'
        });
        return;
      }

      if (calleeData.status !== 'available') {
        socket.emit('call:error', {
          reason: 'busy',
          message: 'The user is currently on another call.'
        });
        return;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const call = {
        callerId,
        callerUser: callerData.user,
        calleeId: toUserId,
        calleeUser: calleeData.user,
        callType,
        offer,
        pendingIceCandidates: [],
        startTime: null,
        status: 'ringing'
      };
      activeCalls.set(callId, call);

      // Update statuses to ringing
      callerData.status = 'ringing';
      callerData.currentCallWith = toUserId;
      if (calleeData) {
        calleeData.status = 'ringing';
        calleeData.currentCallWith = callerId;
      }
      broadcastOnlineUsers();

      if (calleeData && readySockets.has(calleeData.socketId)) {
        io.to(calleeData.socketId).emit('call:incoming', {
          callId,
          callType,
          caller: callerData.user,
          offer
        });
      }

      // Notify caller that recipient's device is ringing
      socket.emit('call:ringing', {
        callId,
        callee: calleeData.user
      });
    });

    // 3. Callee accepts the call
    socket.on('call:accept', ({ callId, answer }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerData = onlineUsers.get(call.callerId);
      const calleeData = onlineUsers.get(call.calleeId);

      call.status = 'connected';
      call.startTime = Date.now();

      if (callerData) {
        callerData.status = 'busy';
      }
      if (calleeData) {
        calleeData.status = 'busy';
      }
      broadcastOnlineUsers();

      // Forward WebRTC SDP answer to caller
      if (callerData) {
        io.to(callerData.socketId).emit('call:accepted', {
          callId,
          answer,
          callee: calleeData ? calleeData.user : null
        });
      }
    });

    // 4. Callee rejects the call
    socket.on('call:reject', ({ callId, reason = 'declined' }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerData = onlineUsers.get(call.callerId);
      const calleeData = onlineUsers.get(call.calleeId);

      // Log the rejected call
      storage.addCallLog({
        callerId: call.callerId,
        callerName: call.callerUser.name,
        callerAvatar: call.callerUser.avatar,
        calleeId: call.calleeId,
        calleeName: call.calleeUser.name,
        calleeAvatar: call.calleeUser.avatar,
        callType: call.callType,
        status: reason === 'busy' ? 'rejected' : 'missed',
        duration: 0
      });

      if (callerData) {
        callerData.status = 'available';
        callerData.currentCallWith = null;
        io.to(callerData.socketId).emit('call:rejected', {
          callId,
          reason
        });
      }

      if (calleeData) {
        calleeData.status = 'available';
        calleeData.currentCallWith = null;
      }

      activeCalls.delete(callId);
      broadcastOnlineUsers();
    });

    // 5. Caller cancels before callee answers
    socket.on('call:cancel', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const calleeData = onlineUsers.get(call.calleeId);
      const callerData = onlineUsers.get(call.callerId);

      // Log missed call
      storage.addCallLog({
        callerId: call.callerId,
        callerName: call.callerUser.name,
        callerAvatar: call.callerUser.avatar,
        calleeId: call.calleeId,
        calleeName: call.calleeUser.name,
        calleeAvatar: call.calleeUser.avatar,
        callType: call.callType,
        status: 'missed',
        duration: 0
      });

      if (calleeData) {
        calleeData.status = 'available';
        calleeData.currentCallWith = null;
        io.to(calleeData.socketId).emit('call:cancelled', { callId });
      }

      if (callerData) {
        callerData.status = 'available';
        callerData.currentCallWith = null;
      }

      activeCalls.delete(callId);
      broadcastOnlineUsers();
    });

    // 6. Either party hangs up
    socket.on('call:end', ({ callId, duration = 0 }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerData = onlineUsers.get(call.callerId);
      const calleeData = onlineUsers.get(call.calleeId);

      // Calculate accurate duration if start time was recorded
      const finalDuration = call.startTime 
        ? Math.round((Date.now() - call.startTime) / 1000) 
        : duration;

      // Save to persistent call logs
      storage.addCallLog({
        callerId: call.callerId,
        callerName: call.callerUser.name,
        callerAvatar: call.callerUser.avatar,
        calleeId: call.calleeId,
        calleeName: call.calleeUser.name,
        calleeAvatar: call.calleeUser.avatar,
        callType: call.callType,
        status: 'completed',
        duration: finalDuration
      });

      if (callerData) {
        callerData.status = 'available';
        callerData.currentCallWith = null;
        io.to(callerData.socketId).emit('call:ended', { callId, duration: finalDuration });
      }

      if (calleeData) {
        calleeData.status = 'available';
        calleeData.currentCallWith = null;
        io.to(calleeData.socketId).emit('call:ended', { callId, duration: finalDuration });
      }

      activeCalls.delete(callId);
      broadcastOnlineUsers();
    });

    // 7. ICE Candidate exchange
    socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
      const targetData = onlineUsers.get(toUserId);
      const call = Array.from(activeCalls.values()).find(activeCall =>
        (activeCall.callerId === socketToUser.get(socket.id) && activeCall.calleeId === toUserId) ||
        (activeCall.calleeId === socketToUser.get(socket.id) && activeCall.callerId === toUserId)
      );
      if (targetData && readySockets.has(targetData.socketId) && candidate) {
        io.to(targetData.socketId).emit('call:ice-candidate', {
          fromUserId: socketToUser.get(socket.id),
          candidate
        });
      } else if (
        call &&
        call.status === 'ringing' &&
        socketToUser.get(socket.id) === call.callerId &&
        candidate
      ) {
        call.pendingIceCandidates.push({ toUserId, candidate });
      }
    });

    // 8. Media state toggled (mic mute, camera mute, screen share)
    socket.on('call:toggle-media', ({ toUserId, mediaType, enabled }) => {
      const targetData = onlineUsers.get(toUserId);
      if (targetData) {
        io.to(targetData.socketId).emit('call:media-state-changed', {
          mediaType,
          enabled
        });
      }
    });

    // 9. In-call chat message
    socket.on('call:chat-message', ({ toUserId, message }) => {
      const targetData = onlineUsers.get(toUserId);
      if (targetData) {
        io.to(targetData.socketId).emit('call:chat-message', {
          message
        });
      }
    });

    // 10. Disconnect handler
    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      // If user was on any active call, end it gracefully
      for (const [callId, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.calleeId === userId) {
          const peerId = call.callerId === userId ? call.calleeId : call.callerId;
          const peerData = onlineUsers.get(peerId);
          if (peerData) {
            peerData.status = 'available';
            peerData.currentCallWith = null;
            io.to(peerData.socketId).emit('call:ended', {
              callId,
              reason: 'peer-disconnected'
            });
          }

          const duration = call.startTime ? Math.round((Date.now() - call.startTime) / 1000) : 0;
          storage.addCallLog({
            callerId: call.callerId,
            callerName: call.callerUser.name,
            callerAvatar: call.callerUser.avatar,
            calleeId: call.calleeId,
            calleeName: call.calleeUser.name,
            calleeAvatar: call.calleeUser.avatar,
            callType: call.callType,
            status: call.startTime ? 'completed' : 'missed',
            duration
          });
          activeCalls.delete(callId);
        }
      }

      socketToUser.delete(socket.id);
      readySockets.delete(socket.id);
      onlineUsers.delete(userId);
      socket.broadcast.emit('presence:user-offline', { userId });
      broadcastOnlineUsers();
    });
  });
}
