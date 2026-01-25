# 📑 ADVANCED TECHNICAL DOCUMENTATION

## PROJECT: ANONYMOUS CHAT SYSTEM

**Role:** Network Engineering & System Architecture Analysis
**Target Audience:** Computer Science Students / Technical Review Board
**Scope:** OSI Model, Transport Protocols, Real-time Architectures

---

## 🏛️ PART 1: SYSTEM ARCHITECTURE & PROTOCOLS (LAYER 7)

### 1.1. WebSocket Protocol (RFC 6455) Analysis

Unlike the Request-Response model of HTTP, this application utilizes the **WebSocket Protocol** to establish a **Persistent, Full-duplex Communication Channel**.

- **Protocol Upgrade Mechanism (Handshake):**
  - The connection initiates with a standard HTTP GET request containing the headers:
    - `Connection: Upgrade`
    - `Upgrade: websocket`
  - Server responds with **HTTP 101 Switching Protocols**.
  - Upon success, the TCP connection remains open (Persistent), bypassing the overhead of establishing new TCP 3-way handshakes for subsequent messages.

- **Stateful vs. Stateless:**
  - **HTTP (Stateless):** Server treats every request as independent. No context is retained between requests (without cookies/tokens). High latency due to header overhead parsing per request.
  - **WebSocket (Stateful):** The connection context is maintained alive over the underlying TCP socket. Ideal for **Low-Latency, Real-Time** applications where `microsecond` precision matters.

- **Event-Driven Architecture (Socket.IO):**
  - Utilizes the **Observer Pattern**.
  - **EventEmitter** mechanism: `socket.emit('event', payload)` pushes data to the TCP buffer immediately.
  - Asynchronous Non-blocking I/O (Node.js libuv) ensures the server handles thousands of concurrent socket connections on a **Single Thread**.

### 1.2. Data Persistence Strategy (In-Memory / Volatile Storage)

- **Architecture Decision:** Data is stored strictly in **Volatile Memory (RAM)** using Hash Maps (`Map<string, RoomData>`).
  - **Performance:** Memory Access Latency (~100 nanoseconds) vs Disk I/O (~millisecs). Provides near-instantaneous read/write operations for chat throughput.
  - **Privacy Engineering:** Achieves "Plausible Deniability" and ephemeral strictness. Data loss on `SIGTERM` or power failure is a **Feature**, not a bug, ensuring zero digital forensics footprint.
  - **Scalability Trade-off:** Bound by server Heap Size (Heap Memory Limit). Not suitable for horizontal scaling without a Redis Adapter (Pub/Sub).

---

## ⚙️ PART 2: TRANSPORT LAYER ANALYSIS (LAYER 4 - OSI)

### 2.1. TCP (Transmission Control Protocol)

**Usage:** Chat Messages (`send_message`), Signaling Data, File Transfer (`send_file`).

- **Connection-Oriented:** Requires 3-Way Handshake (SYN, SYN-ACK, ACK) before data transfer.
- **Reliability Mechanisms:**
  - **Sequence Numbers:** Guarantees **Ordered Delivery**. If packets arrive out of order, TCP buffers and reassembles them.
  - **Acknowledgments (ACKs):** Sender waits for ACK. If timeout occurs, **Retransmission** is triggered.
- **Why for File Transfer?** Bit-level integrity is mandatory. A single corrupt bit in a JPEG/PDF renders the file corrupted. We trade speed for **Data Integrity**.

### 2.2. UDP (User Datagram Protocol)

**Usage:** Voice/Video Media Streams (WebRTC/LiveKit).

- **Connectionless:** "Fire and Forget". No Handshake, no connection state overhead.
- **Lack of Congestion Control:** UDP pumps data at the rate the application generates it, regardless of network conditions (though protocols like RTP run on top to manage this slightly).
- **The "Real-time" Trade-off:**
  - Unlike TCP, UDP has **No Retransmission**.
  - **Packet Loss** is acceptable in VoIP. Losing 20ms of audio results in a minor "glitch" aimed at the human ear, which is preferable to the **Latency** caused by TCP retransmission (Head-of-Line Blocking).
  - **Jitter Handling:** The receiver uses a Jitter Buffer to smooth out packet arrival times.

---

## 🌐 PART 3: WEBRTC & PEER-TO-PEER MECHANICS

### 3.1. Signaling Mechanism (Out-of-Band)

WebRTC does not specify how peers find each other. We use our Socket.IO server as the **Signaling Channel**.

1.  **SDP (Session Description Protocol):** JSON object describing media capabilities (Codecs: Opus/VP8, Resolution, Bitrate).
2.  **ICE Candidates (Interactive Connectivity Establishment):** Network paths (IP:Port pairs) gathered by the browser.
3.  **Process:** Client A sends SDP Offer -> Server forwards to B -> Client B sends SDP Answer.

### 3.2. NAT Traversal & Connectivity

