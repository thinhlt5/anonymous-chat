# 📑 TÀI LIỆU KỸ THUẬT CHUYÊN SÂU (ADVANCED TECHNICAL DOCUMENTATION)

## ĐỒ ÁN: HỆ THỐNG GIAO TIẾP ẨN DANH THỜI GIAN THỰC (ANONYMOUS CHAT)

**Biên soạn bởi:** Ban Kỹ thuật & Kiến trúc Hệ thống
**Đối tượng:** Sinh viên CNTT / Hội đồng phản biện kỹ thuật
**Phạm vi:** Mô hình OSI, Giao thức Tầng Giao vận (Transport Layer), Kiến trúc WebRTC.

---

## 🏛️ PHẦN 1: KIẾN TRÚC & GIAO THỨC (LAYER 7 - APPLICATION)

### 1.1. Phân tích Giao thức WebSocket (RFC 6455)

Khác với mô hình Request-Response truyền thống của HTTP, hệ thống này sử dụng **Giao thức WebSocket** để thiết lập một kênh truyền thông **Song công toàn phần (Full-duplex Communication Channel)** và **Thường trực (Persistent Connection)**.

- **Cơ chế Bắt tay (Handshake Mechanism):**
  - Kết nối khởi tạo bằng một HTTP GET Request tiêu chuẩn với header: `Upgrade: websocket` và `Connection: Upgrade`.
  - Server phản hồi mã trạng thái **101 Switching Protocols**.
  - Sau bước này, kết nối TCP bên dưới được giữ ở trạng thái "Mở" (Open), loại bỏ hoàn toàn độ trễ (Latency) và chi phí phụ trợ (Overhead) của việc thiết lập lại kết nối TCP (3-way handshake) cho mỗi tin nhắn.

- **So sánh HTTP vs. WebSocket (Critical Analysis):**
  - **HTTP (Stateless - Phi trạng thái):** Mỗi request là độc lập. Server không lưu ngữ cảnh (Context) của Client sau khi response. Chi phí header lớn cho mỗi gói tin.
  - **WebSocket (Stateful - Có trạng thái):** Duy trì phiên làm việc (Session) liên tục trên nền TCP. Tối ưu tuyệt đối cho ứng dụng **Thời gian thực (Real-time)** vì độ trễ chỉ tính bằng mili-giây (ms).

- **Kiến trúc Hướng sự kiện (Event-Driven Architecture) trong Socket.io:**
  - Hệ thống áp dụng **Mẫu thiết kế Observer (Observer Pattern)**.
  - Sử dụng cơ chế **EventEmitter**: Client "phát" (emit) sự kiện vào luồng TCP, Server "lắng nghe" (on) và xử lý bất đồng bộ (Asynchronous Non-blocking I/O).

### 1.2. Chiến lược Lưu trữ Dữ liệu (In-Memory Data Persistence)

- **Kiến trúc:** Dữ liệu phòng chat và Users được lưu trữ hoàn toàn trên **Bộ nhớ Khả biến (Volatile Memory / RAM)**, cụ thể là cấu trúc dữ liệu `Map` (Hash Map) của JavaScript.
- **Phân tích Đánh đổi (Data Trade-off):**
  - **Ưu điểm:** Tốc độ truy xuất (I/O Latency) cực thấp (~nanoseconds) so với truy xuất ổ cứng (I/O Disk ~milliseconds). Phù hợp với bài toán Chat High-frequency.
  - **Bảo mật:** Đảm bảo tính **Ephemeral (Phù du)**. Dữ liệu sẽ bốc hơi hoàn toàn khi tiến trình (Process) server kết thúc hoặc gặp sự cố (Crash/SIGTERM). Đây là tính năng kỹ thuật để đảm bảo tính **Ẩn danh (Anonymity)** - không để lại dấu vết số (Digital Forensics Footprint).

---

## ⚙️ PHẦN 2: TẦNG GIAO VẬN (LAYER 4 - TRANSPORT - OSI)

### 2.1. TCP (Giao thức Điều khiển Truyền vận)

**Ứng dụng trong Project:** Chat Text, File Transfer (Gửi ảnh/tệp tin).

- **Đặc tính Kỹ thuật:** **Hướng kết nối (Connection-oriented)**.
- **Cơ chế Tin cậy (Reliability):**
  - **Sequence Numbers (Số thứ tự):** Đảm bảo gói tin được lắp ghép đúng thứ tự (Ordered Delivery) tại phía nhận.
  - **Cơ chế ACK & Retransmission:** Nếu gói tin bị mất, TCP sẽ tự động gửi lại.
- **Tại sao File Transfer BẮT BUỘC dùng TCP?**
  - Tính toàn vẹn dữ liệu (Data Integrity) là ưu tiên hàng đầu. Chỉ cần sai lệch 1 bit, tệp tin (như file nén .zip hoặc ảnh.png) sẽ bị hỏng (Corrupted). Chấp nhận độ trễ cao hơn để đổi lấy sự chính xác tuyệt đối.

