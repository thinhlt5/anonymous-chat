# Hướng Dẫn Kịch Bản Thuyết Trình Dự Án Anonymous Chat

Tài liệu này sẽ hướng dẫn bạn từng bước để thuyết trình dự án một cách ấn tượng, bao quát từ lý thuyết công nghệ cho đến demo tính năng thực tế.

---

## 🏗 Phần 1: Giới Thiệu Tổng Quan (2-3 phút)

**Mục tiêu:** Cho khán giả biết dự án làm gì và dùng công nghệ gì.

1.  **Tên Dự Án**: Anonymous Chat (Ứng dụng Chat Ẩn Danh).
2.  **Ý tưởng chính**: Một nền tảng giao tiếp thời gian thực, bảo mật, không lưu vết. Lấy cảm hứng từ phong cách Cyberpunk.
3.  **Công Nghệ Cốt Lõi**:
    - **Frontend**: ReactJS, TailwindCSS (Giao diện Neon/Cyberpunk).
    - **Backend**: Node.js, Express.
    - **Real-time Engine**: **Socket.io** (Quản lý trạng thái, tin nhắn, phòng).
    - **Voice Engine**: **LiveKit** (Chuyên dụng cho âm thanh WebRTC độ trễ thấp).

---

## 🛠 Phần 2: Kiến Trúc Kỹ Thuật (Trọng tâm Socket.io) (5 phút)

**Mục tiêu:** Giải thích _tại sao_ và _như thế nào_ ứng dụng hoạt động.

### 1. Tại sao lại là Socket.io?

- Giải thích mô hình **Client-Server 2 chiều**: Khác với web truyền thống (phải F5 mới thấy tin mới), Socket.io giữ kết nối mở. Server có thể "bắn" tin nhắn cho Client ngay lập tức.
- **Cơ chế Room (Phòng)**: Đây là tính năng quan trọng nhất.
  - _Ví dụ_: Khi A và B vào phòng "Room1", Server sẽ gom họ vào một nhóm ảo. Khi A nói, Server chỉ gửi tin cho nhóm "Room1", người ở "Room2" không nghe thấy.

### 2. Luồng Dữ Liệu (Data Flow)

Vẽ ra một bức tranh trong đầu khán giả:

- **Bước 1**: Người dùng A gõ "Hello" -> Bắn sự kiện `send_message` lên Server.
- **Bước 2**: Server nhận, kiểm tra người này ở phòng nào.
- **Bước 3**: Server dùng lệnh `socket.to("Tên_Phòng").emit("receive_message")`.
- **Bước 4**: Người dùng B (và C, D trong phòng) nhận được sự kiện và hiển thị lên màn hình.
- _Lưu ý_: Server **KHÔNG** lưu tin nhắn vào Database. Gửi xong là quên ngay (Stateless) -> Đảm bảo tính ẩn danh tuyệt đối.

### 3. Voice Chat (LiveKit - External API Service)

- **Chiến lược**: Thay vì tự xây dựng Server xử lý âm thanh (rất khó và nặng), nhóm em quyết định sử dụng **LiveKit Cloud API**.
- **Lợi ích**:
  - Đây là một dịch vụ bên thứ 3 (Third-party Service) chuyên xử lý WebRTC.
  - Giúp giảm tải cho Server chính (Node.js chỉ lo chat text).
  - Đảm bảo chất lượng âm thanh ổn định, lọc nhiễu tốt hơn tự làm.
- **Cách hoạt động**: Server của em chỉ đóng vai trò "người cấp vé" (Generate Token). Client sẽ cầm vé đó kết nối trực tiếp lên LiveKit Cloud để đàm thoại. Đây là mô hình **Microservices** hiện đại.

---

## ⚡ Phần 3: Các Tính Năng & Logic Code (Sâu hơn) (5-7 phút)

Đi lướt qua các chức năng chính và logic backend tương ứng (có thể show code `server.js` nếu cần minh họa).

### 1. Quản Lý Phòng & User (`create_room`, `join_room`)

- **Tạo phòng**: Người dùng đặt tên phòng + Mật khẩu (tùy chọn). Server lưu thông tin này vào RAM (`let rooms = {}`).
- **Tham gia**:
  - Nếu phòng có mật khẩu -> Server kiểm tra khớp mới cho vào.
  - Kiểm tra trùng tên (Username) -> Nếu trùng báo lỗi ngay.
  - Thành công -> Bắn `system_message` thông báo "Ông A đã tham gia".

### 2. Gửi/Nhận Tin Nhắn & File (`send_message`, `send_file`)

