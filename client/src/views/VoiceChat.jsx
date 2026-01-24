import { useState, useEffect, useRef } from 'react';

/**
 * Simple Voice Chat Hook
 * Handles microphone access and peer-to-peer calling
 */
export const useVoiceChat = (socket, peer, peerId, roomName, username) => {
    const [inVoiceChat, setInVoiceChat] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceChatUsers, setVoiceChatUsers] = useState([]);
    
    const localStreamRef = useRef(null);
    const activeCallsRef = useRef(new Map());
    const remoteVideosRef = useRef({});

    // Join voice chat
    const joinVoiceChat = async () => {
        try {
            console.log('🎤 Joining voice chat...');
            
            // Request microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            console.log('✅ Microphone granted');
            localStreamRef.current = stream;
            setInVoiceChat(true);

            // Notify server
            socket.emit('join_voice_chat', {
                room: roomName,
                username: username,
                peerId: peerId
            });

            // Get existing users and call them
            setTimeout(() => {
                socket.emit('get_voice_chat_users', { room: roomName }, (users) => {
                    console.log('📋 Voice users:', users);
                    setVoiceChatUsers(users || []);
                    
                    // Call each user
                    users.forEach(user => {
                        if (user.peerId !== peerId && user.peerId) {
                            console.log('📞 Calling', user.username);
                            callPeer(user.peerId);
                        }
                    });
                });
            }, 500);

        } catch (err) {
            console.error('❌ Microphone error:', err);
            alert('Cannot access microphone. Please allow microphone permission.');
        }
    };

    // Call a peer
    const callPeer = (remotePeerId) => {
        if (!localStreamRef.current || !peer) return;
        
        console.log('📞 Calling peer:', remotePeerId);
        const call = peer.call(remotePeerId, localStreamRef.current);
        
        if (!call) {
            console.warn('❌ Failed to initiate call to', remotePeerId);
            return;
        }

        call.on('stream', (remoteStream) => {
            console.log('📥 Received stream from:', remotePeerId);
            playRemoteStream(remotePeerId, remoteStream);
        });

        call.on('error', (err) => {
            console.error('Call error:', err);
        });

        activeCallsRef.current.set(remotePeerId, call);
    };

    // Play remote stream
    const playRemoteStream = (remotePeerId, stream) => {
        console.log('🔊 Playing stream from:', remotePeerId);
        
        // Remove old video if exists
        if (remoteVideosRef.current[remotePeerId]) {
            remoteVideosRef.current[remotePeerId].remove();
        }

        // Create hidden video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false;
        video.volume = 1.0;
        
        // Hide it
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        
        document.body.appendChild(video);
        remoteVideosRef.current[remotePeerId] = video;

        // Play with retry
        video.play()
            .then(() => console.log('✅ Playing audio from:', remotePeerId))
            .catch(err => {
                console.warn('Autoplay blocked, click page to unlock');
                const unlock = () => {
                    video.play();
                    document.removeEventListener('click', unlock);
                    document.removeEventListener('touchstart', unlock);
                };
                document.addEventListener('click', unlock, { once: true });
                document.addEventListener('touchstart', unlock, { once: true });
            });
    };

    // Leave voice chat
    const leaveVoiceChat = () => {
        console.log('👋 Leaving voice chat');

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Close all calls
        activeCallsRef.current.forEach(call => call.close());
        activeCallsRef.current.clear();

        // Remove all remote videos
        Object.values(remoteVideosRef.current).forEach(video => video.remove());
        remoteVideosRef.current = {};

        setInVoiceChat(false);

        // Notify server
        socket.emit('leave_voice_chat', { room: roomName });
    };

    // Toggle mute
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Listen for incoming calls
    useEffect(() => {
        if (!peer) return;

        const handleIncomingCall = (call) => {
            console.log('📞 Incoming call from:', call.peer);
            
            if (!localStreamRef.current) {
                console.warn('No local stream to answer with');
                return;
            }

            // Answer with our stream
            call.answer(localStreamRef.current);

            // Listen for their stream
            call.on('stream', (remoteStream) => {
                console.log('📥 Received stream from:', call.peer);
                playRemoteStream(call.peer, remoteStream);
            });

            activeCallsRef.current.set(call.peer, call);
        };

        peer.on('call', handleIncomingCall);

        return () => {
            peer.off('call', handleIncomingCall);
        };
    }, [peer]);

    // Listen for socket events
    useEffect(() => {
        if (!socket) return;

        const handleVoiceChatUsers = (users) => {
            setVoiceChatUsers(users || []);
        };

        const handleUserJoinedVoice = ({ peerId: newPeerId, username }) => {
            console.log('👤 User joined voice:', username);
            
            // Call them if we're in voice chat
            if (inVoiceChat && localStreamRef.current && newPeerId !== peerId) {
                setTimeout(() => callPeer(newPeerId), 500);
            }

            // Refresh list
            socket.emit('get_voice_chat_users', { room: roomName }, handleVoiceChatUsers);
        };

        const handleUserLeftVoice = ({ peerId: leftPeerId }) => {
            console.log('👋 User left voice');
            
            // Remove their video
            if (remoteVideosRef.current[leftPeerId]) {
                remoteVideosRef.current[leftPeerId].remove();
                delete remoteVideosRef.current[leftPeerId];
            }

            // Close call
            const call = activeCallsRef.current.get(leftPeerId);
            if (call) {
                call.close();
                activeCallsRef.current.delete(leftPeerId);
            }

            socket.emit('get_voice_chat_users', { room: roomName }, handleVoiceChatUsers);
        };

        socket.on('voice_chat_users', handleVoiceChatUsers);
        socket.on('user_joined_voice', handleUserJoinedVoice);
        socket.on('user_left_voice', handleUserLeftVoice);

        return () => {
            socket.off('voice_chat_users', handleVoiceChatUsers);
            socket.off('user_joined_voice', handleUserJoinedVoice);
            socket.off('user_left_voice', handleUserLeftVoice);
        };
    }, [socket, inVoiceChat, peerId, roomName]);

    return {
        inVoiceChat,
        isMuted,
        voiceChatUsers,
        joinVoiceChat,
        leaveVoiceChat,
        toggleMute
    };
};
