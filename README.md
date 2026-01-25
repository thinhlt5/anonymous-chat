# 👻 Anonymous Chat

<div align="center">

![Anonymous Chat Banner](https://img.shields.io/badge/Privacy-First-00FFFF?style=for-the-badge&logo=shield&logoColor=white)
![Real-Time](https://img.shields.io/badge/Real--Time-Socket.IO-green?style=for-the-badge&logo=socket.io&logoColor=white)
![Voice Chat](https://img.shields.io/badge/Voice-LiveKit-FF6B6B?style=for-the-badge&logo=webrtc&logoColor=white)

**A secure, anonymous real-time chat application with voice support and zero digital footprint.**

[Live Demo](https://anonymous-chat-nine.vercel.app) · [Report Bug](https://github.com/thinhlt5/anonymous-chat/issues) · [Request Feature](https://github.com/thinhlt5/anonymous-chat/issues)

</div>

---

## 📖 Overview

**Anonymous Chat** is a modern, privacy-focused communication platform that allows users to chat anonymously in real-time without leaving any digital traces. Built with a sleek cyberpunk-inspired UI, this application combines cutting-edge web technologies to deliver a secure and engaging user experience.

### ✨ Key Features

- 🔒 **Complete Anonymity** - No registration, no login, no tracking
- 💬 **Real-time Messaging** - Instant message delivery via Socket.IO
- 🎤 **Group Voice Chat** - High-quality voice communication powered by LiveKit
- 🔐 **Password-Protected Rooms** - Optional password encryption for private conversations
- 📎 **File & Image Sharing** - Share files and images up to 10MB
- 👥 **Live User Status** - See who's online and typing indicators
- 💀 **Self-Destruct Rooms** - Rooms automatically delete when empty (zero footprint)
- 🌙 **Cyberpunk UI** - Dark mode interface with neon accents and scanline effects
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- ⚡ **Zero Database** - Pure in-memory architecture for maximum privacy

---

## 🏗️ Architecture

### **Technology Stack**

#### Frontend

- **React 19** - Latest React with hooks
- **Vite** - Lightning-fast build tool and dev server
- **Socket.IO Client** - Real-time bidirectional communication
- **LiveKit React Components** - Voice chat integration
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **DOMPurify** - XSS protection for user content

#### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time engine
- **LiveKit Server SDK** - Voice chat infrastructure
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### **Project Structure**

```
anonymous-chat/
├── client/                    # Frontend application
│   ├── src/
│   │   ├── views/            # React view components
│   │   │   ├── HomeView.jsx          # Landing page
│   │   │   ├── IdentityView.jsx      # Username setup
│   │   │   ├── ModeView.jsx          # Create/Join selection
│   │   │   ├── CreateRoomView.jsx    # Room creation
│   │   │   ├── JoinRoomView.jsx      # Room joining
│   │   │   ├── JoinPasswordView.jsx  # Password entry
│   │   │   ├── ChatView.jsx          # Main chat interface
│   │   │   ├── VoiceChat.jsx         # Voice chat component
│   │   │   ├── SettingsModal.jsx     # Settings dialog
│   │   │   └── index.js              # View exports
│   │   ├── App.jsx           # Main application logic
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite configuration
│   └── tailwind.config.js    # Tailwind configuration
├── server/                   # Backend application
│   ├── server.js             # Main server file
│   ├── package.json          # Backend dependencies
│   └── .env                  # Environment variables
├── LICENSE                   # MIT License
└── README.md                 # This file
```

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **LiveKit Account** (for voice chat) - [Sign up here](https://livekit.io/)

### **Installation**

1. **Clone the repository**

   ```bash
   git clone https://github.com/thinhlt5/anonymous-chat.git
   cd anonymous-chat
   ```

2. **Install Server Dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies**
   ```bash
   cd ../client
   npm install
   ```

### **Environment Configuration**

#### Server Environment Variables (`server/.env`)

```env
PORT=3001
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

#### Client Environment Variables (`client/.env`)

```env
VITE_SOCKET_URL=http://localhost:3001
VITE_LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
```

**How to get LiveKit credentials:**

1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy your API Key, Secret, and WebSocket URL
4. Paste them into the respective `.env` files

### **Running the Application**

#### Development Mode

1. **Start the server** (Terminal 1)

   ```bash
   cd server
   npm run dev
   ```

   Server will run on `http://localhost:3001`

2. **Start the client** (Terminal 2)

   ```bash
   cd client
   npm run dev
   ```

   Client will run on `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173`

#### Production Build

1. **Build the client**

   ```bash
   cd client
   npm run build
   ```

2. **Start the production server**
   ```bash
   cd server
   node server.js
   ```

---

## 📱 Usage Guide

### **Creating a Room**

1. Enter your anonymous username
2. Choose "START A NEW ROOM"
3. Enter a room name
4. Optionally set a password for privacy
5. Click "CREATE ROOM"

### **Joining a Room**

1. Enter your anonymous username
2. Choose "JOIN A ROOM"
3. Enter the room name
4. If password-protected, enter the password
5. Click "CONNECT TO ROOM"

### **Chat Features**

- **Text Messages** - Type and press Enter or click Send
- **File Sharing** - Click the paperclip icon or paste images
- **Image Sharing** - Click the image icon or paste from clipboard
- **Voice Chat** - Click the headphones icon to join group voice
- **Typing Indicators** - See when others are typing
- **User List** - View all active users in the sidebar
- **Settings** - Access sound toggle and user preferences

### **Voice Chat**

1. Click the "🎧" (headphones) icon in the chat header
2. Allow microphone permissions when prompted
3. Your voice will be broadcast to all users in the room
4. See active voice participants with real-time speaking indicators
5. Mute/unmute using the microphone button
6. Disconnect from voice chat using the disconnect button

---

## 🔒 Privacy & Security

### **Zero Footprint Architecture**

- **No Database** - All data stored in server memory only
- **No User Accounts** - No registration or authentication required
- **No Message Persistence** - Messages disappear when you leave
- **Self-Destruct Rooms** - Rooms auto-delete when empty
- **No Tracking** - No analytics, no cookies, no fingerprinting

### **Security Measures**

- **XSS Protection** - All user content sanitized with DOMPurify
- **Password Protection** - Optional room passwords
- **File Size Limits** - 10MB maximum to prevent abuse
- **CORS Configuration** - Restricted origins for API security
- **Input Validation** - Server-side verification of all inputs

### **Privacy Best Practices**

⚠️ **Important Notes:**

- Messages are **NOT encrypted end-to-end**
- Files are transmitted through the server
- Voice chat uses LiveKit infrastructure
- For maximum privacy, use Tor Browser or VPN
- Don't share sensitive information

---

## 🎨 Design Philosophy

### **Cyberpunk Aesthetic**

The UI draws inspiration from cyberpunk and hacker culture:

- **Dark Mode** - Easy on the eyes, harder to track
- **Neon Accents** - Cyan (`#00FFFF`) and green (`#39FF14`) highlights
- **Monospace Font** - JetBrains Mono for that terminal feel
- **Scanline Effects** - Subtle CRT monitor simulation
- **Glitch Animations** - Dynamic hover effects
- **Military Terminology** - "Operations" instead of "rooms"

### **Responsive Design**

- **Mobile First** - Optimized for smartphones
- **Tablet Support** - Adaptive layouts for mid-size screens
- **Desktop Experience** - Full-featured chat on large displays
- **Touch Friendly** - Large tap targets and swipe gestures

---

## 🛠️ Advanced Configuration

### **Customizing the Server Port**

Edit `server/.env`:

```env
PORT=3001  # Change to your preferred port
```

### **Changing File Upload Limits**

Edit `server/server.js`:

```javascript
maxHttpBufferSize: 10 * 1024 * 1024; // Change 10 to your desired MB
```

Edit `client/src/views/ChatView.jsx`:

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Change 10 to match server
```

### **Customizing Themes**

Edit `client/tailwind.config.js`:

```javascript
colors: {
  'neon-cyan': '#00FFFF',      // Change primary accent
  'neon-green': '#39FF14',     // Change secondary accent
  'dark-bg': '#050505',        // Change background
  'dark-surface': '#0C0C0C',   // Change surface color
}
```

---

## 🚢 Deployment

### **Deploy to Vercel (Recommended for Client)**

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy Client**

   ```bash
   cd client
   vercel --prod
   ```

3. **Set Environment Variables in Vercel Dashboard**
   - `VITE_SOCKET_URL` - Your server URL
   - `VITE_LIVEKIT_URL` - Your LiveKit WebSocket URL

### **Deploy to Render (Recommended for Server)**

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `cd server && npm install`
4. Set start command: `node server/server.js`
5. Add environment variables:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `PORT` (optional, Render sets this automatically)

### **Deploy to Railway**

Railway supports both client and server in a monorepo:

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Configure two services:
   - **Server Service** - Root directory: `server`
   - **Client Service** - Root directory: `client`
4. Set environment variables for each service

---

## 🧪 Testing

### **Manual Testing Checklist**

- [ ] Create a room with password
- [ ] Join the room from another browser/incognito
- [ ] Send text messages
- [ ] Upload an image
- [ ] Upload a file
- [ ] Start voice chat
- [ ] Mute/unmute microphone
- [ ] Check typing indicators
- [ ] Test on mobile device
- [ ] Verify room self-destructs when empty

### **Testing Voice Chat**

Voice chat requires HTTPS or localhost. If testing remotely:

- Use `ngrok` to tunnel your local server
- Test on a staging environment with SSL
- Use Vercel/Render preview deployments

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### **Development Guidelines**

- Follow existing code style
- Add comments for complex logic
- Test on multiple browsers
- Ensure mobile responsiveness
- Update README if needed

---

## 📝 Changelog

### Version 1.0.0 (Current)

- ✅ Real-time text messaging
- ✅ Group voice chat with LiveKit
- ✅ File and image sharing
- ✅ Password-protected rooms
- ✅ Typing indicators
- ✅ Self-destruct rooms
- ✅ Responsive cyberpunk UI
- ✅ Zero-database architecture

### Planned Features

- 🔜 End-to-end encryption
- 🔜 Message reactions
- 🔜 User avatars (anonymous)
- 🔜 Screen sharing
- 🔜 Voice effects
- 🔜 Room invitations via links
- 🔜 Custom themes

---

## ❓ FAQ

**Q: Is this really anonymous?**  
A: Yes, no registration required. However, your IP address is visible to the server. Use Tor/VPN for full anonymity.

**Q: Are messages saved?**  
A: No. All messages are stored in memory only and deleted when the room closes.

**Q: Can I use this for sensitive information?**  
A: Not recommended. Messages are not end-to-end encrypted. Use Signal/Matrix for sensitive data.

**Q: How many users can join a room?**  
A: No hard limit, but performance may degrade with 50+ simultaneous users.

**Q: Does voice chat work on mobile?**  
A: Yes, but requires HTTPS and microphone permissions.

**Q: Can I self-host this?**  
A: Absolutely! Follow the installation guide above.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 thinhlt5

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

- **Socket.IO** - Real-time communication engine
- **LiveKit** - Voice chat infrastructure
- **React** - UI framework
- **Tailwind CSS** - Styling framework
- **Vercel** - Hosting platform
- **Lucide** - Icon library
- **JetBrains** - Mono font

---

## 📞 Contact & Support

- **Author**: thinhlt5
- **GitHub**: [@thinhlt5](https://github.com/thinhlt5)
- **Issues**: [GitHub Issues](https://github.com/thinhlt5/anonymous-chat/issues)
- **Live Demo**: [anonymous-chat-nine.vercel.app](https://anonymous-chat-nine.vercel.app)

---

<div align="center">

**Built with 💀 for privacy and 🔮 for security**

⭐ **Star this repo if you find it useful!** ⭐

</div>
