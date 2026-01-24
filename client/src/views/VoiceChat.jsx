import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Mic, MicOff } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_LIVEKIT_URL;

// Custom simple Mic Button component to avoid LayoutContext dependency
const SimpleVoiceControls = () => {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = async () => {
    if (localParticipant) {
        const newState = !isMuted;
        await localParticipant.setMicrophoneEnabled(!newState);
        setIsMuted(newState);
    }
  };

  // Initial state sync
  useEffect(() => {
    if (localParticipant) {
        setIsMuted(!localParticipant.isMicrophoneEnabled);
    }
  }, [localParticipant]);

  return (
    <div className="flex items-center gap-4">
        <button 
            onClick={toggleMute}
            className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30 animate-pulse'}`}
            title={isMuted ? "Unmute" : "Mute"}
        >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <div className="text-xs text-gray-400">
            {isMuted ? "Mic Off" : "Connected"}
        </div>
    </div>
  );
};

export const VoiceChat = ({ roomName, username }) => {
    const [token, setToken] = useState("");

    useEffect(() => {
        if (!roomName || !username) return;

        const getToken = async () => {
            try {
                const apiBase = window.location.hostname === 'localhost' 
                    ? 'http://localhost:3001' 
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

    if (!token) return <div className="text-xs text-gray-500 animate-pulse">Getting token...</div>;

    return (
        <div className="flex flex-col items-center gap-2 p-3 bg-dark-surface/50 rounded-xl border border-neon-cyan/20">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={SERVER_URL}
                connect={true}
                data-lk-theme="default"
            >
                <RoomAudioRenderer />
                
                {/* Custom Controls */}
                <SimpleVoiceControls />
                
            </LiveKitRoom>
        </div>
    );
};
