# 🕵️ SOURCE CODE ANALYSIS & DEFENSE GUIDE

## PROJECT: ANONYMOUS CHAT

> **Role:** Senior Technical Lead hướng dẫn Junior
> **Mục tiêu:** Hiểu sâu code để trả lời vấn đáp (Viva Voce)

---

## 📂 FILE 1: `server/server.js` (THE BRAIN - BỘ NÃO)

### 1. Nhiệm vụ cốt lõi (Core Responsibility)

- **Vị trí:** Backend (Node.js).
- **Nhiệm vụ:** Là trạm trung chuyển trung tâm. Nó nhận tin nhắn từ Client A và phát lại cho các Client khác. Nó cũng quản lý việc tạo phòng, xóa phòng và xác thực mật khẩu. Đây là nơi chứa "Sự thật duy nhất" (Single Source of Truth) của ứng dụng.

### 2. Các khái niệm kỹ thuật "Ăn điểm" (Key Technical Terms)

- **Event Emitter (Bộ phát sự kiện):** Cơ chế "Hô - Đáp". Client hét lên "Gửi tin nhắn này đi!", Server nghe thấy và hét lại cho mọi người "Có tin nhắn mới này!".
  - _Analogy:_ Giống như Hệ thống loa phát thanh phường.
- **In-Memory Storage (Lưu trữ trên RAM):** Dùng biến `let rooms = {}` thay vì Database.
  - _Analogy:_ Giống viết lên bảng trắng, tắt điện (tắt server) là mất sạch. Bảo mật tuyệt đối.
- **Broadcasting (Phát sóng):** Gửi dữ liệu cho tất cả mọi người trừ người gửi (hoặc gửi cho tất cả).
- **Callback Acknowledgment (Xác nhận phản hồi):** Hàm trả về kết quả ngay sau khi Client gửi yêu cầu.
  - _Analogy:_ Giống tờ biên lai "Đã nhận hàng" khi đi gửi chuyển phát nhanh.

### 3. Phân tích Logic (Code Anatomy)

- **Input:** Nhận các sự kiện từ Client (`connect`, `join_room`, `send_message`, `send_file`).
- **Process:**
  - Kiểm tra logic (Phòng có tồn tại chưa? Sai mật khẩu không? File có quá nặng không?).
  - Cập nhật biến `rooms` trong RAM.
- **Output:** Phát sự kiện ngược lại cho Client (`receive_message`, `user_list`, `system_message`).

### 4. Giải mã các hàm quan trọng

- `io.on("connection", (socket) => { ... })`:
  - Mở cổng đón khách. Mỗi khi có trình duyệt kết nối vào, biến `socket` đại diện cho riêng trình duyệt đó.
- `socket.on("join_room", ...)`:
  - Sử dụng `socket.join(room)`. Đây là hàm thần thánh của Socket.IO giúp nhóm các user vào các "phòng ảo". Server không cần code logic lọc tin nhắn phức tạp, chỉ cần `to(room).emit` là xong.
- `selfDestructRoom(roomName)`:
  - Một hàm tiện ích (Helper Function). Kiểm tra `users.size === 0` thì `delete rooms[roomName]`.
  - _Tại sao?_ Để tiết kiệm RAM. Không dùng thì rác bộ nhớ (Memory Leak) sẽ làm sập server sau vài ngày.

### 5. Góc Vấn Đáp (Viva Voce)

**Q: Tại sao em dùng biến `rooms` cục bộ mà không dùng Redis? Nhược điểm là gì?**

> **A:** Dạ, em dùng biến cục bộ (In-Memory) để tối ưu tốc độ và đảm bảo tính ẩn danh (tắt là mất). Tuy nhiên, nhược điểm là **Không thể mở rộng (Non-scalable)**. Nếu chạy 2 Server Node.js, user ở server này không chat được với server kia vì biến `rooms` không chia sẻ được. Giải pháp thực tế là dùng Redis Adapter.

---

