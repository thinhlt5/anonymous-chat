# PHÂN TÍCH KIẾN THỨC MẠNG TỪ SOURCE CODE (NETWORK PROGRAMMING ANALYSIS)

**Dự án:** ANONYMOUS CHAT (Ứng dụng Chat ẩn danh & Gọi thoại P2P)  
**Mục đích:** Tài liệu này phân tích chi tiết các kỹ thuật, giao thức và mô hình kiến trúc mạng được áp dụng trong dự án, phục vụ cho việc báo cáo hoặc bảo vệ đồ án môn Lập trình mạng.

---

## 1. Tổng Quan Kiến Trúc (Architectural Overview)

Dự án sử dụng mô hình **Hybrid Architecture (Kiến trúc lai ghép)** để tận dụng ưu điểm của cả hai thế giới:

- **Client-Server (Socket.IO):** Đóng vai trò trung tâm (Centralized) để quản lý trạng thái phòng (Room State), định danh người dùng (Identity), truyền tin nhắn văn bản (Chat Text) và tín hiệu kết nối (Signaling).
- **SFU (Selective Forwarding Unit) / WebRTC:** Đóng vai trò truyền tải dữ liệu đa phương tiện (Media Transport) cho tính năng Voice Chat. Cơ chế này giúp tối ưu hóa băng thông và tài nguyên thiết bị so với mô hình P2P Mesh truyền thống, đặc biệt quan trọng khi chạy trên thiết bị di động.

---

## 2. Bảng Phân Tích Chi Tiết Kỹ Thuật (Detailed Technical Analysis)

| Kiến thức / Khái niệm (Concept)          | Tính năng áp dụng (Feature)                              | Vị trí trong Code (Code Mapping)                                                                                                            | Phân tích chuyên sâu (Deep Analysis)                                                                                                                                                                                                                                                                                                          |
| :--------------------------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WebSocket (Event-driven Programming)** | **Chat Real-time** (Gửi nhận tin nhắn, Typing indicator) | **Client:** `ChatView.jsx` (dòng 109 `socket.emit('send_message')`)<br>**Server:** `server.js` (dòng 212 `socket.on("send_message")`)       | Khác với HTTP truyền thống (Request-Response), WebSocket mở một kênh kết nối **Full-duplex** (song công) liên tục qua port 80/443. Server hoạt động theo cơ chế hướng sự kiện (Event-driven): "nghe" sự kiện từ một client và "phát" (emit) ngay lập tức tới các client khác trong phòng mà không cần client phải poll (hỏi) server liên tục. |
| **Signaling (Cơ chế Tín hiệu)**          | **Thiết lập cuộc gọi Voice**                             | **Server:** `server.js` (dòng 287 `join_voice_chat`, dòng 33 `/api/get-token`)<br>**Client:** `VoiceChat.jsx` (dòng 120 `LiveKitRoom`)      | Trong môi trường mạng, các máy (Peers) không biết IP của nhau do NAT/Firewall. Server đóng vai trò **Signaling Server** để trao đổi metadata (như Token, PeerID) giúp các máy tìm thấy nhau trước khi thiết lập kênh truyền Media (RTP) trực tiếp hoặc qua Relay.                                                                             |
| **Base64 Encoding & Data Stream**        | **Gửi ảnh & File đính kèm**                              | **Client:** `ChatView.jsx` (dòng 146 `FileReader`, dòng 159 `readAsDataURL`)<br>**Server:** `server.js` (dòng 245 `socket.on("send_file")`) | Kỹ thuật chuyển đổi dữ liệu nhị phân (Binary) sang chuỗi ký tự ASCII (Base64) để truyền an toàn qua kênh văn bản (Socket Text Channel). <br>Use-case này loại bỏ sự phức tạp của việc xử lý Multipart Form Data, tuy nhiên đánh đổi bằng việc tăng kích thước file lên ~33%.                                                                  |
| **In-Memory Storage (State Management)** | **Quản lý Vòng đời Phòng & User**                        | **Server:** `server.js` (dòng 83 `let rooms = {}`)<br>Hàm `selfDestructRoom` (dòng 112)                                                     | Ứng dụng không sử dụng Database bền vững (HDD/SSD). Toàn bộ trạng thái lưu trên RAM (Biến toàn cục). <br>**Ưu điểm:** Tốc độ truy xuất cực nhanh (Microseconds), phù hợp với tính chất "Ephemeral" (tự hủy/ẩn danh). Khi Server restart, mọi dấu vết bị xóa sạch (Zero Footprint).                                                            |
| **Giao thức Tầng Transport (L4): TCP**   | **Tin nhắn Chat, File, Signaling**                       | **Socket.IO** (Chạy trên nền TCP)                                                                                                           | Các tính năng này yêu cầu độ tin cậy tuyệt đối (**Reliability**). TCP đảm bảo thứ tự gói tin (Ordering) và truyền lại khi mất gói (Retransmission). Chat text không chấp nhận việc mất chữ hay sai thứ tự câu.                                                                                                                                |
| **Giao thức Tầng Transport (L4): UDP**   | **Truyền tải Âm thanh (Voice Stream)**                   | **LiveKit / WebRTC** (Nền tảng bên dưới)                                                                                                    | Voice Chat ưu tiên **Tốc độ (Low Latency/Real-time)** hơn độ chính xác. UDP (User Datagram Protocol) cho phép bắn gói tin đi mà không cần chờ xác nhận (ACK), giảm độ trễ (Latency). Việc mất vài gói tin (Packet Loss) chỉ gây rè nhẹ, chấp nhận được trong giao tiếp thoại thực tế.                                                         |
| **JWT (JSON Web Token)**                 | **Bảo mật & Xác thực phiên Voice**                       | **Server:** `server.js` (dòng 56 `at.toJwt()`)<br>**Client:** `VoiceChat.jsx` (dòng 93 `setToken`)                                          | Sử dụng Token có chữ ký điện tử để cấp quyền truy cập vào Room Voice cụ thể trong một khoảng thời gian nhất định (TTL). Kỹ thuật này ngăn chặn việc "nghe lén" hoặc giả mạo người dùng (Spoofing) vào luồng Media.                                                                                                                            |

