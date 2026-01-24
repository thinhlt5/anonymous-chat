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

        // Monitor connection state
        call.peerConnection.oniceconnectionstatechange = () => {
            const state = call.peerConnection.iceConnectionState;
            console.log(`📡 Outgoing Call ICE State (${remotePeerId}): ${state}`);
        };

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
        
        // Debug track status
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log(`🎵 Track enabled: ${audioTracks[0].enabled}, Muted: ${audioTracks[0].muted}, State: ${audioTracks[0].readyState}`);
            audioTracks[0].onmute = () => console.warn(`🔇 Track muted by network/peer: ${remotePeerId}`);
            audioTracks[0].onunmute = () => console.log(`🔈 Track unmuted: ${remotePeerId}`);
        } else {
            console.warn('⚠️ No audio tracks in remote stream!');
        }

        // Remove old video if exists
        if (remoteVideosRef.current[remotePeerId]) {
            remoteVideosRef.current[remotePeerId].remove();
        }

        // Create hidden video/audio element
        const video = document.createElement('audio'); // Changed to audio tag for clarity
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = true; // Temporary for debug
        video.volume = 1.0;
        
        // Hide it visually but keep it in DOM
        video.style.position = 'fixed';
        video.style.bottom = '0';
        video.style.right = '0';
        video.style.opacity = '0.5'; // Visible for debug
        video.style.zIndex = '9999';
        
        document.body.appendChild(video);
        remoteVideosRef.current[remotePeerId] = video;

        // Play with robust retry logic
        const tryPlay = async () => {
            try {
                await video.play();
                console.log('✅ Audio playback started for:', remotePeerId);
            } catch (err) {
                console.warn('⚠️ Autoplay blocked for:', remotePeerId, err);
                
                // Show a toast or UI hint to user
                const btn = document.createElement('button');
                btn.innerText = `🔇 Click to hear ${remotePeerId.substr(0,4)}`;
                btn.style.position = 'fixed';
                btn.style.top = '10px';
                btn.style.left = '50%';
                btn.style.transform = 'translateX(-50%)';
                btn.style.zIndex = '10000';
                btn.style.padding = '10px 20px';
                btn.style.background = '#ff4444';
                btn.style.color = 'white';
                btn.style.borderRadius = '50px';
                btn.style.border = 'none';
                btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                
                btn.onclick = () => {
                    video.play();
                    btn.remove();
                    console.log('🔊 User manually started playback');
                };
                document.body.appendChild(btn);
            }
        };
        
        tryPlay();
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

            // Listen for connection state changes (Critical for debugging WAN issues)
            call.peerConnection.oniceconnectionstatechange = () => {
                const state = call.peerConnection.iceConnectionState;
                console.log(`📡 ICE State (${remotePeerId}): ${state}`);
                
                if (state === 'failed' || state === 'disconnected') {
                    console.error(`❌ Connection failed with ${remotePeerId}. Possible TURN server issue.`);
                    // Optional: Retry logic could go here
                }
                if (state === 'connected') {
                    console.log(`✅ P2P Connection established with ${remotePeerId}!`);
                }
            };
            
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