## 📂 FILE 2: `client/src/App.jsx` (THE CONDUCTOR - NHẠC TRƯỞNG)

### 1. Nhiệm vụ cốt lõi

- **Vị trí:** Frontend (React).
- **Nhiệm vụ:** Quản lý xem người dùng đang "đứng" ở màn hình nào (Home, Nhập tên, hay Chat). Nó khởi tạo kết nối mạng (`socket`) duy nhất và nuôi sống nó suốt quá trình app chạy.

### 2. Các khái niệm kỹ thuật "Ăn điểm"

- **Single Page Application (SPA):** Web không bao giờ tải lại trang. Các view chỉ ẩn/hiện.
- **State Management (Quản lý trạng thái):** Dùng `useState` để lưu `currentView`, `messages`, `roomUsers`. Thay đổi State -> Giao diện tự cập nhật.
- **Side Effects (Tác dụng phụ - useEffect):** Nơi xử lý các việc nằm ngoài luồng render giao diện, như việc lắng nghe sự kiện mạng.
- **Prop Drilling (Truyền props):** Truyền biến `socket` từ ông nội (`App`) xuống cha (`ChatView`) rồi xuống con.

### 3. Phân tích Logic

- **Input:** Sự kiện từ Socket.IO (`receive_message`) hoặc hành động User (Bấm nút tham gia).
- **Process:**
  - `useEffect` đăng ký các sự kiện lắng nghe `socket.on(...)`.
  - Hàm `renderView()` đóng vai trò như Router: `switch(currentView)`.
- **Output:** Render ra Component tương ứng (Ví dụ: `ChatView`).

### 4. Giải mã các hàm quan trọng

- `useEffect(() => { ... return () => { socket.off(...) } }, [])`:
  - Đây là đoạn quan trọng nhất!
  - _Tại sao có `socket.off`?_ Đây là **Cleanup Function**. Nếu không hủy lắng nghe, mỗi khi component render lại, nó sẽ tạo ra một bộ lắng nghe mới -> Nhận 1 tin nhắn mà hiện lên 10 lần (Duplicate Event Listeners).
- `navigateTo(view)`:
  - Thay đổi biến `currentView`. React thấy biến đổi -> Tự động vẽ lại màn hình mới. Đơn giản hóa việc điều hướng.

### 5. Góc Vấn Đáp

**Q: Tại sao em để `socket` ở file App.jsx mà không để trong ChatView.jsx?**

> **A:** Để duy trì **Persistent Connection** (Kết nối bền vững). Nếu để trong `ChatView`, mỗi khi user login/logout (thoát view), kết nối socket sẽ bị ngắt và tạo mới, gây mất ổn định và tốn tài nguyên bắt tay lại (Handshake overhead).

---

## 📂 FILE 3: `client/src/views/ChatView.jsx` (THE STAGE - SÂN KHẤU CHÍNH)

### 1. Nhiệm vụ cốt lõi

- **Vị trí:** Frontend (React View).
- **Nhiệm vụ:** Hiển thị danh sách tin nhắn, xử lý việc nhập liệu, gửi file và render giao diện chat.

### 2. Các khái niệm kỹ thuật "Ăn điểm"

- **Conditional Rendering (Render có điều kiện):** Dùng toán tử `&&` (ví dụ: `{isFile && <ImagePreview />}`).
- **Unidirectional Data Flow (Luồng dữ liệu một chiều):** User gõ phím -> `onChange` -> Trao đổi dữ liệu lên App.jsx (hoặc state nội bộ) -> Render lại UI.
- **Base64 Encoding:** Kỹ thuật chuyển file ảnh thành chuỗi ký tự để gửi đi.

### 3. Phân tích Logic

- **Input:** User gõ phím, chọn file, hoặc nhận tin nhắn mới từ `props`.
- **Process:**
  - `handleFileSelect`: Đọc file từ máy -> `FileReader` chuyển thành Base64.
  - `handleSendMessage`: Gói tin nhắn thành Object { content, room, user } -> `socket.emit`.
