# Phân Tích & Tài Liệu Về Socket.io

## 1. Tại sao lại chọn Socket.io? ("Lý do")

Đối với dự án **Anonymous Chat** này, Socket.io được chọn làm công cụ cốt lõi để giao tiếp và quản lý trạng thái vì các lý do chính sau:

### 🚀 Giao Tiếp Hai Chiều Thời Gian Thực (Real-Time Bidirectional)

- **HTTP Tiêu Chuẩn** (REST API) hoạt động theo mô hình "Yêu cầu - Phản hồi" (Client hỏi, Server trả lời). Nó **không** phù hợp cho chat vì client sẽ không biết khi nào có tin nhắn mới trừ khi phải liên tục hỏi server (polling).
- **Socket.io** duy trì một kết nối mở (WebSocket) cho phép **Server ĐẨY (PUSH) dữ liệu xuống Client** ngay lập tức. Khi Người dùng A gửi tin nhắn, server ngay lập tức "đẩy" nó sang Người dùng B.

### 🏢 Hỗ Trợ "Phòng" (Room) Tích Hợp Sẵn

- Socket.io có sẵn khái niệm **"Rooms"** (Phòng).
- Điều này cực kỳ quan trọng cho ứng dụng của chúng ta, nơi nhiều cuộc trò chuyện diễn ra đồng thời.
- Chúng ta chỉ cần gọi `socket.join("id_phòng")` và `io.to("id_phòng").emit(...)` để đảm bảo tin nhắn chỉ được gửi đến những người trong phòng đó, đảm bảo tính riêng tư và biệt lập.

### ⚡ Kiến Trúc Hướng Sự Kiện (Event-Based)

- Ứng dụng chat hoạt động dựa trên sự kiện: "Người dùng đã tham gia", "Người dùng nhận tin nhắn", "Người dùng đang nhập...".
- Socket.io khớp hoàn hảo với tư duy mô hình này bằng cách sử dụng mẫu `.on(tên_sự_kiện, hàm_xử_lý)` và `.emit(tên_sự_kiện, dữ_liệu)`.

### 🛡 Độ Tin Cậy (Reliability)

- Nó tự động xử lý việc kết nối lại (reconnection).
- Nếu kết nối bị rớt, nó sẽ đệm các gói tin và cố gắng kết nối lại, đảm bảo trải nghiệm người dùng mượt mà ngay cả khi mạng chập chờn.

---

## 2. LiveKit vs. Socket.io (Tại sao dùng cả hai?)

Bạn có thể sẽ bị hỏi: _"Tại sao giả sử đã có LiveKit (cho voice) rồi, bạn vẫn cần Socket.io?"_

| Công nghệ     | Vai trò trong dự án                    | Tại sao?                                                                                                                                                                                                       |
| :------------ | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Socket.io** | **Mặt Phẳng Điều Khiển & Văn Bản**     | Nhẹ, dễ dàng xử lý dữ liệu JSON, trạng thái phòng, mật khẩu, và tin nhắn văn bản. Hoàn hảo cho việc "Signaling" (thông báo cho người dùng biết ai đang ở đâu).                                                 |
| **LiveKit**   | **Mặt Phẳng Dữ Liệu (Âm thanh/Media)** | Chuyên biệt cho WebRTC (Giao tiếp thời gian thực). Việc xử lý luồng âm thanh thô (raw audio streams) đòi hỏi kỹ thuật phức tạp (STUN/TURN) và độ trễ thấp mà Socket.io không được thiết kế chuyên dụng để làm. |

**Tóm lại**: Chúng ta dùng Socket.io để _quản lý phòng_ (ai đang ở đây, nhật ký chat) và dùng LiveKit để _truyền tải giọng nói_.

---

## 3. Tham Chiếu Hàm/Sự Kiện ("Chi tiết")

Dưới đây là phân tích chi tiết từng sự kiện được xử lý trong file `server.js` của bạn.

### A. Kết Nối & Vòng Đời (Connection & Lifecycle)

