import React from 'react';
import {
    User,
    ChevronLeft,
    Eye,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react';

const IdentityView = ({ userData, setUserData, navigateTo, goBack, error, setError }) => {
    const handleConfirm = () => {
        if (!userData.username.trim()) {
            setError('Alias required for operation.');
            return;
        }
        setError('');
        navigateTo('MODE');
    };

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
                    <User className="w-16 h-16 mx-auto text-neon-pink mb-4" />
                    <h2 className="text-2xl font-bold text-neon-pink">
                        CHOOSE YOUR NICKNAME
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">
                        Select your nickname to continue
                    </p>
                </div>

                {/* Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-neon-cyan text-sm mb-2 tracking-wider">
                            NICKNAME:
                        </label>
                        <input
                            type="text"
                            value={userData.username}
                            onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && userData.username.trim() && handleConfirm()}
                            placeholder="Enter your nickname..."
                            className="input-cyber"
                            autoFocus
                            maxLength={20}
                        />
                    </div>

                    {/* Character Count */}
                    <div className="text-right text-xs text-gray-500">
                        {userData.username.length}/20
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleConfirm}
                        disabled={!userData.username.trim()}
                        className="btn-neon-solid w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="w-5 h-5" />
                        CONFIRM
                    </button>
                </div>

                {/* Security Notice */}
                <div className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    Your nickname is only visible to <br/>people in the room.
                </div>
            </div>
        </div>
    );
};

export default IdentityView;
