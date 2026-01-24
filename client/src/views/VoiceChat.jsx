import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  TrackLoop,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';

const SERVER_URL = import.meta.env.VITE_LIVEKIT_URL; // Gets from .env

export const VoiceChat = ({ roomName, username }) => {
    const [token, setToken] = useState("");

    useEffect(() => {
        if (!roomName || !username) return;

        // Get Token from our Backend
        const getToken = async () => {
            try {
                // Determine API URL based on environment
                const apiBase = window.location.hostname === 'localhost' 
                    ? 'http://localhost:3000' 
                    : 'https://anonymous-chat-w798.onrender.com';

                const resp = await fetch(`${apiBase}/api/get-token?room=${roomName}&username=${username}`);
                const data = await resp.json();
                setToken(data.token);
            } catch (e) {
                console.error("Failed to get token:", e);
            }
        };

        getToken();
    }, [roomName, username]);

    if (!token) return <div className="text-xs text-gray-500">Connecting to voice...</div>;
    // if (!SERVER_URL) return <div className="text-xs text-red-500">Wait VITE_LIVEKIT_URL</div>;

    return (
        <div className="flex flex-col items-center gap-2 p-2 bg-dark-surface/30 rounded-lg">
             {/* Main LiveKit Room Component */}
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={SERVER_URL}
                connect={true}
                data-lk-theme="default"
                style={{ height: 'auto' }} // Override default heavy style
            >
                {/* Automatically plays audio from all users */}
                <RoomAudioRenderer />
                
                {/* Standard controls: Mic, Speaker settings */}
                <ControlBar 
                    controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: false, settings: true }} 
                    variation="minimal"
                />
            </LiveKitRoom>
        </div>
    );
};
