# 🧠 FILE PHÂN TÍCH: `server/server.js`

> **Vai trò:** Backend Server (Node.js) - Quản lý kết nối, phòng chat và luân chuyển tin nhắn.
> **Mức độ quan trọng:** ⭐⭐⭐⭐⭐ (Sống còn)

---

## 🎓 GÓC SOI CHIẾU LÝ THUYẾT MẠNG (MAPPING TO NETWORK THEORY)

| Code thực tế           | Lý thuyết Lập Trình Mạng         | Giải thích "Ăn điểm"                                                                                                                           |
| :--------------------- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `require('socket.io')` | **WebSocket Protocol (Layer 7)** | Thay vì HTTP (Request-Response), ta dùng WebSocket để giữ kết nối **Persistent** (Bền vững) và **Full-duplex** (Song công - 2 chiều cùng lúc). |
| `socket.emit(...)`     | **TCP (Layer 4)**                | Socket.IO chạy trên nền TCP. Mọi tin nhắn text/file đều được đảm bảo **Reliability** (Độ tin cậy - Đến nơi đầy đủ, đúng thứ tự).               |
| `maxHttpBufferSize`    | **Flow Control & Congestion**    | Giới hạn kích thước gói tin Application Layer để tránh làm nghẽn bộ đệm TCP (TCP Buffer) và treo tiến trình (Blocking I/O).                    |
| `io.to(room).emit`     | **Multicast/Broadcast**          | Thay vì gửi Unicast (1-1) cho từng người, ta gửi cho một nhóm xác định (Room aka Multicast Group).                                             |
| `In-Memory (rooms)`    | **Volatile Storage**             | Lưu trữ trên RAM. Phụ thuộc vào vòng đời của Process. Minh họa cho tính chất "Không bền vững" (Stateless về mặt ổ cứng).                       |

---

## 1. PHẦN KHỞI TẠO (SETUP)

### 📌 Lines 1-20: Cấu hình Server & Express

```javascript
1: const express = require('express');
2: const http = require('http');
3: const { Server } = require("socket.io");
4: const cors = require('cors');
```

- **Giải thích:** Import các thư viện lõi. `express` để tạo API, `socket.io` để chat real-time, `cors` để cho phép Frontend (Vercel) kết nối vào Backend (Render).

```javascript
50: const io = new Server(server, {
51:     cors: { origin: [...] },
61:     maxHttpBufferSize: 10 * 1024 * 1024 // 10MB
});
```

- **Chi tiết:** Khởi tạo Socket Server.
- **`maxHttpBufferSize`**: Đây là dòng **quan trọng nhất về bảo mật**. Nó giới hạn kích thước gói tin tối đa là 10MB. Nếu ai đó cố gửi file 1GB để làm treo server (DDoS), Socket.IO sẽ tự động ngắt kết nối người đó ngay lập tức.

---

## 2. PHẦN LƯU TRỮ (STORAGE)

### 📌 Lines 68-75: In-Memory Database

```javascript
69: let rooms = {};
72: let socketRoomMap = {};
```

- **Giải thích:** Toàn bộ dữ liệu được lưu trên **RAM** (Biến `let`).
- **Tại sao?**
  - **Tốc độ:** RAM nhanh gấp triệu lần ổ cứng.
  - **Ẩn danh:** Tắt server là mất hết. Không lưu log, không lưu lịch sử chat. Đây là tính năng bảo mật (Feature), không phải lỗi.

---

## 3. PHẦN LOGIC (HELPER FUNCTIONS)

### 📌 Lines 98-105: Cơ chế Tự hủy (Self-Destruct)

```javascript
98: const selfDestructRoom = (roomName) => {
101:    if (rooms[roomName].users.size === 0) {
102:        delete rooms[roomName];
103:        logSystem(`SELF-DESTRUCT...`);
104:    }
};
```

- **Logic:** Hàm này được gọi mỗi khi có ai đó thoát phòng. Nếu phòng trống trơn (`size === 0`), nó xóa luôn cái phòng đó khỏi biến `rooms`.
- **Mục đích:** Giải phóng RAM. Không thì server chạy 1 năm sẽ bị tràn bộ nhớ (Memory Leak).

---

## 4. XỬ LÝ SỰ KIỆN (SOCKET HANDLERS)

### 📌 `connection` (Line 111)

`io.on("connection", (socket) => { ... })`

- Hàm này chạy mỗi khi có 1 người mở trang web. Biến `socket` đại diện cho kết nối của người đó.

### 📌 `join_room` (Line 150) - Quan trọng nhất!

```javascript
150: socket.on("join_room", ({ room, password... }, callback) => {
    // 1. Kiểm tra phòng có tồn tại không
    // 2. Kiểm tra mật khẩu (nếu có)
    // 3. Kiểm tra tên có trùng không

    // Nếu OK hết thì:
    175: rooms[room].users.set(socket.id, userData); // Thêm vào list
    178: socket.join(room); // Join vào kênh chung
    183: socket.to(room).emit("system_message", ...); // Báo người khác
    192: callback({ success: true... }); // Báo lại cho người gửi là "Vào đi"
});
```

- `socket.join(room)`: Hàm "thần thánh" của Socket.IO, gom user vào một nhóm để sau này chỉ cần gửi tin cho nhóm đó thôi.
- `callback`: Giúp Frontend biết là mình join thành công hay thất bại để chuyển màn hình.

### 📌 `send_message` (Line 198)

```javascript
198: socket.on("send_message", (data) => {
    218: io.to(safeRoom).emit("receive_message", messageData);
});
```

- **`io.to(safeRoom)`**: Gửi tin nhắn cho **TẤT CẢ** mọi người trong phòng (bao gồm cả người gửi).
  - _Tại sao gửi lại cho cả người gửi?_ Để đảm bảo tính đồng bộ (Synchronized). Người gửi chỉ thấy tin nhắn hiện lên khi Server đã xác nhận và gửi lại. Điều này giúp User biết chắc chắn là tin nhắn đã đi thành công.

### 📌 `send_file` (Line 231)

```javascript
231: socket.on("send_file", ({ fileData... }) => {
    233: if (fileSize > 10 * 1024 * 1024) return... // Check lại lần nữa
    249: io.to(room).emit("receive_message", ...);
});
```

- **Base64:** Phần `fileData` là một chuỗi ký tự rất dài (Base64). Server không quan tâm nó là ảnh hay PDF, cứ thế mà bắn đi cho người khác. Người nhận sẽ tự giải mã.

---

## 5. CÂU HỎI BẢO VỆ DỰA TRÊN FILE NÀY

**Q: Tại sao em dùng `io.to().emit()` mà không dùng `socket.broadcast.to().emit()` ở hàm gửi tin nhắn?**

> **A:** Dạ, `io.to().emit()` gửi cho cả người gửi. Em muốn người gửi cũng nhận lại tin nhắn từ server để confirm là tin nhắn đã đến nơi, đảm bảo tính nhất quán dữ liệu (Consistency) cho tất cả user.

**Q: Nếu Server đang chạy mà mất điện, dữ liệu trong biến `rooms` đi đâu?**

> **A:** Mất hết ạ. Vì em dùng cơ chế In-Memory để đảm bảo tính ẩn danh tuyệt đối cho người dùng.
