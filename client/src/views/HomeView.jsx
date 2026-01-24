import React from 'react';
import {
    Ghost,
    Shield,
    Terminal,
    Skull,
    Zap,
} from 'lucide-react';

const HomeView = ({ navigateTo }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 cyber-grid relative overflow-hidden">

            <div className="glass-panel p-8 md:p-12 max-w-lg w-full text-center animate-fadeInUp relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-pink/5 rounded-lg" />

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neon-cyan text-glow-cyan mb-2 animate-flicker">
                    ANONYMOUS CHAT
                </h1>

                {/* Terminal Output Effect */}
                <div className="bg-dark-bg/50 rounded-lg p-4 mb-8 text-left border border-neon-green/20">
                    <div className="flex items-center gap-2 text-neon-green text-sm font-mono">
                        <Terminal className="w-4 h-4" />
                        <span className="opacity-70">root@ghost:~$</span>
                        <span className="terminal-text">system_status</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                        <p className="text-neon-green">▸ Private & Secure</p>
                        <p className="text-neon-cyan">▸ No history, no logs, no digital footprint</p>
                        <p className="text-neon-pink">▸ Auto delete on exit</p>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={() => navigateTo('NAME')}
                    className="btn-neon w-full flex items-center justify-center gap-3 text-lg"
                >
                    <Zap className="w-5 h-5" />
                    GET STARTED
                </button>

                {/* Footer */}
                <div className="mt-8 text-xs text-gray-600 flex items-center justify-center gap-2">
                    <span>NO LOGS - NO TRACES - JUST TALK</span>
                </div>
            </div>
        </div>
    );
};

export default HomeView;
