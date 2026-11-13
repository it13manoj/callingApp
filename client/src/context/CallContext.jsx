import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { sound } from '../services/sound';
import { api } from '../services/api';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Call state: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('video'); // 'video' | 'voice'
  const [currentCallId, setCurrentCallId] = useState(null);
  
  // Participants
  const [otherUser, setOtherUser] = useState(null); // The peer in the call
  const [incomingCallData, setIncomingCallData] = useState(null);

  // Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // In-call media controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [isRemoteMicMuted, setIsRemoteMicMuted] = useState(false);

  // Call metrics & chat
  const [callDuration, setCallDuration] = useState(0);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // References
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const pendingLocalIceCandidatesRef = useRef([]);
  const disconnectedTimerRef = useRef(null);
  const timerRef = useRef(null);
  const otherUserRef = useRef(null);
  const currentCallIdRef = useRef(null);
  const readySocketIdRef = useRef(null);

  // Keep ref sync
  useEffect(() => {
    otherUserRef.current = otherUser;
    currentCallIdRef.current = currentCallId;
  }, [otherUser, currentCallId]);

  // Cleanup helper
  const cleanupMediaAndPeer = useCallback(() => {
    if (disconnectedTimerRef.current) {
      clearTimeout(disconnectedTimerRef.current);
      disconnectedTimerRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;
    iceCandidateQueueRef.current = [];
    pendingLocalIceCandidatesRef.current = [];

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    sound.stopAll();
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setIsScreenSharing(false);
    setIsRemoteVideoMuted(false);
    setIsRemoteMicMuted(false);
  }, []);

  // Timer for active call
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Helper to acquire user media
  const getUserMediaStream = async (type) => {
    const isVideo = type === 'video';
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: isVideo ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('getUserMedia failed with requested constraints, attempting audio only:', err);
      // Fallback: if video was requested but camera not available, try audio only
      if (isVideo) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setIsVideoMuted(true);
          return audioStream;
        } catch (audioErr) {
          throw new Error('Microphone permission denied or device not found.');
        }
      }
      throw new Error('Could not access microphone/camera. Please check permissions.');
    }
  };

  // Create RTCPeerConnection instance
  const createPeerConnection = (targetUserId, iceServers) => {
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const candidate = {
          toUserId: targetUserId,
          candidate: event.candidate
        };
        if (currentCallIdRef.current) {
          socket.emit('call:ice-candidate', candidate);
        } else {
          pendingLocalIceCandidatesRef.current.push(candidate);
        }
      }
    };

    // Receive remote tracks
    pc.ontrack = (event) => {
      const inboundStream = event.streams?.[0] || remoteStreamRef.current || new MediaStream();
      if (!event.streams?.[0] && !inboundStream.getTracks().includes(event.track)) {
        inboundStream.addTrack(event.track);
      }
      remoteStreamRef.current = inboundStream;
      setRemoteStream(inboundStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (disconnectedTimerRef.current) {
          clearTimeout(disconnectedTimerRef.current);
          disconnectedTimerRef.current = null;
        }
        sound.stopAll();
        sound.playConnectedChime();
        setCallState('connected');
      } else if (pc.connectionState === 'disconnected' && !disconnectedTimerRef.current) {
        disconnectedTimerRef.current = setTimeout(() => {
          disconnectedTimerRef.current = null;
          if (pcRef.current === pc && pc.connectionState === 'disconnected') {
            setErrorMessage('The media connection was lost. Check the network and TURN server settings.');
            endCall();
          }
        }, 15000);
      } else if (pc.connectionState === 'failed') {
        if (disconnectedTimerRef.current) {
          clearTimeout(disconnectedTimerRef.current);
          disconnectedTimerRef.current = null;
        }
        setErrorMessage('Could not establish the media connection. Check the TURN server and network settings.');
        endCall();
      }
    };

    return pc;
  };

  // Drain queued ICE candidates once remote description is set
  const processIceQueue = async (pc) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding queued ICE candidate:', err);
      }
    }
  };

  // 1. INITIATE A CALL (Caller side)
  const startCall = async (targetUser, type = 'video') => {
    if (!socket || !targetUser) return;
    try {
      setErrorMessage(null);
      setOtherUser(targetUser);
      setCallType(type);
      setCallState('outgoing');
      setCurrentCallId(null);
      currentCallIdRef.current = null;
      setInCallMessages([]);

      sound.playOutgoingRing();

      const stream = await getUserMediaStream(type);
      const iceServers = await api.getIceServers();
      const pc = createPeerConnection(targetUser.id, iceServers);

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create WebRTC Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit initiate event to signaling server
      socket.emit('call:initiate', {
        toUserId: targetUser.id,
        offer,
        callType: type
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setErrorMessage(err.message || 'Failed to start call');
      cleanupMediaAndPeer();
      setCallState('idle');
    }
  };

  // 2. ACCEPT INCOMING CALL (Callee side)
  const acceptCall = async () => {
    if (!socket || !incomingCallData) return;
    try {
      sound.stopAll();
      const { callId, caller, offer, callType: incomingType } = incomingCallData;

      setOtherUser(caller);
      setCurrentCallId(callId);
      currentCallIdRef.current = callId;
      setCallType(incomingType);
      setCallState('connecting');
      setInCallMessages([]);

      const stream = await getUserMediaStream(incomingType);
      const iceServers = await api.getIceServers();
      const pc = createPeerConnection(caller.id, iceServers);

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processIceQueue(pc);

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer to caller
      socket.emit('call:accept', {
        callId,
        answer
      });

      setIncomingCallData(null);
    } catch (err) {
      console.error('Failed to accept call:', err);
      rejectCall('failed');
    }
  };

  // 3. REJECT INCOMING CALL
  const rejectCall = (reason = 'declined') => {
    if (incomingCallData && socket) {
      socket.emit('call:reject', {
        callId: incomingCallData.callId,
        reason
      });
    }
    sound.stopAll();
    setIncomingCallData(null);
    setCallState('idle');
  };

  // 4. CANCEL OUTGOING CALL
  const cancelCall = () => {
    if (currentCallIdRef.current && socket) {
      socket.emit('call:cancel', { callId: currentCallIdRef.current });
    }
    sound.stopAll();
    cleanupMediaAndPeer();
    setCallState('idle');
    setOtherUser(null);
  };

  // 5. END ACTIVE CALL
  const endCall = () => {
    sound.stopAll();
    sound.playEndedChime();

    if (currentCallIdRef.current && socket) {
      socket.emit('call:end', {
        callId: currentCallIdRef.current,
        duration: callDuration
      });
    }

    cleanupMediaAndPeer();
    setCallState('ended');

    // Return to idle after 1.5 seconds
    setTimeout(() => {
      setCallState('idle');
      setOtherUser(null);
      setCurrentCallId(null);
    }, 1500);
  };

  // 6. TOGGLE MICROPHONE
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);

      if (socket && otherUserRef.current) {
        socket.emit('call:toggle-media', {
          toUserId: otherUserRef.current.id,
          mediaType: 'audio',
          enabled: audioTrack.enabled
        });
      }
    }
  };

  // 7. TOGGLE CAMERA
  const toggleVideo = async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoMuted(!videoTrack.enabled);

      if (socket && otherUserRef.current) {
        socket.emit('call:toggle-media', {
          toUserId: otherUserRef.current.id,
          mediaType: 'video',
          enabled: videoTrack.enabled
        });
      }
    } else if (callType === 'voice') {
      // Upgrade voice call to video: request camera
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        
        if (pcRef.current) {
          pcRef.current.addTrack(newTrack, localStreamRef.current);
        }
        setIsVideoMuted(false);
        setCallType('video');
      } catch (e) {
        console.warn('Could not add camera to voice call:', e);
      }
    }
  };

  // 8. SCREEN SHARING TOGGLE
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Revert to camera
      try {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }

        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }

        // Replace in local stream
        if (localStreamRef.current) {
          const oldVideo = localStreamRef.current.getVideoTracks()[0];
          if (oldVideo) localStreamRef.current.removeTrack(oldVideo);
          localStreamRef.current.addTrack(camTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        setIsScreenSharing(false);
      } catch (err) {
        console.warn('Error reverting to webcam:', err);
      }
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const displayTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = displayTrack;

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(displayTrack);
        }

        // Handle browser "Stop sharing" bar click
        displayTrack.onended = () => {
          toggleScreenShare();
        };

        if (localStreamRef.current) {
          const oldVideo = localStreamRef.current.getVideoTracks()[0];
          if (oldVideo) localStreamRef.current.removeTrack(oldVideo);
          localStreamRef.current.addTrack(displayTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  // 9. SEND IN-CALL CHAT MESSAGE
  const sendInCallMessage = (text) => {
    if (!text.trim() || !otherUserRef.current || !socket) return;
    const msg = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('call:chat-message', {
      toUserId: otherUserRef.current.id,
      message: msg
    });

    setInCallMessages(prev => [...prev, msg]);
  };

  // Listen to incoming socket call signaling events
  useEffect(() => {
    if (!socket) return;

    const announceCallReady = () => {
      if (!socket.connected || !socket.id || readySocketIdRef.current === socket.id) return;
      readySocketIdRef.current = socket.id;
      socket.emit('call:ready');
    };

    // A. Incoming call notification
    const handleIncomingCall = (data) => {
      // If already in a call, auto-reject with 'busy'
      if (callState !== 'idle') {
        socket.emit('call:reject', {
          callId: data.callId,
          reason: 'busy'
        });
        return;
      }

      setIncomingCallData(data);
      setCallType(data.callType);
      setCallState('incoming');
      sound.playIncomingRingtone();
    };

    // B. Caller device ringing
    const handleCallRinging = ({ callId, callee }) => {
      setCurrentCallId(callId);
      currentCallIdRef.current = callId;
      pendingLocalIceCandidatesRef.current.forEach(candidate => {
        socket.emit('call:ice-candidate', candidate);
      });
      pendingLocalIceCandidatesRef.current = [];
    };

    // C. Callee accepted call (Caller receives this)
    const handleCallAccepted = async ({ callId, answer, callee }) => {
      sound.stopAll();
      setCurrentCallId(callId);
      setCallState('connecting');

      if (callee) {
        setOtherUser(callee);
      }

      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue(pcRef.current);
        } catch (err) {
          console.error('Error setting remote answer:', err);
        }
      }
    };

    // D. Callee rejected / busy
    const handleCallRejected = ({ reason }) => {
      sound.stopAll();
      sound.playEndedChime();
      setErrorMessage(reason === 'busy' ? 'User is busy on another call.' : 'Call was declined.');
      cleanupMediaAndPeer();
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setOtherUser(null);
        setErrorMessage(null);
      }, 2500);
    };

    // E. Caller cancelled before answer
    const handleCallCancelled = () => {
      sound.stopAll();
      setIncomingCallData(null);
      setCallState('idle');
    };

    // F. Call ended by peer
    const handleCallEnded = () => {
      sound.stopAll();
      sound.playEndedChime();
      cleanupMediaAndPeer();
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setOtherUser(null);
      }, 1500);
    };

    // G. Remote ICE candidate arrived
    const handleRemoteIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      } else {
        // Queue candidate until remote description is set
        iceCandidateQueueRef.current.push(candidate);
      }
    };

    // H. Remote user changed media state (muted mic / video)
    const handleMediaStateChanged = ({ mediaType, enabled }) => {
      if (mediaType === 'video') {
        setIsRemoteVideoMuted(!enabled);
      }
      if (mediaType === 'audio') {
        setIsRemoteMicMuted(!enabled);
      }
    };

    // I. In-call chat message from remote peer
    const handleChatMessage = ({ message }) => {
      setInCallMessages(prev => [...prev, message]);
    };

    // J. Call error
    const handleCallError = ({ reason, message }) => {
      sound.stopAll();
      setErrorMessage(message || 'Unable to connect call.');
      cleanupMediaAndPeer();
      setCallState('idle');
      setOtherUser(null);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:ice-candidate', handleRemoteIceCandidate);
    socket.on('call:media-state-changed', handleMediaStateChanged);
    socket.on('call:chat-message', handleChatMessage);
    socket.on('call:error', handleCallError);
    socket.on('connect', announceCallReady);
    announceCallReady();

    return () => {
      socket.off('connect', announceCallReady);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:ringing', handleCallRinging);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:ice-candidate', handleRemoteIceCandidate);
      socket.off('call:media-state-changed', handleMediaStateChanged);
      socket.off('call:chat-message', handleChatMessage);
      socket.off('call:error', handleCallError);
    };
  }, [socket, callState, cleanupMediaAndPeer]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        otherUser,
        incomingCallData,
        localStream,
        remoteStream,
        isMicMuted,
        isVideoMuted,
        isScreenSharing,
        isRemoteVideoMuted,
        isRemoteMicMuted,
        callDuration,
        inCallMessages,
        errorMessage,
        clearError: () => setErrorMessage(null),
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMic,
        toggleVideo,
        toggleScreenShare,
        sendInCallMessage
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}