---

## 3. Các Trọng Tâm Phân Tích Khác

### A. Kỹ thuật Xử lý Dữ liệu (Payload Handling)

- **JSON Framing:** Toàn bộ giao tiếp Application Layer (L7) được đóng gói dưới dạng JSON Object (Ví dụ: `{ type: 'join', room: 'A', username: 'B' }`). Giúp đồng bộ hóa cấu trúc dữ liệu giữa Client (JS) và Server (Node.js) một cách tự nhiên.
- **Input Validation (DoS Prevention):** Server thực hiện kiểm tra kích thước gói tin trước khi xử lý (Logic tại `server.js`: kiểm tra `fileSize > 10MB`). Đây là kiến thức quan trọng về bảo mật mạng nhằm chống lại các cuộc tấn công từ chối dịch vụ (DoS) bằng việc gửi các gói tin rác khổng lồ (Large payload attacks).

### B. Quản lý Tài nguyên & Garbage Collection

Trong lập trình mạng, việc quản lý tài nguyên kết nối (Socket, Room) là sống còn. Code server thể hiện tư duy này qua cơ chế **Self-Destruct**:

- Khi người dùng ngắt kết nối (`disconnect`), Server kiểm tra ngay lập tức số lượng người còn lại.
- Nếu `Phòng == 0 người`, Server chủ động xóa key trong Object `rooms`.
- -> **Kết quả:** Ngăn chặn Memory Leak (rò rỉ bộ nhớ), cho phép Server chạy liên tục thời gian dài mà không bị tràn RAM.

### C. Khả năng mở rộng (Scalability Note)

Hiện tại, việc dùng `In-Memory Storage` biến Server thành trạng thái **Stateful**.

- **Giới hạn:** Không thể chạy nhiều Server (Horizontal Scaling) nếu không có Redis Adapter (để đồng bộ trạng thái giữa các server).
- **Giải pháp (Kiến thức nâng cao):** Để mở rộng lên hàng triệu User, cần chuyển `rooms` object sang Redis Store và sử dụng Socket.IO Redis Adapter.

---

_Tài liệu được trích xuất tự động từ phân tích Source Code ngày 26/01/2026._
