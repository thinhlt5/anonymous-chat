import React from 'react';
import {
    Terminal,
    Plus,
    LogIn,
    ChevronLeft,
} from 'lucide-react';

const ModeView = ({ userData, navigateTo, goBack }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
            <div className="glass-panel p-8 max-w-md w-full animate-fadeInUp">
                {/* Back Button */}
                <button
                    onClick={goBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors mb-6"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm">RETURN</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Terminal className="w-8 h-8 text-neon-green" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        OPERATION MODE
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Welcome, <span className="text-neon-cyan">{userData.username}</span>
                    </p>
                </div>

                {/* Options */}
                <div className="space-y-4">
                    {/* Create Room */}
                    <button
                        onClick={() => navigateTo('CREATE')}
                        className="w-full glass-panel p-6 text-left hover-card group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                                <Plus className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neon-cyan">CREATE OPERATION</h3>
                                <p className="text-sm text-gray-400">Initialize a new secure channel</p>
                            </div>
                        </div>
                    </button>

                    {/* Join Room */}
                    <button
                        onClick={() => navigateTo('JOIN')}
                        className="w-full glass-panel-pink p-6 text-left hover-card group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center group-hover:bg-neon-pink/20 transition-colors">
                                <LogIn className="w-6 h-6 text-neon-pink" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neon-pink">JOIN OPERATION</h3>
                                <p className="text-sm text-gray-400">Connect to existing channel</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Status */}
                <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        SECURE CONNECTION
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModeView;
