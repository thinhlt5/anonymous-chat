# 📖 DETAILED CODE WALKTHROUGH (LINE-BY-LINE)

> **Mục tiêu:** Giải thích chi tiết từng dòng code quan trọng để bạn hiểu sâu bản chất, không học vẹt.
> **Cách đọc:** Mở song song file code của bạn và tài liệu này để đối chiếu dòng (Line).

---

## 📂 FILE 1: `server/server.js` (Backbone của hệ thống)

Đây là nơi khởi nguồn mọi hoạt động.

### 1.1. Khởi tạo & Cấu hình (Lines 1-62)

- **L1-4:** Import các thư viện cần thiết.
  - `express`: Framework web để tạo API.
  - `http`: Thư viện lõi của Node.js để tạo HTTP Server.
  - `socket.io`: Thư viện Real-time.
  - `cors`: Cho phép frontend (tên miền khác) gọi API vào backend.
- **L31-38 (AccessToken):**
  - Đây là đoạn code tạo **JWT Token** cho LiveKit.
  - **Logic:** Frontend gọi API `/api/get-token` -> Server dùng `API_KEY` và `API_SECRET` (bí mật) để ký một vé (token) -> Trả về cho Frontend.
  - **Tại sao?** Frontend không được giữ `API_SECRET` (lộ là mất tiền), nên phải xin Server cấp quyền.
- **L50-62 (Khởi tạo Socket.IO):**
  - `cors`: Cấu hình cho phép `localhost:5173` (Frontend dev) và `vercel.app` (Production) kết nối.
  - `maxHttpBufferSize: 1e7`: **QUAN TRỌNG**. Giới hạn gói tin 10MB. Nếu ai gửi file >10MB, Socket.io sẽ tự ngắt kết nối để bảo vệ RAM server.

### 1.2. Kho lưu trữ In-Memory (Lines 68-75)

- `let rooms = {}`: Biến toàn cục lưu trữ danh sách phòng.
  - Cấu trúc: `Review key-value`. Key là `roomName`, Value là object chứa `password` và danh sách `users`.
- `let socketRoomMap = {}`:
  - **Mục đích:** Tra cứu nhanh. Khi một socket bị ngắt kết nối (`disconnect`), ta chỉ có `socket.id`. Nhờ map này, ta biết ngay ông này đang ở phòng nào để vào đó xóa ổng đi.

### 1.3. Helper Functions (Lines 81-105)

- `logSystem(message)`: Hàm in log ra màn hình console của Server (màn hình đen). Nó thêm `timestamp` để ta biết sự kiện xảy ra lúc mấy giờ.
- `selfDestructRoom(roomName)`:
  - **Logic:** Kiểm tra `rooms[roomName].users.size === 0`.
  - **Tác dụng:** Nếu phòng trống -> `delete rooms[roomName]`. Giải phóng RAM ngay lập tức. Đây là cơ chế "Zero Footprint".

### 1.4. Sự kiện Socket chính (Lines 111-429)

Đây là phần "thịt" của server.

- **L117 `socket.on("check_room")`:**
  - Dùng khi user nhập tên phòng ở `HomeView` hoặc `JoinRoomView`. Server trả về `true/false` để Frontend biết đường chuyển hướng (nhập pass hay vào luôn).

- **L130 `socket.on("create_room")`:**
  - **L138:** Khởi tạo `users: new Map()`. Dùng `Map` thay vì `Array` hay `Object` vì `Map` cho phép thêm/xóa user bằng `socket.id` cực nhanh (Độ phức tạp O(1)).

- **L150 `socket.on("join_room")`:** (Hàm quan trọng nhất)
  - **L178:** `socket.join(room)`. Đây là hàm ma thuật của Socket.io. Nó gán socket này vào một nhóm.
  - **L183:** `socket.to(room).emit(...)`. Gửi tin nhắn cho "những người khác trong phòng" (trừ bản thân mình). Dùng để báo "A vừa tham gia".
  - **L190:** `broadcastUserList`. Gửi danh sách user mới nhất cho **TẤT CẢ** mọi người trong phòng (bao gồm cả người vừa vào) để cập nhật Sidebar.

- **L198 `socket.on("send_message")`:**
  - **L218:** `io.to(safeRoom).emit(...)`. Tại sao dùng `io.to` mà không phải `socket.to`?
    - `io.to`: Gửi cho **CẢ PHÒNG** (cả thằng gửi). Để thằng gửi cũng thấy tin nhắn mình vừa gõ hiện lên màn hình.
  - **L209:** Tạo object `messageData` có `id` và `timestamp`. Server cấp ID để đảm bảo nhất quán.

- **L231 `socket.on("send_file")`:**
  - **L233:** Kiểm tra lại kích thước file lần nữa (Double Check). Frontend check rồi nhưng Backend vẫn phải check để chống hack.

- **L339 `socket.on("disconnect")`:**
  - Sự kiện này tự động kích hoạt khi User đóng tab hoặc mất mạng.
  - **Logic:** Tìm phòng `socketRoomMap` -> Xóa User khỏi `rooms` -> Báo cho người ở lại -> Kiểm tra `selfDestructRoom`.

---

## 📂 FILE 2: `client/src/App.jsx` (Bộ não Frontend)