### 2.2. UDP (Giao thức Dữ liệu Người dùng)

**Ứng dụng trong Project:** Voice Call (Thông qua LiveKit/WebRTC Technology).

- **Đặc tính Kỹ thuật:** **Phi kết nối (Connectionless)** và **Không kiểm soát tắc nghẽn (No Congestion Control)**.
- **Tại sao Voice Call dùng UDP?**
  - Trong truyền tải âm thanh thời gian thực (VoIP), **Độ trễ (Latency)** là kẻ thù số 1.
  - **Chấp nhận Mất gói tin (Packet Loss Tolerance):** Mất một vài gói tin UDP chỉ gây ra hiện tượng "giật" (Glitch) âm thanh nhỏ trong vài mili-giây mà tai người có thể bỏ qua. Ngược lại, nếu dùng TCP, cơ chế chờ gửi lại gói tin (Retransmission) sẽ gây dừng hình/tiếng (Head-of-Line Blocking), phá hỏng trải nghiệm thời gian thực.

---

## 🌐 PHẦN 3: CƠ CHẾ WEBRTC & LIVEKIT TOPOLOGY

_Lưu ý: Mặc dù lý thuyết WebRTC cơ bản là Peer-to-Peer (Mesh), Project này sử dụng LiveKit, một triển khai WebRTC theo mô hình SFU (Selective Forwarding Unit) hiện đại hơn._

### 3.1. Cơ chế Tín hiệu (Signaling Mechanism)

Trước khi luồng Media (Audio/Video) có thể truyền tải, các Clients cần tìm thấy nhau thông qua **Máy chủ Tín hiệu (Signaling Server)** - trong project này là LiveKit Server (thông qua API `/api/get-token`).

- **SDP (Giao thức Mô tả Phiên - Session Description Protocol):** Bản tin JSON mô tả khả năng đa phương tiện (Codec: Opus/VP8, Bitrate, Sampling Rate).
- **ICE Candidates (Interactive Connectivity Establishment):** Danh sách các cặp địa chỉ IP:Port (Public/Private) mà Client thu thập được để thiết lập kết nối.

### 3.2. Luồng Dữ liệu Media (Media Stream Flow)

Trong dự án này, chúng ta sử dụng mô hình **SFU (Selective Forwarding Unit)** thay vì Mesh Topology thuần túy.

- **Sự khác biệt Kỹ thuật:**
  - **Mesh (P2P thuần):** Client A gửi thẳng stream cho B, C, D. (Tải Upload tăng theo cấp số nhân: N-1). Gây nghẽn băng thông phía Client.
  - **SFU (Project Implementation):** Client A gửi **DUY NHẤT** 1 stream lên Server (LiveKit). Server đóng vai trò **Bộ định tuyến Media (Media Router)**, sao chép gói tin và chuyển tiếp xuống cho B, C, D.
- **Lợi ích:** Giảm tải CPU và Băng thông (Bandwidth) cho thiết bị người dùng cuối (Client-side optimization).

---

## 💾 PHẦN 4: KỸ THUẬT TRUYỀN TẢI DỮ LIỆU (DATA TRANSMISSION)

### 4.1. Mã hóa Base64 (Base64 Encoding)

Để gửi dữ liệu nhị phân (Binary - ví dụ: Ảnh) qua giao thức JSON/Text của Socket.io:

- **Kỹ thuật:** Chuyển đổi mỗi nhóm **3 Bytes (24 bits)** nhị phân thành **4 ký tự ASCII (6 bits/char)**.
- **Overhead (Chi phí dư thừa):** Kích thước dữ liệu tăng xấp xỉ **33%**.
  - Ví dụ: Ảnh gốc 10MB -> Payload truyền đi là ~13.3MB.
- **Giới hạn Kích thước (Packet Size Limit):**
  - Project giới hạn hard-limit là **10MB**.
  - **Lý do Kỹ thuật:** Tránh hiện tượng **Head-of-Line Blocking** trên Node.js Event Loop (vốn là đơn luồng - Single Threaded). Nếu xử lý một chuỗi Base64 quá lớn (vài trăm MB) sẽ làm "treo" CPU, khiến Server không thể phản hồi các request khác (Denial of Service - DoS).

---

## 🎓 PHẦN 5: BỘ CÂU HỎI VẤN ĐÁP CHUYÊN SÂU (VIVA VOCE QA)

**Q1: Tại sao trong Voice Chat, đôi khi âm thanh bị méo (Robotic) tốt hơn là bị trễ (Lag)?**