| Sự kiện      | Hướng        | Mô tả                                                                                                                                                                                                                                        |
| :----------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connection` | **Hệ thống** | Tự động kích hoạt khi người dùng mở trang web. Chứa `socket.id` duy nhất của người dùng đó.                                                                                                                                                  |
| `disconnect` | **Server**   | Kích hoạt khi người dùng đóng tab hoặc mất mạng. <br>**Logic**: Tìm xem họ đang ở phòng nào, xóa họ khỏi danh sách người dùng, thông báo cho người khác (`system_message`), và nếu phòng trống, **Tự Hủy** (Self-Destruct) dữ liệu phòng đó. |

### B. Quản Lý Phòng (Room Management)

| Sự kiện       | Hướng               | Mô tả                                                                                                                                                                                                                                                                 |
| :------------ | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_room`  | **Client → Server** | Kiểm tra xem phòng có tồn tại hay không trước khi thử tham gia. Dùng để hiện UI "Không tìm thấy phòng" hoặc "Yêu cầu mật khẩu".                                                                                                                                       |
| `create_room` | **Client → Server** | Khởi tạo một phòng mới trong bộ nhớ server (biến `rooms`). Thiết lập mật khẩu (nếu có).                                                                                                                                                                               |
| `join_room`   | **Client → Server** | Hàm xử lý phức tạp nhất.<br>1. Kiểm tra phòng tồn tại.<br>2. **Xác thực Mật Khẩu**.<br>3. Kiểm tra trùng tên (username).<br>4. Thêm người dùng vào map `rooms`.<br>5. Bắn `system_message` cho người khác ("User joined").<br>6. Broadcast danh sách `user_list` mới. |
| `leave_room`  | **Client → Server** | Khi người dùng bấm nút "Leave". Tương tự như disconnect nhưng được kích hoạt chủ động. Thoát sạch sẽ hơn.                                                                                                                                                             |

### C. Chức Năng Chat

| Sự kiện           | Hướng               | Mô tả                                                                                                                                                                                             |
| :---------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send_message`    | **Client → Server** | Nhận tin nhắn văn bản từ một người dùng. <br>**Hành động**: Chuyển tiếp (Forward) nó đến tất cả những người khác trong phòng bằng `socket.to(room).emit("receive_message", ...)`.                 |
| `send_file`       | **Client → Server** | Xử lý tải lên tệp (Ảnh/Tài liệu). <br>**Kiểm tra**: Kiểm tra xem file có < 10MB không.<br>**Hành động**: Đóng gói dữ liệu file và bắn sự kiện `receive_message` với loại `'image'` hoặc `'file'`. |
| `receive_message` | **Server → Client** | **(Client Lắng Nghe)**. Sự kiện mà phía frontend lắng nghe để hiển thị bong bóng chat mới lên màn hình.                                                                                           |

### D. Trải Nghiệm Người Dùng (UX)

| Sự kiện          | Hướng               | Mô tả                                                                                                                        |
| :--------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `typing_start`   | **Client → Server** | Kích hoạt khi người dùng bắt đầu gõ phím. Server chuyển tiếp tin này cho người khác để họ thấy dòng chữ "User is typing...". |
| `typing_stop`    | **Client → Server** | Kích hoạt khi mất focus (blur) hoặc sau 2s không gõ (timeout). Xóa chỉ báo đang nhập.                                        |
| `system_message` | **Server → Client** | Dùng cho các thông báo đặc biệt: "User joined", "User left", v.v. Được hiển thị khác biệt so với tin nhắn chat thông thường. |

---

## 4. Các Khái Niệm Chính Cần Nhắc Tới Trong Bài Thuyết Trình

1.  **Cơ sở dữ liệu Trong-Bộ-Nhớ (In-Memory Database)**: Dự án sử dụng một Javascript Object (`let rooms = {}`) làm cơ sở dữ liệu. Điều này có nghĩa là nó cực nhanh (tốc độ RAM) nhưng là "Vô thường" (Ephemeral - dữ liệu sẽ biến mất nếu khởi động lại server). Điều này phù hợp với tiêu chí **"Ẩn danh" (Anonymous)** — không có log vĩnh viễn nào được lưu lại.
2.  **Giao thức Tự Hủy (Self-Destruct Protocol)**: Giải thích hàm `selfDestructRoom`. Khi người dùng cuối cùng rời đi, phòng sẽ bị xóa khỏi bộ nhớ ngay lập tức. Thiết kế hướng tới sự riêng tư.
3.  **Phát Sóng (Broadcasting)**: Sử dụng thuật ngữ **"Broadcasting"** khi giải thích cách một người gửi tin nhắn và tất cả những người khác đều nhận được.

---

> _Chúc bạn thuyết trình tốt nhé! Kiến trúc này rất vững chắc cho một ứng dụng chat thời gian thực._
