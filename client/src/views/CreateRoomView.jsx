import React, { useState } from 'react';
import {
    Plus,
    Lock,
    Shield,
    ChevronLeft,
    Eye,
    EyeOff,
    Zap,
    Loader2,
    AlertTriangle,
} from 'lucide-react';

const CreateRoomView = ({
    userData,
    setUserData,
    goBack,
    error,
    isLoading,
    handleCreateRoom
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
            <div className="glass-panel p-8 max-w-md w-full animate-fadeInUp">
                {/* Back Button */}
                <button
                    onClick={goBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors mb-6"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm">GO BACK</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <Plus className="w-12 h-12 mx-auto text-neon-cyan mb-4" />
                    <h2 className="text-2xl font-bold text-neon-cyan">
                        NEW PRIVATE ROOM
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">
                        Open a safe place to chat with anyone
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Room Name */}
                    <div>
                        <label className="block text-neon-cyan text-sm mb-2 tracking-wider">
                            ROOM NAME:
                        </label>
                        <input
                            type="text"
                            value={userData.room}
                            onChange={(e) => setUserData({ ...userData, room: e.target.value })}
                            placeholder="Give your room a name..."
                            className="input-cyber"
                            maxLength={30}
                        />
                    </div>

                    {/* Password (Optional) */}
                    <div>
                        <label className="block text-neon-pink text-sm mb-2 tracking-wider flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            ROOM PASSWORD (Optional):
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={userData.password}
                                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                placeholder="Set room password..."
                                className="input-cyber-pink pr-12"
                                maxLength={50}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-pink transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Keep it empty for a public room
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleCreateRoom}
                        disabled={isLoading || !userData.room.trim()}
                        className="btn-neon-solid w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                INITIALIZING...
                            </>
                        ) : (
                            <>
                                CREATE ROOM
                            </>
                        )}
                    </button>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-neon-green/5 border border-neon-green/20 rounded-lg">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-400">
                            <p className="text-neon-green font-bold mb-1">AUTO-CLEANUP ACTIVE</p>
                            <p>The room and all messages vanish when everyone leaves.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRoomView;