### 2.1. Logic Kết nối Socket (Lines 27-44)

- **L27 `getSocketUrl`:**
  - Logic thông minh: Nếu chạy localhost -> dùng `localhost:3001`. Nếu chạy trên Vercel -> dùng đường dẫn tương đối `/` (để proxy lo).
- **L40 `const socket = io(...)`:**
  - Khởi tạo kết nối **NGAY LẬP TỨC** khi file này được load. Biến `socket` này nằm ngoài Component `App` -> Nó là **Singleton** (Duy nhất). Dù Component App render lại bao nhiêu lần, kết nối vẫn giữ nguyên (không bị reconnect liên tục).

### 2.2. State Management (Lines 51-78)

- `currentView`: State quyết định đang hiển thị màn hình nào.
- `userData`: Lưu tên, phòng, pass.
- `messages`: Mảng chứa toàn bộ kịch bản chat.
- `roomUsers`: Danh sách người đang online.

### 2.3. useEffect "Lắng nghe sự kiện" (Lines 85-175)

Đây là nơi React giao tiếp với Socket.

- **L113 `socket.on('receive_message')`:**
  - Khi có tin nhắn mới -> `setMessages((prev) => [...prev, message])`.
  - Dùng hàm callback `prev => ...` để đảm bảo luôn lấy được trạng thái mới nhất của mảng messages, tránh lỗi **Stale Closure** (lỗi kinh điển trong React hooks).
- **L161 `return () => { ... }` (Cleanup):**
  - Rất quan trọng! Khi App unmount (tắt), phải `socket.off` hết sự kiện. Nếu không, sự kiện sẽ bị nhân đôi, nhân ba... -> Memory Leak.

### 2.4. Điều hướng (RenderView - Line 315)

- Dùng `switch-case` để chọn Component hiển thị. Đây là cách làm SPA (Single Page App) thủ công đơn giản, không cần cài `react-router-dom` cho cồng kềnh.

---

## 📂 FILE 3: `client/src/views/ChatView.jsx` (Giao diện Chat)

### 3.1. Props & State (Lines 25-45)

- Nhận `socket`, `messages`, `roomUsers` từ `App.jsx` truyền xuống.
- State nội bộ: `messageInput` (text đang gõ), `previewFile` (ảnh user vừa chọn/paste xong chưa gửi).

### 3.2. Auto-scroll (Lines 52-54)

- `messagesEndRef.current?.scrollIntoView`: Mỗi khi mảng `messages` thay đổi, tự động cuộn xuống đáy.
- `behavior: 'smooth'`: Cuộn mượt mà thay vì giật cục.

### 3.3. Xử lý Gửi tin (Lines 57-84)

- **L61:** Ưu tiên gửi File trước nếu có (`previewFile`).
- **L74:** Sau đó mới gửi Text.
- **L82:** `socket.emit('typing', ... isTyping: false)`. Ngừng gõ ngay khi bấm gửi.

### 3.4. Xử lý File & Ảnh (Lines 102-124)

- **L110 `FileReader`:** Đây là API của trình duyệt để đọc file từ ổ cứng lên RAM trình duyệt.
- **L123 `readAsDataURL`:** Đọc file và chuyển thành chuỗi **Base64** (`data:image/png;base64,...`). Chuỗi này dài ngoằng, dùng để gửi qua Socket hoặc hiển thị vào thẻ `<img>` (Preview).

### 3.5. Xử lý Paste (Lines 139-151)

- Lắng nghe sự kiện `onPaste`.
- **L140:** `e.clipboardData.items`. Kiểm tra xem trong Clipboard có ảnh không (`item.type.indexOf('image')`).
- Nếu có -> Gọi `processFile` -> User thấy ảnh hiện lên khung preview ngay lập tức. Một tính năng UX nâng cao (giống Messenger/Zalo).

### 3.6. Render Tin nhắn (Lines 200-248)

- **L211 `const isOwn`:**
  - Kiểm tra tin nhắn này có phải của mình không?
  - Nếu `true` -> Class `justify-end` (căn phải), màu xanh cyan.
  - Nếu `false` -> Class `justify-start` (căn trái), màu xám tối.
- **L240 `dangerouslySetInnerHTML` với `DOMPurify`:**
  - Cho phép render HTML (ví dụ chữ đậm, nghiêng).
  - **BẮT BUỘC** dùng `DOMPurify.sanitize` để lọc bỏ các thẻ `<script>` độc hại. Nếu không, hacker có thể gửi tin nhắn chứa script đánh cắp cookie của người khác (Lỗi XSS).

---

## 💡 TỔNG KẾT DÀNH CHO BẠN

Nếu thầy hỏi sâu vào code, hãy nhớ các từ khóa (Keywords) tôi đã bôi đậm trong bài này:

1.  **Singleton Socket** (trong App.jsx).
2.  **In-Memory Map** (trong server.js).
3.  **Base64 Encoding** (trong ChatView.jsx xử lý file).
4.  **Stale Closure Prevention** (dùng `setMessages(prev => ...)`).
5.  **Cleanup Function** (trong useEffect return socket.off).

Cầm tài liệu này và code song song, bạn sẽ "bất khả chiến bại"! 🛡️