> **A:** Vì trong giao tiếp thời gian thực, não bộ con người có khả năng "lấp đầy" các khoảng trống thông tin nhỏ (nhờ cơ chế **Packet Loss Concealment** của Codec Opus). Nhưng nếu bị trễ (Latency > 200ms), cuộc hội thoại sẽ dời rạc và không thể tương tác (Interactive). Do đó UDP được ưu tiên hơn TCP.

**Q2: Làm thế nào để Client A và Client B kết nối được với nhau khi cả hai đều nằm sau NAT (Mạng gia đình)?**

> **A:** Chúng ta sử dụng kỹ thuật **Hole Punching** thông qua giao thức **STUN** (Session Traversal Utilities for NAT). Server STUN giúp Client biết được Public IP:Port của chính mình để gửi cho đối phương. Trong trường hợp NAT đối xứng (Symmetric NAT) chặn STUN, hệ thống sẽ fallback sang dùng **TURN** (Relay Server).

**Q3: Tại sao lại gọi là "Mô hình 7 tầng OSI" nhưng khi lập trình web chúng ta chỉ quan tâm TCP/IP?**

> **A:** OSI là mô hình tham chiếu lý thuyết (Theoretical Reference Model). TCP/IP là mô hình thực tế (Implementation Model). Trong project này, chúng ta làm việc chủ yếu ở Tầng Ứng Dụng (L7 - WebSocket, HTTP) và hiểu rõ tác động của Tầng Giao Vận (L4 - TCP/UDP) lên hiệu năng ứng dụng.

**Q4: Base64 làm tăng kích thước file, vậy tại sao không gửi Binary trực tiếp qua Socket.io?**

> **A:** Socket.io (trên nền Engine.io) có hỗ trợ gửi Binary (Buffer). Tuy nhiên, để đơn giản hóa việc đóng gói bản tin JSON (chứa cả metadata như sender, timestamp, filename), việc encode Base64 giúp đồng nhất format dữ liệu (Text-based payload), dễ dàng debug và parse tại Client, chấp nhận đánh đổi băng thông.

**Q5: Sự khác biệt cốt lõi giữa `socket.emit()` và `io.emit()` là gì?**

> **A:** `socket.emit()` chỉ gửi tin nhắn phản hồi lại cho **chính Client đó** (Unicast). `io.emit()` (hoặc `io.to(room).emit()`) gửi tin nhắn cho **tất cả Clients** đang kết nối (Broadcast/Multicast).

**Q6: "Head-of-Line Blocking" xảy ra ở đâu trong Project này?**

> **A:** Nó có thể xảy ra ở 2 tầng. Tầng L4 (TCP): nếu mất gói tin số 1, gói 2 và 3 phải chờ dù đã đến nơi. Tầng L7 (Application): nếu Server xử lý một file upload quá lớn (CPU bound task) trên luồng chính (Main Thread), các sự kiện chat của user khác sẽ bị chặn lại.

**Q7: Tại sao Project không dùng HTTPS cho Localhost nhưng bắt buộc dùng trên Production (Vercel)?**

> **A:** Trình duyệt hiện đại (Chrome/Edge) áp dụng chính sách bảo mật nghiêm ngặt: API `getUserMedia` (truy cập Micro) chỉ hoạt động trên **Secure Contexts** (HTTPS hoặc Localhost). Do đó, khi deploy lên Internet, bắt buộc phải có SSL/TLS (Layer 6 - Presentation) để WebRTC hoạt động.

**Q8: Nếu Hacker dùng Wireshark bắt gói tin, họ có đọc được nội dung Chat không?**

> **A:** Nếu kết nối là `ws://` (không bảo mật), họ đọc được dưới dạng Cleartext. Nếu là `wss://` (WebSocket Secure - dùng trên Production), toàn bộ payload L7 được mã hóa bởi Tầng SSL/TLS, Hacker chỉ thấy rác dữ liệu đã mã hóa.

**Q9: Tại sao LiveKit (SFU) lại mở rộng tốt hơn P2P Mesh?**

> **A:** Với Mesh, nếu phòng có N người, mỗi máy phải chịu (N-1) luồng Upload. Băng thông Upload là điểm nghẽn của mạng gia đình (ADSL/Fiber thường có Upload < Download). Với SFU, mỗi máy chỉ chịu 1 luồng Upload lên Server, bất kể phòng có bao nhiêu người. Tải được chuyển sang Server (có băng thông lớn).

**Q10: In-Memory Storage có nhược điểm gì khi Scale dự án lên 1 triệu người dùng?**

> **A:** Không thể mở rộng theo chiều ngang (Horizontal Scaling). Nếu chạy nhiều Server instance, Users ở Server A sẽ không chat được với Users ở Server B vì RAM không chia sẻ được (Memory Isolation). Giải pháp là cần một **Message Broker** (như Redis Pub/Sub) làm trung gian đồng bộ trạng thái.
