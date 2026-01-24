import React from 'react';
import {
    Settings,
    User,
    Volume2,
    VolumeX,
    Moon,
    Skull,
    X,
} from 'lucide-react';

const SettingsModal = ({
    userData,
    settings,
    setSettings,
    setShowSettings,
    handleLeaveRoom
}) => {
    return (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div
                className="glass-panel p-8 max-w-md w-full animate-zoomIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-neon-cyan" />
                        <h2 className="text-xl font-bold text-white">SYSTEM SETTINGS</h2>
                    </div>
                    <button
                        onClick={() => setShowSettings(false)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-surface/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Settings Options */}
                <div className="space-y-6">
                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-lg border border-neon-cyan/20">
                        <div className="flex items-center gap-3">
                            {settings.soundEnabled ? (
                                <Volume2 className="w-5 h-5 text-neon-green" />
                            ) : (
                                <VolumeX className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                                <p className="font-medium">Sound Effects</p>
                                <p className="text-xs text-gray-500">Notification sounds</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.soundEnabled ? 'bg-neon-green' : 'bg-gray-600'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>

                    {/* Theme Toggle (Visual only) */}
                    <div className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-lg border border-neon-cyan/20">
                        <div className="flex items-center gap-3">
                            <Moon className="w-5 h-5 text-neon-purple" />
                            <div>
                                <p className="font-medium">Dark Mode</p>
                                <p className="text-xs text-gray-500">Cyberpunk theme</p>
                            </div>
                        </div>
                        <div className="text-xs text-neon-cyan px-2 py-1 bg-neon-cyan/10 rounded">
                            ALWAYS ON
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="p-4 bg-dark-bg/50 rounded-lg border border-neon-pink/20">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="w-5 h-5 text-neon-pink" />
                            <p className="font-medium">Current Session</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Your nickname:</span>
                                <span className="text-neon-cyan">{userData.username}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Room name:</span>
                                <span className="text-neon-pink">{userData.room}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
