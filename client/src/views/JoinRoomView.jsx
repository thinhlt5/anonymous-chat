import React from 'react';
import {
    LogIn,
    ChevronLeft,
    Loader2,
    AlertTriangle,
} from 'lucide-react';

const JoinRoomView = ({
    userData,
    setUserData,
    goBack,
    error,
    isLoading,
    handleCheckRoom
}) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
            <div className="glass-panel-pink p-8 max-w-md w-full animate-fadeInUp">
                {/* Back Button */}
                <button
                    onClick={goBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-neon-pink transition-colors mb-6"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm">GO BACK</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <LogIn className="w-12 h-12 mx-auto text-neon-pink mb-4" />
                    <h2 className="text-2xl font-bold text-neon-pink">
                        JOIN A ROOM
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">
                        Enter the room name to connect
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Room Name */}
                    <div>
                        <label className="block text-neon-pink text-sm mb-2 tracking-wider">
                            ROOM NAME:
                        </label>
                        <input
                            type="text"
                            value={userData.room}
                            onChange={(e) => setUserData({ ...userData, room: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && userData.room.trim() && handleCheckRoom()}
                            placeholder="Enter room name..."
                            className="input-cyber-pink"
                            autoFocus
                            maxLength={30}
                        />
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
                        onClick={handleCheckRoom}
                        disabled={isLoading || !userData.room.trim()}
                        className="btn-neon-pink w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                SCANNING...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                CONNECT TO ROOM
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinRoomView;
