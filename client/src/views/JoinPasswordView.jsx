import React, { useState } from 'react';
import {
    Lock,
    Unlock,
    Terminal,
    ChevronLeft,
    Eye,
    EyeOff,
    Loader2,
    XCircle,
} from 'lucide-react';

const JoinPasswordView = ({
    userData,
    setUserData,
    goBack,
    error,
    isLoading,
    joinRoom
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
            <div className="glass-panel p-8 max-w-md w-full animate-fadeInUp border-neon-yellow/30">
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
                    <Lock className="w-12 h-12 mx-auto text-neon-yellow mb-4" />
                    <h2 className="text-2xl font-bold text-neon-yellow">
                        ENCRYPTED CHANNEL
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">
                        This operation requires authentication
                    </p>
                </div>

                {/* Room Info */}
                <div className="bg-dark-bg/50 rounded-lg p-4 mb-6 border border-neon-cyan/20">
                    <div className="flex items-center gap-2 text-sm">
                        <Terminal className="w-4 h-4 text-neon-cyan" />
                        <span className="text-gray-400">Operation:</span>
                        <span className="text-neon-cyan font-bold">{userData.room}</span>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Password Input */}
                    <div>
                        <label className="block text-neon-yellow text-sm mb-2 tracking-wider flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            DECRYPTION KEY:
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={userData.password}
                                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && userData.password && joinRoom()}
                                placeholder="Enter access password..."
                                className="input-cyber pr-12"
                                autoFocus
                                maxLength={50}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-cyan transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={joinRoom}
                        disabled={isLoading || !userData.password}
                        className="btn-neon-solid w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                DECRYPTING...
                            </>
                        ) : (
                            <>
                                <Unlock className="w-5 h-5" />
                                DECRYPT & CONNECT
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinPasswordView;