- **Output:** Cập nhật UI list tin nhắn.

### 4. Giải mã các hàm quan trọng

- `messagesDiv.current.scrollIntoView(...)`:
  - Sử dụng `useRef`. Tự động cuộn xuống dưới cùng khi có tin nhắn mới. Trải nghiệm người dùng (UX) cơ bản của ứng dụng chat.
- `handlePaste`:
  - Xử lý sự kiện dán từ Clipboard. Code này chặn hành động dán mặc định, kiểm tra xem trong bộ nhớ tạm có phải là ảnh không (Blob), nếu có thì xử lý như upload file.

### 5. Góc Vấn Đáp

**Q: Làm sao em hiển thị được tin nhắn của chính mình bên phải và người khác bên trái?**

> **A:** Em so sánh `socket.id` (ID của mình) với `message.senderId` (ID người gửi). Nếu trùng khớp -> Class CSS `flex-row-reverse` (nằm phải). Nếu khác -> nằm trái.

---

## 📂 FILE 4: `client/src/views/VoiceChat.jsx` (THE LIVEKIT INTEGRATION)

### 1. Nhiệm vụ cốt lõi

- **Vị trí:** Frontend.
- **Nhiệm vụ:** Nhúng SDK của LiveKit để xử lý gọi thoại. File này tách biệt logic phức tạp của WebRTC ra khỏi logic Chat.

### 2. Các khái niệm kỹ thuật "Ăn điểm"

- **SFU (Selective Forwarding Unit):** Server LiveKit đóng vai trò bộ chia tín hiệu.
- **Token Authentication:** Không dùng tên đăng nhập/mật khẩu, mà dùng JWT Token do Server cấp để vào phòng Voice.

### 3. Phân tích Logic

- **Input:** `roomName`, `username` từ props.
- **Process:**
  - Gọi API `/api/get-token` lên Server Express.
  - Có Token -> Nạp vào Component `<LiveKitRoom />`.
- **Output:** Tự động kết nối Micro, hiển thị ai đang nói (Active Speaker).

### 4. Giải mã các hàm quan trọng

- `<RoomAudioRenderer />`:
  - Component có sẵn của LiveKit. Nó tự động tạo thẻ `<audio>` ẩn để phát tiếng của người khác. Nếu không có dòng này, vào phòng thấy nhau nhưng điếc (không nghe gì).

### 5. Góc Vấn Đáp

**Q: Component này lấy Token ở đâu? Có an toàn không?**

> **A:** Nó `fetch` từ API backend của mình. Token này có thời hạn ngắn (TTL) và chỉ cấp quyền join đúng cái phòng đó thôi. Client không tự tạo token được vì cần `API_SECRET` chỉ server mới giữ.

---

## 📂 CÁC VIEWS CÒN LẠI (NAVIGATION VIEWS)

- **Bao gồm:** `HomeView`, `IdentityView`, `ModeView`, `CreateRoomView`, `JoinRoomView`.
- **Nhiệm vụ chung:** Thu thập thông tin User (Tên, Tên phòng, Mật khẩu).
- **Logic:** Chỉ là các Form Inout (Nhập liệu). Khi bấm Next -> Gọi hàm `navigateTo` của `App.jsx` để chuyển cảnh.
- **Lưu ý:** Không có logic mạng (Network Logic) phức tạp ở đây, chỉ là xác thực dữ liệu đầu vào (Validation) VD: Không được để trống tên.

---

## 💡 LỜI KHUYÊN CUỐI CÙNG CHO JUNIOR

Khi thầy hỏi, em đừng chỉ chăm chăm đọc code. Hãy nói về **Luồng đi của dữ liệu**.

- _"Em bấm nút Gửi -> Code gọi hàm X -> Socket bắn sự kiện Y -> Server nhận và phát lại Z -> Các Client khác nhận và vẽ lên màn hình."_
- Đó là cách một kỹ sư hiểu hệ thống. Chúc em bảo vệ tốt! 🚀