- **STUN (Session Traversal Utilities for NAT):** Public server that echoes back the public IP:Port of the client (punching a hole in the NAT).
- **TURN (Traversal Using Relays around NAT):** If Symmetric NAT blocks P2P, traffic is relayed through a TURN server (High latency, high cost fallback).

### 3.3. Topology Analysis: Mesh vs. SFU (Crucial for Defense)

- **Mesh Topology (Pure P2P):** Every client connects to every other client.
  - _Limit:_ Upload Bandwidth Complexity is **O(n-1)**. CPU intensive.
- **SFU (Selective Forwarding Unit) - _Used in this Project (LiveKit)_:**
  - Clients send **Single Upstream** to Server.
  - Server forwards packets to other downstream subscribers.
  - _Advantage:_ Reduces Uplink Bandwidth load on mobile Clients.

---

## 💾 PART 4: DATA TRANSMISSION ENCODING

### 4.1. Base64 Encoding

- **Mechanism:** Converts binary data (images/buffers) into ASCII string format (Safe for Transport over JSON/Text protocols).
- **Algorithm:** Maps every **3 bytes (24 bits)** of binary input to **4 ASCII characters (6 bits per char)** used in the Base64 Index Table.
- **Overhead Calculation:** Increases data size by approximately **33%**.
  - 10MB Image -> ~13.3MB payload string.
- **Constraint:** The 10MB limit is enforced to prevent **Head-of-Line Blocking** on the Node.js Event Loop (which is single-threaded) and to avoid occupying the TCP Buffer for too long, which would block other users' messages.

---

## 🎓 PART 5: VIVA VOCE CHEAT SHEET (ADVANCED)

**Q1: Explain "Head-of-Line Blocking" in the context of our Chat App.**

> **A:** In TCP (Chat), if Packet 1 is lost, Packet 2 and 3 must wait in the buffer until Packet 1 is retransmitted, causing latency spikes. In HTTP/1.1, a large request blocks subsequent ones. We mitigate this by using WebSocket for asynchronous full-duplex framing, but large File Uploads can still cause blocking if not chunked properly.

**Q2: Why is the Application Layer (L7) involved in Packet Fragmentation?**

> **A:** While TCP (L4) handles MTU fragmentation, we implement fragmentation at L7 (Application) or set strict size limits (10MB) to control memory consumption (Heap Overflow) and prevent Denial of Service (DoS) attacks on our Node.js process.

**Q3: Differentiate between "Symmetric NAT" and "Cone NAT" in WebRTC connection failures.**

> **A:** Cone NAT allows P2P connections once a hole is punched (STUN works). Symmetric NAT assigns different port mappings for different destinations, breaking P2P validity. In Symmetric NAT scenarios, our LiveKit/TURN server acts as a Relay.

**Q4: Why does Socket.IO use a "Heartbeat" mechanism?**

> **A:** To detect "Zombie Connections". A TCP Half-Open connection might happen if a client loses power (no FIN packet sent). The Heartbeat (Ping/Pong) at L7 ensures the server knows the link is dead and cleans up resources (Memory Leak Prevention).

**Q5: How does the server handle "Backpressure" during high traffic?**

> **A:** If a Client reads slower than the Server writes, the TCP Window Size reduces (Flow Control). Node.js streams handle this via the `.drain` event or `highWaterMark` buffer limits. If buffers fill up, we must drop messages or pause reading to prevent process crashes.

**Q6: What is the specific role of the "Upgrade" header in the HTTP handshake?**

> **A:** It signals the web server/proxy to stop processing the connection as HTTP (Request/Response) and switch to a raw bidirectional TCP stream using the WebSocket framing protocol (Frame-based messaging).

**Q7: Why use "Opus" codec for Voice Chat?**

> **A:** Opus is a dynamic low-latency audio codec defined in RFC 6716. It supports Variable Bit Rate (VBR) and reacts to network congestion by lowering quality to maintain real-time delivery, which is critical for UDP-based Voice over IP (VoIP).

**Q8: Explain the security implications of `dangerouslySetInnerHTML` vs our approach.**

> **A:** React protects against XSS (Cross-Site Scripting) by escaping content. However, for formatting text, we might need HTML. We must use a Sanitization Library (like **DOMPurify**) to strip `<script>` tags before rendering to prevent Session Hijacking tokens via malicious JavaScript injection.

**Q9: If we scaled to 1 Million users, why would "In-Memory" storage fail?**

> **A:** RAM is finite and volatile. Vertical Scaling has limits. We would need to move to **Horizontal Scaling** (Multiple Node.js instances). Since memory isn't shared between processes/servers, we would require a **Redis Pub/Sub** store (In-memory DB) to manage state and route messages between instances.

**Q10: Why did we choose `ws://` over `wss://` for local development, but force `wss://` in production?**

> **A:** `wss://` involves TLS/SSL encryption (Layer 6 - Presentation). It adds handshake overhead (ClientHello/ServerHello) for key exchange but guarantees Confidentiality. Modern Browsers (Chrome) block `getUserMedia` (Mic access) on non-secure origins (`http/ws`) except `localhost`, forcing us to use SSL in production.
