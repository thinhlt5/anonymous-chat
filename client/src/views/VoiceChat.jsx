import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Mic, MicOff, PhoneOff, Users } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_LIVEKIT_URL;

const ActiveUsers = () => {
    const participants = useParticipants();
    
    return (
        <div className="w-full mb-2">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                 <Users className="w-3 h-3" /> In Voice ({participants.length})
            </h4>
            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                {participants.map((p) => (
                    <div key={p.identity} className="flex items-center gap-1.5 bg-dark-bg/60 px-2 py-1.5 rounded-md text-xs text-gray-300 border border-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? 'bg-neon-green animate-pulse' : 'bg-gray-500'}`} />
                        <span className="max-w-[120px] truncate font-medium">{p.identity}</span>
                    </div>
                ))}
                {participants.length === 0 && <div className="text-[10px] text-gray-600 italic px-1">Connecting...</div>}
            </div>
        </div>
    );
};

// Custom simple Mic Button component to avoid LayoutContext dependency
const VoiceControls = ({ onDisconnect }) => {
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
    <div className="flex items-center gap-2 w-full pt-2 border-t border-white/5">
        <button 
            onClick={toggleMute}
            className={`p-2.5 rounded-lg transition-all flex-shrink-0 border ${
                isMuted 
                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' 
                    : 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20 hover:bg-neon-cyan/20'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
        >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        
        <button
            onClick={onDisconnect}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
        >
            <PhoneOff className="w-4 h-4" />
            <span className="text-xs font-semibold">Disconnect</span>
        </button>
    </div>
  );
};

export const VoiceChat = ({ roomName, username, onDisconnect }) => {
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

    useEffect(() => {
         console.log("🔗 LiveKit URL:", SERVER_URL); // Debug log
    }, []);

    if (!token) return <div className="text-xs text-gray-500 animate-pulse p-4 text-center">Getting token...</div>;
    if (!SERVER_URL) return (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-xs text-center">
            <p className="font-bold">Configuration Error</p>
            <p>Missing VITE_LIVEKIT_URL in Vercel Env Vars.</p>
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-2 p-3 bg-dark-surface/80 backdrop-blur-sm rounded-xl border border-neon-cyan/20 shadow-lg">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={SERVER_URL}
                connect={true}
                data-lk-theme="default"
                style={{ width: '100%' }}
            >
                <RoomAudioRenderer />
                
                <ActiveUsers />
                <VoiceControls onDisconnect={onDisconnect} />
                
            </LiveKitRoom>
        </div>
    );
};
