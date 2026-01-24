import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

// Import all views
import {
  HomeView,
  IdentityView,
  ModeView,
  CreateRoomView,
  JoinRoomView,
  JoinPasswordView,
  ChatView,
  SettingsModal,
} from './views';

// ═══════════════════════════════════════════════════════════════════
// SOCKET CONNECTION
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// SOCKET CONNECTION
// ═══════════════════════════════════════════════════════════════════
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    console.log('Using VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Using localhost fallback');
    return "http://localhost:3001";
  }
  console.log('Using relative path fallback');
  return "/";
};

const socket = io(getSocketUrl(), {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  upgrade: true, // Allow upgrade from polling to WebSocket
  forceNew: true, // Force new connection
  timeout: 20000, // Increase timeout for slow connections
});

// ═══════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════
function App() {
  // View State Management
  const [currentView, setCurrentView] = useState('HOME');

  // User Data
  const [userData, setUserData] = useState({
    username: '',
    room: '',
    password: '',
  });

  // Room State
  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Connection State
  const [isConnected, setIsConnected] = useState(socket.connected);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [roomRequiresPassword, setRoomRequiresPassword] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    soundEnabled: true,
    darkMode: true,
  });

  // PeerJS for Voice Calls
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // ─────────────────────────────────────────────────────────────────
  // SOCKET EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Connection handlers
    function onConnect() {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('Socket disconnected');
    }

    function onConnectError(err) {
      console.error('Socket connection error:', err);
      // Only show error if we've been trying for a while or it's a critical failure
      if (!socket.active) {
         setError('Connection failed. Please check your internet or server status.');
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    socket.on('user_list', (users) => {
      setRoomUsers(users);
    });

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
      if (settings.soundEnabled) {
        playNotificationSound();
      }
    });

    socket.on('system_message', (data) => {
      setMessages((prev) => [...prev, {
        id: `system-${Date.now()}`,
        type: 'system',
        content: data.message,
        timestamp: data.timestamp
      }]);
    });

    socket.on('user_typing', ({ username, isTyping }) => {
      if (isTyping) {
        setTypingUsers((prev) => [...new Set([...prev, username])]);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      }
    });

    socket.on('file_error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 3000);
    });

    // Voice Call Events
    socket.on('incoming_call', ({ callerId, callerName }) => {
      setIncomingCall({ callerId, callerName });
    });

    socket.on('call_accepted', () => {
      setInCall(true);
    });

    socket.on('call_rejected', () => {
      setIncomingCall(null);
      setInCall(false);
    });

    socket.on('call_ended', () => {
      setInCall(false);
      setIncomingCall(null);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('user_list');
      socket.off('receive_message');
      socket.off('system_message');
      socket.off('user_typing');
      socket.off('file_error');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [settings.soundEnabled]);

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZE PEERJS
  // ─────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────
  // INITIALIZE PEERJS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // ☁️ Use Public PeerJS Cloud (More reliable for Free Tier deployments)
    const peerConfig = {
      debug: 1,
      config: {
        iceServers: [
          // Google Public STUN
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Specialized STUN servers
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.framasoft.org:3478' },
          { urls: 'stun:stun.ekiga.net' }
        ],
        iceCandidatePoolSize: 10,
      }
    };

    const peerInstance = new Peer(undefined, peerConfig);

    // Standard Peer Connection
    peerInstance.on('open', (id) => {
      console.log('✅ Public Peer Connected! ID: ' + id);
      setPeerId(id);
    });

    peerInstance.on('error', (err) => {
      console.error('PeerJS Error:', err);
    });

    setPeer(peerInstance);

    return () => {
      peerInstance.destroy();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────
  const navigateTo = (view) => {
    setError('');
    setCurrentView(view);
  };

  const goBack = () => {
    const backMap = {
      'NAME': 'HOME',
      'MODE': 'NAME',
      'CREATE': 'MODE',
      'JOIN': 'MODE',
      'JOIN_PASSWORD': 'JOIN',
      'CHAT': 'MODE',
    };
    navigateTo(backMap[currentView] || 'HOME');
  };

  // ─────────────────────────────────────────────────────────────────
  // UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio context not supported
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // ROOM ACTIONS
  // ─────────────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!userData.room.trim()) {
      setError('Room name required.');
      return;
    }

    setIsLoading(true);
    setError('');

    socket.emit('create_room', {
      room: userData.room.trim(),
      password: userData.password || null,
      username: userData.username
    }, (response) => {
      setIsLoading(false);
      if (response.success) {
        joinRoom();
      } else {
        setError(response.message || 'Failed to create room.');
      }
    });
  };

  const handleCheckRoom = () => {
    if (!userData.room.trim()) {
      setError('Room name required.');
      return;
    }

    setIsLoading(true);
    setError('');

    socket.emit('check_room', { room: userData.room.trim() }, (response) => {
      setIsLoading(false);
      if (!response.exists) {
        setError('Room not found.');
        return;
      }

      if (response.hasPassword) {
        setRoomRequiresPassword(true);
        navigateTo('JOIN_PASSWORD');
      } else {
        joinRoom();
      }
    });
  };

  const joinRoom = () => {
    setIsLoading(true);
    setError('');

    socket.emit('join_room', {
      room: userData.room.trim(),
      password: userData.password || null,
      username: userData.username,
      peerId: peerId
    }, (response) => {
      setIsLoading(false);
      if (response.success) {
        setRoomUsers(response.users);
        setMessages([]);
        navigateTo('CHAT');
      } else {
        setError(response.message || 'Failed to join room.');
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room', {
      room: userData.room,
      username: userData.username
    });

    setUserData({ username: '', room: '', password: '' });
    setRoomUsers([]);
    setMessages([]);
    setShowSettings(false);
    navigateTo('HOME');
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER VIEW BASED ON STATE
  // ═══════════════════════════════════════════════════════════════════
  const renderView = () => {
    switch (currentView) {
      case 'HOME':
        return <HomeView navigateTo={navigateTo} />;

      case 'NAME':
        return (
          <IdentityView
            userData={userData}
            setUserData={setUserData}
            navigateTo={navigateTo}
            goBack={goBack}
            error={error}
            setError={setError}
          />
        );

      case 'MODE':
        return (
          <ModeView
            userData={userData}
            navigateTo={navigateTo}
            goBack={goBack}
          />
        );

      case 'CREATE':
        return (
          <CreateRoomView
            userData={userData}
            setUserData={setUserData}
            goBack={goBack}
            error={error}
            isLoading={isLoading}
            handleCreateRoom={handleCreateRoom}
          />
        );

      case 'JOIN':
        return (
          <JoinRoomView
            userData={userData}
            setUserData={setUserData}
            goBack={goBack}
            error={error}
            isLoading={isLoading}
            handleCheckRoom={handleCheckRoom}
          />
        );

      case 'JOIN_PASSWORD':
        return (
          <JoinPasswordView
            userData={userData}
            setUserData={setUserData}
            goBack={goBack}
            error={error}
            isLoading={isLoading}
            joinRoom={joinRoom}
          />
        );

      case 'CHAT':
        return (
          <>
            <ChatView
              socket={socket}
              userData={userData}
              roomUsers={roomUsers}
              messages={messages}
              typingUsers={typingUsers}
              error={error}
              setError={setError}
              setShowSettings={setShowSettings}
              handleLeaveRoom={handleLeaveRoom}
              formatTime={formatTime}
              settings={settings}
              // Pass PeerJS instance from App
              myPeer={peer} 
              myPeerId={peerId}
            />
            {showSettings && (
              <SettingsModal
                userData={userData}
                settings={settings}
                setSettings={setSettings}
                setShowSettings={setShowSettings}
                handleLeaveRoom={handleLeaveRoom}
              />
            )}
          </>
        );

      default:
        return <HomeView navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg font-mono">
      {/* Scanlines Effect (subtle) */}
      <div className="scanlines opacity-[0.02]" />

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-600/90 text-white text-xs py-1 px-4 text-center z-[9999] backdrop-blur-sm border-b border-red-400 font-bold uppercase tracking-widest animate-pulse">
          CONNECTING...
        </div>
      )}

      {/* Main Content */}
      {renderView()}
    </div>
  );
}

export default App;