- **Tin nhắn Text**: Cơ bản là broadcast (phát sóng) trong Room.
- **Gửi File**:
  - Server kiểm tra kích thước (< 10MB).
  - Phân loại file (Ảnh hay Document) để Client biết cách hiển thị (hiện ảnh preview hay hiện icon tải về).

### 3. Trải Nghiệm Người Dùng (UX)

- **Typing Indicator** (`user_typing`): Khi bạn đang gõ, Server báo cho người kia biết "A is typing...". Tạo cảm giác thời gian thực sống động.
- **Danh sách Online (`user_list`)**: Cập nhật realtime ai đang trong phòng.

### 4. Cơ Chế "Tự Hủy" (Self-Destruct)

- Đây là tính năng bảo mật then chốt.
- Hàm `disconnect`: Khi người dùng cuối cùng rời phòng, Server kiểm tra `users.size === 0`.
- Nếu đúng -> **Xóa sạch** object phòng đó khỏi bộ nhớ RAM. Không để lại dấu vết.

---

## 🎮 Phần 4: Kịch Bản Demo (Live Demo) (3-5 phút)

Đây là lúc bạn mở ứng dụng lên và thao tác trực tiếp. Hãy chuẩn bị 2 tab trình duyệt (hoặc 1 tab ẩn danh, 1 tab thường) để đóng vai 2 người dùng.

1.  **Tạo Phòng**:
    - Tab 1: Vào "Create Room". Điền tên phòng "Demo1", Username "Alice", đặt Pass "123".
    - Nhấn Create -> Vào giao diện Chat.

2.  **Tham Gia (Tab 2)**:
    - Tab 2: Vào "Join Room". Nhập tên phòng "Demo1".
    - Nhập Username "Bob".
    - Thử nhập sai pass -> Show lỗi. Nhập đúng pass "123" -> Vào được.
    - _Điểm nhấn_: Bên Tab 1 (Alice) ngay lập tức hiện dòng thông báo "Bob has entered the void".

3.  **Chat & Tính năng**:
    - **Typing**: Trên máy Bob gõ phím (chưa gửi) -> Chỉ sang máy Alice: "Thấy không, nó hiện 'Bob is typing...' ngay lập tức".
    - **Gửi tin**: Bob gửi "Hello Alice". Alice nhận ngay.
    - **Gửi ảnh**: Thử upload một ảnh nhỏ. Cả 2 bên đều thấy ảnh.

4.  **Voice Chat**:
    - Bấm nút Voice/Headphone.
    - Show chỉ báo "In Voice" hiện lên 2 người.
    - (Nếu có thể) Thử nói aloo aloo để chứng minh tiếng đi qua.

5.  **Rời Phòng & Tự Hủy**:
    - Bob bấm "Leave". Alice thấy thông báo "Bob vanished".
    - Alice bấm "Leave".
    - _Kết luận_: "Lúc này trên Server, phòng Demo1 đã bị xóa hoàn toàn. Nếu ai đó thử Join lại 'Demo1', Server sẽ báo phòng không tồn tại (hoặc tạo mới phòng trắng)."

---

## ❓ Phần 5: Câu Hỏi Thường Gặp (Q&A)

Chuẩn bị sẵn câu trả lời cho thầy cô/giám khảo:

1.  _Dữ liệu chat lưu ở đâu?_
    - **Trả lời**: Không lưu ở đâu cả. Chỉ nằm trên RAM server và RAM browser lúc chạy. Tắt là mất. Đây là tính năng bảo mật (Privacy by Default).
2.  _Server chịu tải được bao nhiêu?_
    - **Trả lời**: Vì dùng Socket.io rất nhẹ, một server Node.js nhỏ có thể chịu vài nghìn kết nối đồng thời. Giới hạn chính là băng thông (nếu gửi nhiều ảnh/file).
3.  _Voice chat có làm nặng server không?_
    - **Trả lời**: Không, vì em đã tách Voice sang LiveKit (hoặc WebRTC), server Node.js chỉ làm nhiệm vụ kết nối (signaling), luồng âm thanh đi trực tiếp (P2P) hoặc qua SFU của LiveKit nên rất nhẹ, không ảnh hưởng đến việc chat text.

---

> **Lời khuyên cuối**: Hãy nói to, rõ ràng, và tự tin. Nhấn mạnh vào từ khóa **"Realtime" (Thời gian thực)** và **"Anonymous" (Ẩn danh/Bảo mật)**. Chúc bạn 10 điểm!
