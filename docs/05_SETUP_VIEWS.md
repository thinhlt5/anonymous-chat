# 🚪 FILE PHÂN TÍCH: SETUP VIEWS (CÁC MÀN HÌNH NHẬP LIỆU)

> **Bao gồm:** `HomeView`, `IdentityView`, `CreateRoomView`, `JoinRoomView`, `JoinPasswordView`.
> **Mục tiêu:** Thu thập thông tin User trước khi vào Chat.
> **Logic chung:** Nhập liệu (Input) -> Kiểm tra (Validate) -> Chuyển màn hình (Navigate).

---

## 🎓 GÓC SOI CHIẾU LÝ THUYẾT MẠNG (MAPPING TO NETWORK THEORY)

| Code thực tế           | Lý thuyết Lập Trình Mạng     | Giải thích "Ăn điểm"                                                                                                                           |
| :--------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_room` event     | **Request-Response Pattern** | Dù dùng Socket (2 chiều), nhưng ở đây ta dùng nó theo kiểu hỏi-đáp truyền thống. Client hỏi "Phòng có pass không?", Server trả lời "Có/Không". |
| `disabled={!input}`    | **Client-side Validation**   | Kiểm tra dữ liệu ngay tại máy người dùng trước khi gửi đi. Giúp giảm tải cho Server và giảm bớt các gói tin rác (Traffic Reduction).           |
| `socket.emit` (Create) | **Control Plane Signaling**  | Đây là các bản tin điều khiển (Control Messages) để thiết lập phiên làm việc, khác với các bản tin dữ liệu (Data Plane) như chat/file.         |

---

## 📂 1. `HomeView.jsx` (Trang chủ)

- **Nhiệm vụ:** Chỉ là trang bìa (Landing Page). Có 2 nút to đùng: "START NEW" và "JOIN EXISTING".
- **Logic:**
  - Bấm "Start" -> Gọi `navigateTo('NAME')` (Chuyển sang bước nhập tên).
  - Bấm "Join" -> Cũng gọi `navigateTo('NAME')`. (Cả 2 đều phải nhập tên trước).

---

## 📂 2. `IdentityView.jsx` (Nhập Tên)

- **Dòng 52-53 (Xử lý nhập):**

  ```javascript
  onChange={(e) => setUserData({ ...userData, username: e.target.value })}
  ```

  - **Logic:** Dùng `...userData` (Spread Operator) để **giữ nguyên** các trường khác (room, password), chỉ cập nhật trường `username`. Đây là cách update state object chuẩn trong React.

- **Dòng 77 (Disable nút):**

  ```javascript
  disabled={!userData.username.trim()}
  ```

  - Nếu tên rỗng hoặc toàn dấu cách -> Nút mờ đi (không cho bấm).

---

## 📂 3. `CreateRoomView.jsx` (Tạo Phòng)

- **Dòng 102 (Gọi API):**

  ```javascript
  onClick = { handleCreateRoom };
  ```

  - Hàm này gọi `socket.emit('create_room', ...)`.
  - Socket trả về `success: true` -> Chuyển vào chat.
  - Socket trả về `false` (Trùng tên) -> Hiện lỗi đỏ.

---

## 📂 4. `JoinRoomView.jsx` (Vào Phòng)

- **Dòng 69 (Kiểm tra phòng):**

  ```javascript
  onClick = { handleCheckRoom };
  ```

  - Hàm này gọi `socket.emit('check_room', ...)`.
  - Server trả lời: "Phòng này có password đấy" (`hasPassword: true`) -> Chuyển sang màn hình nhập Pass (`JoinPasswordView`).
  - Server trả lời: "Phòng mở, vào đi" -> Chuyển thẳng vào Chat.

---

## 📂 5. `JoinPasswordView.jsx` (Nhập Mật Khẩu)

- **Dòng 64-81 (Ẩn/Hiện Pass):**
  - Logic nút con mắt: Bấm vào thì đổi `type="text"` thành `type="password"` và ngược lại.
- **Dòng 94 (Chốt hạ):**

  ```javascript
  onClick = { joinRoom };
  ```

  - Gửi cả `room`, `username`, và `password` lên server.
  - Server kiểm tra đúng pass -> Cho vào. Sai pass -> Báo lỗi "Wrong Password".

---

## 💡 CÂU HỎI BẢO VỆ CHUNG

**Q: Logic chuyển màn hình này nằm ở đâu?**

> **A:** Nằm hết ở file cha `App.jsx`. Các file View này chỉ là giao diện (UI), khi bấm nút nó gọi hàm `navigateTo` (được truyền xuống từ cha) để nhờ cha chuyển cảnh. Đây là mô hình "Smart Container, Dumb Component" (Cha thông minh xử lý logic, Con ngốc chỉ hiển thị).
