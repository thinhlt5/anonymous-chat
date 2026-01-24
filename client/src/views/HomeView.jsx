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
            {/* Ambient Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-neon-cyan rounded-full opacity-50"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <div className="glass-panel p-8 md:p-12 max-w-lg w-full text-center animate-fadeInUp relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-pink/5 rounded-lg" />

                {/* Logo */}
                <div className="relative mb-8">
                    <Ghost className="w-24 h-24 mx-auto text-neon-cyan animate-pulse-glow" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border border-neon-cyan/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neon-cyan text-glow-cyan mb-2 animate-flicker">
                    GHOST PROTOCOL
                </h1>
                <p className="text-gray-400 mb-2 tracking-widest text-xs sm:text-sm">
                    ANONYMOUS ENCRYPTION LAYER v1.0
                </p>
                <p className="text-neon-green/70 text-xs mb-8 flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span>ZERO DIGITAL FOOTPRINT</span>
                </p>

                {/* Terminal Output Effect */}
                <div className="bg-dark-bg/50 rounded-lg p-4 mb-8 text-left border border-neon-green/20">
                    <div className="flex items-center gap-2 text-neon-green text-sm font-mono">
                        <Terminal className="w-4 h-4" />
                        <span className="opacity-70">root@ghost:~$</span>
                        <span className="terminal-text">system_status</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                        <p className="text-neon-green">▸ Encryption: AES-256-GCM</p>
                        <p className="text-neon-cyan">▸ Network: TOR-Compatible</p>
                        <p className="text-neon-pink">▸ Memory: RAM-Only (Self-Destruct)</p>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={() => navigateTo('NAME')}
                    className="btn-neon w-full flex items-center justify-center gap-3 text-lg"
                >
                    <Zap className="w-5 h-5" />
                    INITIALIZE SYSTEM
                </button>

                {/* Footer */}
                <div className="mt-8 text-xs text-gray-600 flex items-center justify-center gap-2">
                    <Skull className="w-4 h-4" />
                    <span>NO LOGS • NO TRACES • NO EVIDENCE</span>
                </div>
            </div>
        </div>
    );
};

export default HomeView;
