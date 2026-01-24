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
const SOCKET_URL = window.location.hostname === 'localhost'
  ? "http://localhost:3001"
  : `http://${window.location.hostname}:3001`;

const socket = io(SOCKET_URL);

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
  useEffect(() => {
    const peerInstance = new Peer();

    peerInstance.on('open', (id) => {
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

      {/* Main Content */}
      {renderView()}
    </div>
  );
}

export default App;