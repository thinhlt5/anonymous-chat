const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// 🚀 PeerJS Self-Hosted Server
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});
app.use('/peerjs', peerServer);

const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 10 * 1024 * 1024 // Max file/image size: 10MB
});

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY DATABASE - Zero Footprint Architecture
// ═══════════════════════════════════════════════════════════════════

// rooms = { roomName: { password: string | null, users: Map<socketId, userData> } }
let rooms = {};

// socketRoomMap = { socketId: roomName } - Track which room each socket is in
let socketRoomMap = {};

// voiceChatRooms = { roomName: Map<peerId, { peerId, username, socketId }> }
let voiceChatRooms = {};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const logSystem = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔮 ${message}`);
};

const getRoomUsers = (roomName) => {
    if (!rooms[roomName]) return [];
    return Array.from(rooms[roomName].users.values());
};

const broadcastUserList = (roomName) => {
    if (!rooms[roomName]) return;
    const users = getRoomUsers(roomName);
    io.to(roomName).emit('user_list', users);
};

// Self-Destruct: Delete room when empty
const selfDestructRoom = (roomName) => {
    if (!rooms[roomName]) return;

    if (rooms[roomName].users.size === 0) {
        delete rooms[roomName];
        logSystem(`💀 SELF-DESTRUCT: Room "${roomName}" erased from memory. Zero footprint achieved.`);
    }
};

// ═══════════════════════════════════════════════════════════════════
// SOCKET.IO CONNECTION HANDLER
// ═══════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
    logSystem(`🔌 New connection: ${socket.id}`);

    // ─────────────────────────────────────────────────────────────────
    // CHECK ROOM - Verify if room exists and if password is required
    // ─────────────────────────────────────────────────────────────────
    socket.on("check_room", ({ room }, callback) => {
        if (!rooms[room]) {
            return callback({ exists: false, hasPassword: false });
        }
        callback({
            exists: true,
            hasPassword: rooms[room].password !== null
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // CREATE ROOM - Initialize a new room with optional password
    // ─────────────────────────────────────────────────────────────────
    socket.on("create_room", ({ room, password, username }, callback) => {
        // Check if room already exists
        if (rooms[room]) {
            return callback({ success: false, error: "ROOM_EXISTS", message: "Operation name already in use." });
        }

        // Create the room
        rooms[room] = {
            password: password || null,
            users: new Map()
        };

        logSystem(`📁 Room created: "${room}" by ${username} ${password ? "(PASSWORD PROTECTED)" : "(OPEN)"}`);

        callback({ success: true });
    });

    // ─────────────────────────────────────────────────────────────────
    // JOIN ROOM - Join an existing room (with password verification)
    // ─────────────────────────────────────────────────────────────────
    socket.on("join_room", ({ room, password, username, peerId }, callback) => {
        // Check if room exists
        if (!rooms[room]) {
            return callback({ success: false, error: "ROOM_NOT_FOUND", message: "Operation not found. Invalid coordinates." });
        }

        // Verify password if required
        if (rooms[room].password !== null && rooms[room].password !== password) {
            return callback({ success: false, error: "WRONG_PASSWORD", message: "Access denied. Incorrect decryption key." });
        }

        // Check if username is already taken in the room
        const existingUsers = getRoomUsers(room);
        if (existingUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return callback({ success: false, error: "USERNAME_TAKEN", message: "Alias already compromised in this operation." });
        }

        // Add user to room
        const userData = {
            id: socket.id,
            username,
            peerId,
            joinedAt: Date.now()
        };

        rooms[room].users.set(socket.id, userData);
        socketRoomMap[socket.id] = room;

        socket.join(room);

        logSystem(`👤 ${username} joined room "${room}"`);

        // Notify others in the room
        socket.to(room).emit("system_message", {
            type: "join",
            message: `${username} has entered the void.`,
            timestamp: Date.now()
        });

        // Broadcast updated user list
        broadcastUserList(room);

        callback({ success: true, users: getRoomUsers(room) });
    });

    // ─────────────────────────────────────────────────────────────────
    // SEND MESSAGE - Broadcast chat message to room
    // ─────────────────────────────────────────────────────────────────
    socket.on("send_message", ({ message, username, room }) => {
        const messageData = {
            id: `${socket.id}-${Date.now()}`,
            sender: username,
            senderId: socket.id,
            content: message,
            type: 'text',
            timestamp: Date.now()
        };

        io.to(room).emit("receive_message", messageData);
        logSystem(`💬 [${room}] ${username}: ${message.substring(0, 50)}...`);
    });

    // ─────────────────────────────────────────────────────────────────
    // SEND FILE - Handle file/image sharing
    // ─────────────────────────────────────────────────────────────────
    socket.on("send_file", ({ fileData, fileName, fileType, fileSize, username, room }) => {
        // Server-side validation (10MB limit)
        if (fileSize > 10 * 1024 * 1024) {
            return socket.emit("file_error", { message: "File exceeds 10MB limit." });
        }

        const messageData = {
            id: `${socket.id}-${Date.now()}`,
            sender: username,
            senderId: socket.id,
            content: fileData,
            fileName,
            fileType,
            fileSize,
            type: fileType.startsWith('image/') ? 'image' : 'file',
            timestamp: Date.now()
        };

        io.to(room).emit("receive_message", messageData);
        logSystem(`📎 [${room}] ${username} shared file: ${fileName} (${(fileSize / 1024).toFixed(2)}KB)`);
    });

    // ─────────────────────────────────────────────────────────────────
    // TYPING INDICATOR
    // ─────────────────────────────────────────────────────────────────
    socket.on("typing_start", ({ room, username }) => {
        socket.to(room).emit("user_typing", { username, isTyping: true });
    });

    socket.on("typing_stop", ({ room, username }) => {
        socket.to(room).emit("user_typing", { username, isTyping: false });
    });

    // ─────────────────────────────────────────────────────────────────
    // VOICE CHAT - Group Voice Chat Room
    // ─────────────────────────────────────────────────────────────────
    socket.on("join_voice_chat", ({ room, username, peerId }) => {
        if (!voiceChatRooms[room]) {
            voiceChatRooms[room] = new Map();
        }

        const voiceUserData = {
            peerId,
            username,
            socketId: socket.id
        };

        voiceChatRooms[room].set(peerId, voiceUserData);

        logSystem(`🎤 ${username} joined voice chat in room "${room}"`);

        // Notify others in the room about the new voice user
        socket.to(room).emit("user_joined_voice", { peerId, username });

        // Send updated voice chat user list to all in room
        const voiceUsers = Array.from(voiceChatRooms[room].values());
        io.to(room).emit("voice_chat_users", voiceUsers);
    });

    socket.on("leave_voice_chat", ({ room, username, peerId }) => {
        if (voiceChatRooms[room]) {
            voiceChatRooms[room].delete(peerId);

            logSystem(`🔇 ${username} left voice chat in room "${room}"`);

            // Notify others
            socket.to(room).emit("user_left_voice", { peerId, username });

            // Send updated voice chat user list
            const voiceUsers = Array.from(voiceChatRooms[room].values());
            io.to(room).emit("voice_chat_users", voiceUsers);

            // Clean up empty voice chat room
            if (voiceChatRooms[room].size === 0) {
                delete voiceChatRooms[room];
            }
        }
    });

    socket.on("get_voice_chat_users", ({ room }, callback) => {
        if (voiceChatRooms[room]) {
            const voiceUsers = Array.from(voiceChatRooms[room].values());
            callback(voiceUsers);
        } else {
            callback([]);
        }
    });

    // Legacy 1-to-1 call signaling (kept for backwards compatibility)
    socket.on("call_user", ({ targetId, callerId, callerName }) => {
        io.to(targetId).emit("incoming_call", { callerId, callerName });
    });

    socket.on("call_accepted", ({ callerId }) => {
        io.to(callerId).emit("call_accepted");
    });

    socket.on("call_rejected", ({ callerId }) => {
        io.to(callerId).emit("call_rejected");
    });

    socket.on("end_call", ({ targetId }) => {
        io.to(targetId).emit("call_ended");
    });

    // ─────────────────────────────────────────────────────────────────
    // DISCONNECT - Handle user leaving and Self-Destruct mechanism
    // ─────────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
        const roomName = socketRoomMap[socket.id];
        logSystem(`🔌 Disconnect initiated for socket: ${socket.id}, room: ${roomName || 'UNKNOWN'}`);

        // 1. AGGRESSIVE VOICE CHAT CLEANUP - Scan ALL rooms
        // This ensures we catch ghost users even if socketRoomMap is corrupted
        let cleanedVoiceRooms = 0;
        for (const [vRoomName, voiceMap] of Object.entries(voiceChatRooms)) {
            for (const [pId, info] of voiceMap.entries()) {
                if (info.socketId === socket.id) {
                    voiceMap.delete(pId);
                    cleanedVoiceRooms++;

                    logSystem(`🎤❌ Removed ${info.username} from voice chat in "${vRoomName}"`);

                    // Notify others in voice chat
                    socket.to(vRoomName).emit("user_left_voice", { 
                        peerId: pId, 
                        username: info.username 
                    });

                    // Send updated voice chat user list
                    const voiceUsers = Array.from(voiceMap.values());
                    io.to(vRoomName).emit("voice_chat_users", voiceUsers);

                    // Clean up empty voice chat room
                    if (voiceMap.size === 0) {
                        delete voiceChatRooms[vRoomName];
                        logSystem(`🗑️ Empty voice room "${vRoomName}" deleted`);
                    }
                }
            }
        }

        if (cleanedVoiceRooms > 0) {
            logSystem(`✅ Cleaned ${cleanedVoiceRooms} voice chat connection(s)`);
        }

        // 2. Cleanup Main Room
        if (roomName && rooms[roomName]) {
            const user = rooms[roomName].users.get(socket.id);
            const username = user ? user.username : "Unknown Agent";

            // Remove user from room
            rooms[roomName].users.delete(socket.id);

            logSystem(`👋 ${username} disconnected from room "${roomName}"`);

            // Notify remaining users
            socket.to(roomName).emit("system_message", {
                type: "leave",
                message: `${username} has vanished into the void.`,
                timestamp: Date.now()
            });

            // Broadcast updated user list
            broadcastUserList(roomName);

            // ⚠️ SELF-DESTRUCT: Check if room is empty and destroy it
            selfDestructRoom(roomName);
        }

        // Clean up socket mapping
        delete socketRoomMap[socket.id];

        logSystem(`🔌 Connection closed: ${socket.id}`);
    });

    // ─────────────────────────────────────────────────────────────────
    // LEAVE ROOM - Manual room exit (before disconnect)
    // ─────────────────────────────────────────────────────────────────
    socket.on("leave_room", ({ room, username }) => {
        if (rooms[room] && rooms[room].users.has(socket.id)) {
            rooms[room].users.delete(socket.id);
            socket.leave(room);

            logSystem(`🚪 ${username} left room "${room}"`);

            socket.to(room).emit("system_message", {
                type: "leave",
                message: `${username} has vanished into the void.`,
                timestamp: Date.now()
            });

            broadcastUserList(room);
            selfDestructRoom(room);
        }

        delete socketRoomMap[socket.id];
    });
});

// ═══════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗                   ║
║    ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝                   ║
║    ██║  ███╗███████║██║   ██║███████╗   ██║                      ║
║    ██║   ██║██╔══██║██║   ██║╚════██║   ██║                      ║
║    ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║                      ║
║     ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝                      ║
║                                                                   ║
║             ██████╗ ██████╗  ██████╗ ████████╗ ██████╗           ║
║             ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗          ║
║             ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║          ║
║             ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║          ║
║             ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝          ║
║             ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝           ║
║                                                                   ║
║           🔮 CORE SYSTEM ONLINE - PORT ${PORT}                     ║
║           ⚡ Anonymous Encryption Layer v1.0                      ║
║           💀 Self-Destruct Protocol: ACTIVE                       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});