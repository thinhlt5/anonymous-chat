import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import Peer from 'peerjs';
import {
    Ghost,
    Send,
    Paperclip,
    Image,
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Settings,
    LogOut,
    Download,
    AlertTriangle,
    Menu,
    X,
    Users,
    Volume2,
    VolumeX,
    Headphones 
} from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ChatView = ({
    socket,
    userData,
    roomUsers,
    messages,
    typingUsers,
    error,
    setError,
    setShowSettings,
    handleLeaveRoom,
    formatTime,
    settings,
    myPeer,
    myPeerId
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Voice Chat State
    const [inVoiceChat, setInVoiceChat] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceChatUsers, setVoiceChatUsers] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    
    // Use props instead of local state for peer
    const peer = myPeer;
    const peerId = myPeerId;
    
    const [activeCalls, setActiveCalls] = useState(new Map());
    const [isConnectingVoice, setIsConnectingVoice] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [peerStatus, setPeerStatus] = useState('connecting'); // 'connecting', 'connected', 'error'
    const [debugInfo, setDebugInfo] = useState('');

    // Audio refs for remote streams
    const remoteAudioRefs = useRef({});
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const volumeIntervalRef = useRef(null);
    const [micVolume, setMicVolume] = useState(0);
    
    // Track remote user volumes for visualization
    const remoteAnalysersRef = useRef({});
    const [remoteVolumes, setRemoteVolumes] = useState({});

    // Refs to access current values in callbacks (avoid stale closures)
    const localStreamRef = useRef(null);
    const peerRef = useRef(null);
    const peerIdRef = useRef('');

    // Initialize PeerJS
    // Initialize PeerJS Listeners for ChatView
    useEffect(() => {
        if (!peer) {
            setPeerStatus('connecting');
            return;
        }

        setPeerStatus('connected');
        setDebugInfo(`PeerJS OK: ${peerId.substring(0, 8)}...`);
        peerRef.current = peer;
        peerIdRef.current = peerId;

        const handleCall = (call) => {
            console.log('Incoming call from:', call.peer);
            
            // Answer incoming call if we have a stream (are in voice chat)
            if (localStreamRef.current) {
                console.log('Answering call with stream');
                call.answer(localStreamRef.current);

                call.on('stream', (remoteStream) => {
                    console.log('Received remote stream from:', call.peer);
                    playRemoteAudio(call.peer, remoteStream);
                });

                call.on('close', () => {
                    console.log('Call closed:', call.peer);
                    removeRemoteAudio(call.peer);
                });

                call.on('error', (err) => {
                    console.error('Call error:', err);
                });

                setActiveCalls(prev => new Map(prev).set(call.peer, call));
            } else {
                console.log('No local stream to answer with - user not in voice chat');
                // Optional: reject call? call.close();
            }
        };

        const handleError = (err) => {
            console.error('PeerJS Error:', err);
            
            // Distinguish between fatal and non-fatal errors
            if (err.type === 'peer-unavailable') {
                // Non-fatal: remote peer not found, just log it
                console.warn('⚠️ Peer unavailable (user probably disconnected):', err.message);
                // Don't change peer status, this is expected behavior
                return;
            }
            
            // Fatal errors that affect our peer instance
            if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
                setPeerStatus('error');
                setDebugInfo(`PeerJS Error: ${err.type}`);
                setVoiceError('Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.');
            } else if (err.type === 'disconnected') {
                setPeerStatus('connecting');
                setDebugInfo('Reconnecting...');
            } else {
                console.warn('Non-critical PeerJS error:', err.type);
            }
        };

        // Attach listeners
        peer.on('call', handleCall);
        peer.on('error', handleError);

        return () => {
            // Detach listeners on unmount
            peer.off('call', handleCall);
            peer.off('error', handleError);
            // DO NOT destroy the peer instance as it belongs to App.jsx
        };
    }, [peer, peerId]);

    // Socket events for voice chat
    useEffect(() => {
        const handleVoiceChatUsers = (users) => {
            setVoiceChatUsers(users || []);
        };

        const handleUserJoinedVoice = ({ peerId: newPeerId, username }) => {
            // Don't call the new user - they will call us
            // This prevents duplicate bidirectional calls which cause audio conflicts
            console.log('ℹ️ New user joined voice:', username, '- waiting for their call');
            
            // Just refresh the voice chat users list
            socket.emit('get_voice_chat_users', { room: userData.room }, handleVoiceChatUsers);
        };

        const handleUserLeftVoice = ({ peerId: leftPeerId }) => {
            removeRemoteAudio(leftPeerId);
            setActiveCalls(prev => {
                const newMap = new Map(prev);
                const call = newMap.get(leftPeerId);
                if (call) call.close();
                newMap.delete(leftPeerId);
                return newMap;
            });
            // Refresh voice chat users to ensure sync
            socket.emit('get_voice_chat_users', { room: userData.room }, handleVoiceChatUsers);
        };

        socket.on('voice_chat_users', handleVoiceChatUsers);
        socket.on('user_joined_voice', handleUserJoinedVoice);
        socket.on('user_left_voice', handleUserLeftVoice);

        // Periodic sync for voice chat users (every 5 seconds) to fix stale data
        let syncInterval;
        if (inVoiceChat) {
            syncInterval = setInterval(() => {
                socket.emit('get_voice_chat_users', { room: userData.room }, handleVoiceChatUsers);
            }, 5000);
        }

        return () => {
            socket.off('voice_chat_users', handleVoiceChatUsers);
            socket.off('user_joined_voice', handleUserJoinedVoice);
            socket.off('user_left_voice', handleUserLeftVoice);
            if (syncInterval) clearInterval(syncInterval);
        };
    }, [inVoiceChat, userData.room]); // Removed peer, localStream dependencies as we use refs

    // Play remote audio stream (with iOS workaround)
    const playRemoteAudio = (peerId, stream) => {
        // SAFETY CHECK: Never play own audio
        if (peerId === myPeerId) {
            console.warn('🛑 Prevented playing local audio stream');
            return;
        }
        if (!peerId) return;

        if (remoteAudioRefs.current[peerId]) {
            // Audio element already exists - update the stream
            console.log('Updating existing audio stream for peer:', peerId);
            const audio = remoteAudioRefs.current[peerId];
            audio.srcObject = stream;
            audio.play().catch(err => console.warn('Play after update failed:', err));
            return;
        }
        
        console.log('🔊 Setting up audio for peer:', peerId);
        
        // Log stream details
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log(`Checking track for ${peerId}:`, audioTracks[0].label, 'Enabled:', audioTracks[0].enabled, 'Muted:', audioTracks[0].muted);
        } else {
            console.warn(`Warning: Stream from ${peerId} has NO audio tracks!`);
        }

        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.playsInline = true; // Important for iOS
        audio.volume = 1.0; 
        audio.muted = false; // Explicitly unmute but loopback protection might be needed if testing on same device without headphones
        
        // CRITICAL: Append to document body so browser can play it
        audio.style.display = 'none';
        document.body.appendChild(audio);

        // Setup audio analysis for remote user visualization
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            
            // Resume context immediately if suspended
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            
            source.connect(analyser);
            analyser.fftSize = 256;
            
            remoteAnalysersRef.current[peerId] = { analyser, audioCtx };
            
            // Start volume monitoring for this remote user
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateRemoteVolume = () => {
                if (!remoteAnalysersRef.current[peerId]) return;
                
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for(let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const vol = Math.min(1, average / 50);
                
                setRemoteVolumes(prev => ({
                    ...prev,
                    [peerId]: vol
                }));
                
                if (remoteAudioRefs.current[peerId]) {
                    requestAnimationFrame(updateRemoteVolume);
                }
            };
            updateRemoteVolume();
            
            console.log('🎵 Audio analyzer set up for peer:', peerId);
        } catch (e) {
            console.error('Failed to setup remote audio analysis', e);
        }

        // Try to play immediately
        const playWithRetry = () => {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ Audio playing successfully for peer:', peerId);
                    })
                    .catch(err => {
                        console.warn('⚠️ Audio autoplay blocked for peer:', peerId, err);
                        // Store this unlock function globally or attach to a one-time click listener
                        const unlockAudio = () => {
                            audio.play().catch(e => console.error('Unlock failed', e));
                            // Also resume any suspended contexts
                            Object.values(remoteAnalysersRef.current).forEach(({ audioCtx }) => {
                                if (audioCtx.state === 'suspended') audioCtx.resume();
                            });
                            document.removeEventListener('click', unlockAudio);
                            document.removeEventListener('touchstart', unlockAudio);
                        };
                        document.addEventListener('click', unlockAudio, { once: true });
                        document.addEventListener('touchstart', unlockAudio, { once: true });
                    });
            }
        };
        playWithRetry();

        remoteAudioRefs.current[peerId] = audio;
        console.log('🎧 Remote audio element created for peer:', peerId);
    };

    // Remove remote audio stream
    const removeRemoteAudio = (peerId) => {
        if (remoteAudioRefs.current[peerId]) {
            const audio = remoteAudioRefs.current[peerId];
            audio.pause();
            audio.srcObject = null;
            // Remove from DOM
            if (audio.parentNode) {
                audio.parentNode.removeChild(audio);
            }
            delete remoteAudioRefs.current[peerId];
        }
        
        // Cleanup analyzer
        if (remoteAnalysersRef.current[peerId]) {
            remoteAnalysersRef.current[peerId].audioCtx.close();
            delete remoteAnalysersRef.current[peerId];
        }
        
        // Remove volume state
        setRemoteVolumes(prev => {
            const newVols = { ...prev };
            delete newVols[peerId];
            return newVols;
        });
    };

    // Call a peer
    const callPeer = (targetPeerId) => {
        console.log('Calling peer:', targetPeerId);
        console.log('peerRef.current:', peerRef.current);
        console.log('localStreamRef.current:', localStreamRef.current);

        if (!peerRef.current || !localStreamRef.current) {
            console.log('Cannot call - peer or stream not ready');
            return;
        }

        try {
            const call = peerRef.current.call(targetPeerId, localStreamRef.current);

            if (!call) {
                console.error('Call creation failed');
                return;
            }

            call.on('stream', (remoteStream) => {
                console.log('Received stream from:', targetPeerId);
                playRemoteAudio(targetPeerId, remoteStream);
            });

            call.on('close', () => {
                console.log('Call to', targetPeerId, 'closed');
                removeRemoteAudio(targetPeerId);
            });

            call.on('error', (err) => {
                console.error('Call to', targetPeerId, 'error:', err);
                // Clean up this specific call, don't crash the whole peer
                removeRemoteAudio(targetPeerId);
                setActiveCalls(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(targetPeerId);
                    return newMap;
                });
            });

            setActiveCalls(prev => new Map(prev).set(targetPeerId, call));
        } catch (err) {
            console.error('Error calling peer:', err);
            // Don't let this crash the whole voice chat
        }
    };

    // Check if running on HTTPS (required for mobile)
    const isSecureContext = () => {
        return window.isSecureContext ||
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    };

    // Check microphone permission
    const checkMicrophonePermission = async () => {
        try {
            // Check if permissions API is available
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                return result.state; // 'granted', 'denied', or 'prompt'
            }
            return 'prompt'; // Default to prompt if API not available
        } catch (err) {
            console.log('Permissions API not supported, will try direct access');
            return 'prompt';
        }
    };

    // Request microphone permission with better error handling
    const requestMicrophoneAccess = async () => {
        try {
            // Check HTTPS first
            if (!isSecureContext()) {
                setVoiceError('Voice chat yêu cầu HTTPS. Trên điện thoại, bạn cần truy cập qua HTTPS hoặc localhost.');
                return null;
            }

            // Check if mediaDevices is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setVoiceError('Trình duyệt không hỗ trợ truy cập microphone. Vui lòng sử dụng Chrome, Firefox hoặc Safari phiên bản mới nhất.');
                return null;
            }

            console.log('Requesting microphone access...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 1 }
                }
            });

            console.log('Microphone access granted, tracks:', stream.getAudioTracks().length);
            setDebugInfo(`Mic OK: ${stream.getAudioTracks().length} track(s)`);

            // Setup Audio Analysis for Visualization
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioCtx = new AudioContext();
                const analyser = audioCtx.createAnalyser();
                const source = audioCtx.createMediaStreamSource(stream);
                
                source.connect(analyser);
                analyser.fftSize = 256;
                
                audioContextRef.current = audioCtx;
                analyserRef.current = analyser;

                // Start volume monitoring loop
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateVolume = () => {
                    if (!analyserRef.current) return;
                    analyserRef.current.getByteFrequencyData(dataArray);
                    
                    // simple average
                    let sum = 0;
                    for(let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;
                    
                    // Normalize to 0-1 range roughly
                    const vol = Math.min(1, average / 50); 
                    setMicVolume(vol);
                    
                    if (inVoiceChat || localStreamRef.current) {
                        volumeIntervalRef.current = requestAnimationFrame(updateVolume);
                    }
                };
                updateVolume();
                
            } catch (e) {
                console.error("Audio visualization setup failed", e);
            }

            return stream;
        } catch (err) {
            console.error('Microphone access error:', err.name, err.message);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setVoiceError('🎤 Quyền microphone bị từ chối.\n\n📱 Trên điện thoại:\n1. Mở Cài đặt Chrome\n2. Vào Site Settings > Microphone\n3. Cho phép trang web này');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setVoiceError('Không tìm thấy microphone. Vui lòng kết nối microphone.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setVoiceError('Microphone đang được sử dụng bởi ứng dụng khác. Hãy đóng các app khác đang dùng mic.');
            } else if (err.name === 'OverconstrainedError') {
                // Try with simpler constraints
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: false, 
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 48000,
                            channelCount: 1
                        } 
                    });
                    return stream;
                } catch (error) {
                    setVoiceError('Không thể sử dụng microphone.');
                }
            } else if (err.name === 'TypeError') {
                setVoiceError('Cần HTTPS để sử dụng microphone trên mobile.');
            } else if (err.name === 'AbortError') {
                setVoiceError('Yêu cầu microphone bị hủy. Vui lòng thử lại.');
            } else {
                setVoiceError(`Lỗi: ${err.name}\n${err.message || 'Không thể truy cập microphone'}`);
            }
            return null;
        }
    };

    // Join Voice Chat
    const joinVoiceChat = async () => {
        console.log('🎤 JOIN VOICE CHAT - Starting...');
        setVoiceError('');
        setShowPermissionDialog(false);

        // Check HTTPS first
        if (!isSecureContext()) {
            setVoiceError('Voice chat yêu cầu kết nối an toàn (HTTPS).\n\nTrên điện thoại, hãy đảm bảo bạn đang truy cập qua HTTPS.');
            return;
        }

        // Check PeerJS connection
        if (peerStatus !== 'connected') {
            setVoiceError('Đang kết nối đến server... Vui lòng đợi vài giây và thử lại.');
            console.error('❌ PeerJS not ready:', peerStatus);
            return;
        }

        console.log('✅ PeerJS ready, ID:', peerId);

        // Check permission status first
        const permissionStatus = await checkMicrophonePermission();
        console.log('🎤 Permission status:', permissionStatus);

        if (permissionStatus === 'denied') {
            setVoiceError('Quyền microphone đã bị từ chối.\n\n📱 Để bật lại trên Chrome Mobile:\n1. Nhấn vào biểu tượng 🔒 bên cạnh URL\n2. Nhấn "Quyền trang web"\n3. Cho phép Microphone');
            return;
        }

        if (permissionStatus === 'prompt') {
            setShowPermissionDialog(true);
        }

        try {
            setIsConnectingVoice(true);
            console.log('🎤 Requesting microphone access...');

            const stream = await requestMicrophoneAccess();

            if (!stream) {
                console.error('❌ No stream received');
                setIsConnectingVoice(false);
                setShowPermissionDialog(false);
                return;
            }

            console.log('✅ Stream acquired:', stream.id, 'Tracks:', stream.getAudioTracks().length);

            setShowPermissionDialog(false);
            setLocalStream(stream);
            localStreamRef.current = stream;
            setInVoiceChat(true);

            console.log('✅ Voice chat state updated, stream in ref');

            // Notify server
            console.log('📡 Notifying server: join_voice_chat');
            socket.emit('join_voice_chat', {
                room: userData.room,
                username: userData.username,
                peerId: peerId
            });

            // Wait a moment for voice chat users list
            setTimeout(() => {
                console.log('📡 Getting voice chat users list...');
                socket.emit('get_voice_chat_users', { room: userData.room }, (users) => {
                    console.log('📋 Voice chat users:', users);
                    setVoiceChatUsers(users || []);
                    // Call all existing users in voice chat
                    (users || []).forEach(user => {
                        if (user.peerId !== peerId && user.peerId) {
                            console.log('📞 Calling existing user:', user.username, user.peerId);
                            // Add small delay between calls to avoid overwhelming PeerJS
                            setTimeout(() => {
                                callPeer(user.peerId);
                            }, 100);
                        }
                    });
                });
                setIsConnectingVoice(false);
            }, 500);

        } catch (err) {
            console.error('❌ Error joining voice chat:', err);
            setVoiceError('Không thể tham gia voice chat. Vui lòng thử lại.');
            setIsConnectingVoice(false);
            setShowPermissionDialog(false);
        }
    };

    // Leave Voice Chat
    const leaveVoiceChat = () => {
        console.log('Leaving voice chat...');

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        localStreamRef.current = null;

        // Close all active calls
        activeCalls.forEach(call => call.close());
        setActiveCalls(new Map());

        // Clear remote audio refs
        Object.keys(remoteAudioRefs.current).forEach(key => {
            removeRemoteAudio(key);
        });

        // Cleanup visualization
        if (volumeIntervalRef.current) {
            cancelAnimationFrame(volumeIntervalRef.current);
            volumeIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setMicVolume(0);

        setInVoiceChat(false);
        setIsMuted(false);

        // Notify server
        socket.emit('leave_voice_chat', {
            room: userData.room,
            username: userData.username,
            peerId: peerId
        });
    };

    // Toggle Mute
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle typing indicator
    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing_start', { room: userData.room, username: userData.username });
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('typing_stop', { room: userData.room, username: userData.username });
        }, 1000);
    };

    // Send Message
    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        const sanitizedMessage = DOMPurify.sanitize(messageInput.trim());
        socket.emit('send_message', {
            message: sanitizedMessage,
            username: userData.username,
            room: userData.room
        });

        setMessageInput('');
        setIsTyping(false);
        socket.emit('typing_stop', { room: userData.room, username: userData.username });
    };

    // Handle File Upload
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation: 10MB limit
        if (file.size > MAX_FILE_SIZE) {
            setError('File exceeds 10MB limit.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('send_file', {
                fileData: reader.result,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                username: userData.username,
                room: userData.room
            });
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (inVoiceChat) {
                leaveVoiceChat();
            }
        };
    }, []);

    return (
        <div className="h-screen flex bg-dark-bg relative">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-dark-panel border border-neon-cyan/30 rounded-lg text-neon-cyan"
            >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Users List */}
            <div className={`
                fixed md:relative z-40 h-full
                w-72 md:w-64 bg-dark-panel border-r border-neon-cyan/20 flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-neon-cyan/20 mt-12 md:mt-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Ghost className="w-6 h-6 text-neon-cyan flex-shrink-0" />
                        <h2 className="font-bold text-neon-cyan truncate">{userData.room}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        <span>{roomUsers.length} user{roomUsers.length !== 1 ? 's' : ''} online</span>
                    </div>
                </div>

                {/* Voice Chat Section */}
                <div className="p-4 border-b border-neon-cyan/20">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Volume2 className="w-4 h-4" />
                            VOICE CHANNEL
                        </h3>
                        {voiceChatUsers.length > 0 && (
                            <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-0.5 rounded-full">
                                {voiceChatUsers.length} in call
                            </span>
                        )}
                    </div>

                    {/* Connection Status */}
                    <div className="mb-3 flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${peerStatus === 'connected' ? 'bg-neon-green' :
                            peerStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                            }`} />
                        <span className={`${peerStatus === 'connected' ? 'text-neon-green' :
                            peerStatus === 'connecting' ? 'text-yellow-500' :
                                'text-red-500'
                            }`}>
                            {peerStatus === 'connected' ? 'Sẵn sàng' :
                                peerStatus === 'connecting' ? 'Đang kết nối...' :
                                    'Lỗi kết nối'}
                        </span>
                        {debugInfo && (
                            <span className="text-gray-600 text-[10px] ml-auto truncate max-w-20">
                                {debugInfo}
                            </span>
                        )}
                    </div>

                    {/* HTTPS Warning for mobile */}
                    {!window.isSecureContext && window.location.hostname !== 'localhost' && (
                        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-400">
                                Cần HTTPS để voice chat trên mobile
                            </p>
                        </div>
                    )}

                    {/* Voice Error Message */}
                    {voiceError && (
                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-xs text-red-400 break-words">{voiceError}</p>
                            <button
                                onClick={() => setVoiceError('')}
                                className="text-xs text-gray-500 hover:text-gray-400 mt-1"
                            >
                                Đóng
                            </button>
                        </div>
                    )}

                    {/* Permission Dialog */}
                    {showPermissionDialog && (
                        <div className="mb-3 p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Mic className="w-4 h-4 text-neon-cyan" />
                                <p className="text-xs text-neon-cyan font-bold">Yêu cầu quyền truy cập</p>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                                Vui lòng cho phép truy cập microphone khi trình duyệt hỏi.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPermissionDialog(false)}
                                    className="text-xs text-gray-500 hover:text-gray-400"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}

                    {inVoiceChat ? (
                        <div className="space-y-2">
                            {/* Voice Chat Users */}
                            <div className="space-y-1 mb-3 max-h-24 overflow-y-auto">
                                {voiceChatUsers.map((user) => {
                                    const isMe = user.peerId === peerId;
                                    const userVolume = isMe ? micVolume : (remoteVolumes[user.peerId] || 0);
                                    const isSpeaking = userVolume > 0.1;
                                    
                                    return (
                                        <div
                                            key={user.peerId}
                                            className="relative flex items-center gap-2 text-sm text-gray-300 px-2 py-1 rounded bg-neon-green/10 transition-all duration-100"
                                            style={{
                                                backgroundColor: isSpeaking ? `rgba(0, 255, 65, ${0.1 + userVolume * 0.2})` : undefined
                                            }}
                                        >
                                            {/* Speaking Indicator with Volume Visualization */}
                                            <div className="relative">
                                                <div 
                                                    className="w-2 h-2 rounded-full bg-neon-green"
                                                    style={{
                                                        boxShadow: isSpeaking ? `0 0 ${8 + userVolume * 12}px rgba(0, 255, 65, ${0.6 + userVolume * 0.4})` : undefined
                                                    }}
                                                />
                                                {/* Animated pulse ring when speaking */}
                                                {isSpeaking && (
                                                    <div 
                                                        className="absolute inset-0 rounded-full border-2 border-neon-green animate-ping"
                                                        style={{
                                                            opacity: userVolume * 0.6,
                                                            animationDuration: '1s'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            
                                            <span 
                                                className="truncate transition-all duration-100"
                                                style={{
                                                    fontWeight: isSpeaking ? '600' : '400',
                                                    color: isSpeaking ? '#00ff41' : undefined
                                                }}
                                            >
                                                {user.username}
                                            </span>
                                            
                                            {isMe && (
                                                <span className="text-xs text-gray-500">(you)</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Voice Controls */}
                            <div className="flex gap-2">
                                <button
                                    onClick={toggleMute}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${isMuted
                                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                        : 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                                        }`}
                                >
                                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    <span className="text-xs">{isMuted ? 'Muted' : 'Unmute'}</span>
                                    {/* Mic Visualizer Ring */}
                                    {!isMuted && (
                                        <div 
                                            className="absolute inset-0 rounded-lg border-2 border-neon-green pointer-events-none transition-all duration-75"
                                            style={{
                                                opacity: micVolume + 0.2,
                                                transform: `scale(${1 + micVolume * 0.1})`,
                                                borderColor: `rgba(0, 255, 65, ${micVolume})`
                                            }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={leaveVoiceChat}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                    <PhoneOff className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={joinVoiceChat}
                                disabled={isConnectingVoice}
                                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg hover:bg-neon-green/20 transition-colors disabled:opacity-50"
                            >
                                {isConnectingVoice ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin" />
                                        <span className="text-sm">Connecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm">Join Voice Chat</span>
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                                <Headphones className="w-3 h-3" />
                                Đeo tai nghe để tránh bị vọng tiếng
                            </p>
                        </>
                    )}
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        ACTIVE USERS
                    </h3>
                    <div className="space-y-2">
                        {roomUsers.map((user) => (
                            <div
                                key={user.id}
                                className={`flex items-center gap-3 p-2 rounded-lg ${user.id === socket.id
                                    ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                                    : 'bg-dark-surface/50'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${user.id === socket.id ? 'text-neon-cyan' : 'text-white'
                                        }`}>
                                        {user.username}
                                        {user.id === socket.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                                    </p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-neon-green flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-neon-cyan/20 space-y-2">
                    <button
                        onClick={() => {
                            setShowSettings(true);
                            setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-surface/50 rounded-lg transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                    <button
                        onClick={() => {
                            if (inVoiceChat) leaveVoiceChat();
                            handleLeaveRoom();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        
                        Leave the room
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col w-full">
                {/* Chat Header */}
                <div className="h-16 bg-dark-panel border-b border-neon-cyan/20 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-4 ml-12 md:ml-0">
                        <h1 className="text-base md:text-xl font-bold text-white truncate">
                            <span className="hidden sm:inline">Room name: </span>
                            <span className="text-neon-cyan">{userData.room}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Voice Chat Status Indicator */}
                        {inVoiceChat && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-neon-green/10 border border-neon-green/30 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                <span className="text-xs text-neon-green hidden sm:inline">In Voice</span>
                            </div>
                        )}

                        {/* Quick Voice Toggle Button (Mobile) */}
                        <button
                            onClick={inVoiceChat ? leaveVoiceChat : joinVoiceChat}
                            disabled={isConnectingVoice}
                            className={`p-2 rounded-lg transition-colors md:hidden ${inVoiceChat
                                ? 'text-red-500 hover:bg-red-500/10'
                                : 'text-gray-400 hover:text-neon-green hover:bg-neon-green/10'
                                }`}
                        >
                            {inVoiceChat ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Ghost className="w-16 h-16 mb-4 opacity-30" />
                            <p className="text-sm text-center px-4">No messages yet. Start the conversation...</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        if (msg.type === 'system') {
                            return (
                                <div key={msg.id} className="flex justify-center">
                                    <div className="message-system px-4 py-2 text-xs md:text-sm">
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        }

                        // More robust check: compare both socket ID and username
                        // Fallback to username if socket.id doesn't match (handles reconnection)
                        const isOwn = msg.senderId === socket.id || msg.sender === userData.username;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'message-own' : 'message-other'} p-3 md:p-4`}>
                                    {!isOwn && (
                                        <p className={`text-xs font-bold mb-1 ${isOwn ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                                            {msg.sender}
                                        </p>
                                    )}

                                    {msg.type === 'image' && (
                                        <img
                                            src={msg.content}
                                            alt={msg.fileName}
                                            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                                            onClick={() => window.open(msg.content, '_blank')}
                                        />
                                    )}

                                    {msg.type === 'file' && (
                                        <div className="flex items-center gap-3 bg-dark-bg/50 p-3 rounded-lg mb-2">
                                            <Paperclip className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">{msg.fileName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(msg.fileSize / 1024).toFixed(2)} KB
                                                </p>
                                            </div>
                                            <a
                                                href={msg.content}
                                                download={msg.fileName}
                                                className="p-2 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    )}

                                    {msg.type === 'text' && (
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    )}

                                    <p className="text-xs text-gray-500 mt-2 text-right">
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs md:text-sm truncate">
                                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error Toast */}
                {error && (
                    <div className="fixed top-4 left-4 right-4 md:absolute md:top-20 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-md bg-red-500/95 text-white px-4 py-3 rounded-lg flex items-start gap-3 animate-fadeInUp z-50 shadow-lg backdrop-blur-sm">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm break-words whitespace-pre-wrap">{error}</p>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-dark-panel border-t border-neon-cyan/20">
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* File Upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 md:p-3 text-gray-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                fileInputRef.current.accept = 'image/*';
                                fileInputRef.current?.click();
                            }}
                            className="hidden sm:block p-2 md:p-3 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Image className="w-5 h-5" />
                        </button>

                        {/* Message Input */}
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => {
                                setMessageInput(e.target.value);
                                handleTyping();
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type your message..."
                            className="flex-1 min-w-0 bg-dark-bg/50 border border-neon-cyan/30 rounded-lg px-3 md:px-4 py-2 md:py-3 text-white placeholder-gray-500 outline-none focus:border-neon-cyan transition-colors text-sm md:text-base"
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            className="p-2 md:p-3 bg-neon-cyan text-dark-bg rounded-lg hover:bg-neon-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    {/* File Size Warning */}
                    <p className="text-xs text-gray-500 mt-2 text-center hidden md:block">
                        Max file size: 10MB
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
