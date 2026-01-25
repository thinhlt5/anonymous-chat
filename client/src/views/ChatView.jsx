import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { VoiceChat } from './VoiceChat';
import {
    Ghost,
    Send,
    Paperclip,
    Image,
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Settings,
    LogOut,
    Download,
    AlertTriangle,
    Menu,
    X,
    Users,
    Headphones 
} from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    const ChatView = ({
        socket,
        userData,
        roomUsers,
        messages,
        setMessages, // Need to receive setMessages to update state
        typingUsers,
        error,
        setError,
        setShowSettings,
        handleLeaveRoom,
        formatTime,
        settings
    }) => {
        const [messageInput, setMessageInput] = useState('');
        const [isTyping, setIsTyping] = useState(false);
        const [sidebarOpen, setSidebarOpen] = useState(false);
        const [previewFile, setPreviewFile] = useState(null);
    
        // Voice Chat - using new simplified hook
        const [enableVoice, setEnableVoice] = useState(false);
    
        // DOM refs
        const messagesEndRef = useRef(null);
        const fileInputRef = useRef(null);
        const typingTimeoutRef = useRef(null);
    
        // Auto-scroll to bottom when new messages arrive
        useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);
    
        // Message handling
        const handleSendMessage = (e) => {
            e.preventDefault();
            
            // Send file if exists
            if (previewFile) {
                // Optimistic Update for File
                const fileMsg = {
                    id: `${socket.id}-${Date.now()}-file`,
                    sender: userData.username,
                    senderId: socket.id,
                    content: previewFile.data,
                    fileName: previewFile.name,
                    fileType: previewFile.type,
                    fileSize: previewFile.size,
                    type: previewFile.type.startsWith('image/') ? 'image' : 'file',
                    timestamp: Date.now()
                };
                
                // Update local state immediately
                setMessages(prev => [...prev, fileMsg]);
                
                socket.emit('send_file', {
                    room: userData.room,
                    username: userData.username,
                    fileData: previewFile.data,
                    fileName: previewFile.name,
                    fileType: previewFile.type,
                    fileSize: previewFile.size
                });
            }
    
            // Send text if exists
            if (messageInput.trim()) {
                const textMsg = {
                     id: `${socket.id}-${Date.now()}-text`,
                     sender: userData.username,
                     senderId: socket.id,
                     content: messageInput,
                     type: 'text',
                     timestamp: Date.now()
                };

                // Update local state immediately
                setMessages(prev => [...prev, textMsg]);

                socket.emit('send_message', {
                    room: userData.room,
                    content: messageInput,
                    sender: userData.username
                });
                
                setMessageInput('');
                setIsTyping(false);
                socket.emit('typing', { room: userData.room, username: userData.username, isTyping: false });
            }
            setPreviewFile(null);
        };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);

        if (!isTyping && e.target.value.length > 0) {
            setIsTyping(true);
            socket.emit('typing', { room: userData.room, username: userData.username, isTyping: true });
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('typing', { room: userData.room, username: userData.username, isTyping: false });
        }, 1000);
    };

    // File processing helper
    const processFile = (file) => {
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            setError(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            
            // Set preview instead of sending immediately
            setPreviewFile({
                data: dataUrl,
                name: file.name || 'pasted-image.png',
                type: file.type,
                size: file.size
            });
        };

        reader.readAsDataURL(file);
    };

    const handleRemovePreview = () => {
        setPreviewFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // File upload
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        processFile(file);
        e.target.value = '';
    };

    // Paste handler
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                processFile(file);
                e.preventDefault(); // Prevent pasting the image binary data as text
                return;
            }
        }
    };

    const handleFileDownload = (msgOrFile) => {
        // Handle both flat message structure (from server) and nested file object (legacy/local)
        const data = msgOrFile.content || msgOrFile.data || (msgOrFile.file && msgOrFile.file.data);
        const name = msgOrFile.fileName || msgOrFile.name || (msgOrFile.file && msgOrFile.file.name) || 'download';
        
        if (!data) return;

        const link = document.createElement('a');
        link.href = data;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-[100dvh] w-full bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-dark-surface/80 backdrop-blur-sm border-b border-neon-cyan/30 px-4 py-3 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-neon-cyan/10 rounded-lg transition-colors md:hidden"
                    >
                        {sidebarOpen ? <X className="w-5 h-5 text-neon-cyan" /> : <Menu className="w-5 h-5 text-neon-cyan" />}
                    </button>
                    <Ghost className="w-6 h-6 text-neon-cyan" />
                    <div>
                        <h1 className="text-lg font-bold text-white">{userData.room}</h1>
                        <p className="text-xs text-gray-400">{roomUsers.length} online</p>
                    </div>
                </div>

                <button
                    onClick={handleLeaveRoom}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Leave</span>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col w-full min-w-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                        {messages.map((msg) => {
                            if (msg.type === 'system') {
                                return (
                                    <div key={msg.id} className="flex justify-center">
                                        <span className="text-xs text-gray-500 bg-dark-surface px-3 py-1 rounded-full">
                                            {msg.content}
                                        </span>
                                    </div>
                                );
                            }

                            const isOwn = msg.senderId === socket.id || msg.sender === userData.username;

                            return (
                                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] sm:max-w-md ${isOwn ? 'bg-neon-cyan/20 border-neon-cyan/30' : 'bg-dark-surface border-gray-700'} border rounded-2xl p-3`}>
                                        {!isOwn && (
                                            <p className="text-xs text-neon-purple font-semibold mb-1">{msg.sender}</p>
                                        )}
                                        
                                        {(msg.type === 'image' || (msg.file && msg.file.type?.startsWith('image/'))) ? (
                                            <img
                                                src={msg.content || msg.file.data}
                                                alt={msg.fileName || msg.file.name}
                                                className="rounded-lg max-w-full cursor-pointer hover:opacity-80 transition"
                                                onClick={() => handleFileDownload(msg)}
                                            />
                                        ) : (msg.type === 'file' || (msg.file && !msg.file.type?.startsWith('image/'))) ? (
                                            <button
                                                onClick={() => handleFileDownload(msg)}
                                                className="flex items-center gap-2 text-sm text-neon-cyan hover:text-neon-cyan/80 transition break-all"
                                            >
                                                <Download className="w-4 h-4 flex-shrink-0" />
                                                <span>{msg.fileName || (msg.file && msg.file.name)}</span>
                                            </button>
                                        ) : null}

                                        {(msg.type === 'text' || (!msg.type && !msg.file)) && msg.content && (
                                            <p 
                                                className="text-sm text-white break-words whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                                            />
                                        )}

                                        <p className="text-[10px] text-gray-500 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="px-4 py-2 text-xs text-gray-400 flex-shrink-0">
                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </div>
                    )}

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-dark-surface/50 border-t border-neon-cyan/20 flex-shrink-0">
                        {/* Image Preview */}
                        {previewFile && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-dark-bg/50 rounded-lg border border-neon-cyan/20 w-fit relative group">
                                <div className="relative">
                                    {previewFile.type.startsWith('image/') ? (
                                        <img src={previewFile.data} alt="Preview" className="h-20 w-auto rounded-md object-cover" />
                                    ) : (
                                        <div className="h-20 w-20 flex flex-col items-center justify-center bg-dark-surface rounded-md">
                                            <Paperclip className="w-8 h-8 text-neon-cyan mb-1" />
                                            <span className="text-[10px] text-gray-400 max-w-[70px] truncate">{previewFile.name}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleRemovePreview}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition shadow-lg"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="*" 
                            />
                            {/* Paperclip for Generic Files */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-dark-surface border border-neon-cyan/30 text-neon-cyan rounded-lg hover:bg-neon-cyan/10 transition-colors flex-shrink-0"
                                title="Attach File"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            
                            {/* Dedicated Image Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    if(fileInputRef.current) {
                                        fileInputRef.current.accept = "image/*";
                                        fileInputRef.current.click();
                                        // Reset accept after click (optional, but good for UX if they click paperclip next)
                                        setTimeout(() => fileInputRef.current.accept = "*", 500);
                                    }
                                }}
                                className="p-3 bg-dark-surface border border-neon-cyan/30 text-neon-purple rounded-lg hover:bg-neon-purple/10 transition-colors flex-shrink-0"
                                title="Send Image"
                            >
                                <Image className="w-5 h-5" />
                            </button>

                            <input
                                type="text"
                                value={messageInput}
                                onChange={handleTyping}
                                onPaste={handlePaste}
                                placeholder="Type a message (or paste an image)..."
                                className="flex-1 px-4 py-3 bg-dark-surface border border-neon-cyan/30 text-white rounded-lg focus:outline-none focus:border-neon-cyan placeholder-gray-500"
                            />
                            <button
                                type="submit"
                                disabled={!messageInput.trim() && !previewFile}
                                className={`px-6 py-3 rounded-lg transition-colors font-semibold ${
                                    (messageInput.trim() || previewFile) 
                                        ? 'bg-neon-cyan text-dark-bg hover:bg-neon-cyan/80' 
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar */}
                <div className={`w-80 bg-dark-surface/80 backdrop-blur-sm border-l border-neon-cyan/20 flex flex-col absolute md:relative inset-y-0 right-0 z-20 transform transition-transform ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                    {/* Voice Chat Section */}
                    <div className="p-4 border-b border-neon-cyan/20">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            VOICE CHAT
                        </h3>
                        
                        {enableVoice ? (
                            <div className="space-y-2">
                                {/* LiveKit Component handles everything */}
                                <VoiceChat 
                                    roomName={userData.room} 
                                    username={userData.username}
                                    onDisconnect={() => setEnableVoice(false)}
                                />
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setEnableVoice(true)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg hover:bg-neon-green/20 transition-colors"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="text-sm">Join Voice Room</span>
                                </button>
                                <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                                    <Headphones className="w-3 h-3" />
                                    No Echo • Clear Audio
                                </p>
                            </>
                        )}
                    </div>

                    {/* Users List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            ACTIVE USERS
                        </h3>
                        <div className="space-y-2">
                            {roomUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg ${user.id === socket.id ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'bg-dark-surface/50'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${user.id === socket.id ? 'text-neon-cyan' : 'text-white'}`}>
                                            {user.username}
                                            {user.id === socket.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                                        </p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-neon-green flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-neon-cyan/20 space-y-2">
                        <button
                            onClick={() => {
                                setShowSettings(true);
                                setSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-surface/50 rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default ChatView;
