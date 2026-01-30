# Tài Liệu Kỹ Thuật Frontend - Anonymous Chat

## 1. Tổng Quan Kiến Trúc Frontend

Frontend của dự án được xây dựng dựa trên các công nghệ hiện đại, tập trung vào hiệu năng và trải nghiệm người dùng (UX) mượt mà.

- **Framework Chính**: [React 18+](https://react.dev/) - Sử dụng mô hình **Functional Component** và **Hooks** hoàn toàn.
- **Build Tool**: [Vite](https://vitejs.dev/) - Giúp tốc độ khởi động và HMR (Hot Module Replacement) cực nhanh.
- **Ngôn Ngữ**: JavaScript (ES6+).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework giúp xây dựng giao diện nhanh chóng.
- **Icons**: `lucide-react` - Bộ icon nhẹ, hiện đại và nhất quán.

---

## 2. Cấu Trúc Thư Mục & Tổ Chức Code

Cấu trúc code được tổ chức theo hướng **Modular**, dễ mở rộng và bảo trì:

```
client/src/
├── components/      # Các thành phần tái sử dụng (Button, Input, Modal...)
├── views/           # Các màn hình chính (Pages)
│   ├── HomeView.jsx         # Trang chủ
│   ├── JoinRoomView.jsx     # Nhập tên phòng
│   ├── JoinPasswordView.jsx # Nhập mật khẩu
│   ├── IdentityView.jsx     # Chọn tên hiển thị (Nickname)
│   ├── ModeView.jsx         # Chọn chế độ (Chat/Voice)
│   ├── ChatView.jsx         # Màn hình Chat chính
│   └── VoiceChat.jsx        # Component xử lý Voice (LiveKit)
├── App.jsx          # Router "thủ công" quản lý luồng ứng dụng
├── socket.js        # File cấu hình Socket.io Client duy nhất (Singleton)
└── index.css        # Global Styles & Tailwind Config
```

---

## 3. Các Điểm Kỹ Thuật Nổi Bật (Selling Points)

Khi thuyết trình về Frontend, hãy tập trung vào các điểm sau để gây ấn tượng:

### A. Quản Lý Trạng Thái (State Management)

- Thay vì dùng thư viện nặng nề như Redux, dự án sử dụng `useState` và `useEffect` của React + cơ chế **Props Drilling** đơn giản vì ứng dụng không quá phức tạp.
- Điều này giúp code nhẹ, dễ đọc và debug.

### B. Single Page Application (SPA) "Tự Chế"

- Dự án **không dùng** `react-router-dom`.
- **Tại sao?** Để kiểm soát hoàn toàn hiệu ứng chuyển cảnh (Transition) giữa các bước (Step-by-step).
- **Cách hoạt động**:
  - `App.jsx` giữ một biến state `currentView`.
  - Khi người dùng nhấn "Next", hàm `setView(...)` được gọi -> Component mới được render ra ngay lập tức mà không cần tải lại trang.
  - Luồng đi: `Home` -> `JoinRoom` -> `Password` (nếu có) -> `Identity` -> `Mode` -> `Chat`.

### C. Giao Diện Cyberpunk/Neon (UI/UX)

- **Glassmorphism**: Sử dụng hiệu ứng kính mờ (`backdrop-blur`) rất nhiều để tạo cảm giác hiện đại, có chiều sâu.
- **Animations**: Các hiệu ứng `animate-pulse`, `fadeIn` giúp giao diện "sống động", không bị tĩnh.
- **Responsive**: Sử dụng hệ thống Grid và Flexbox của Tailwind để đảm bảo chạy tốt trên cả Máy tính và Điện thoại.

### D. Xử Lý Socket Client (`socket.js`)

- Sử dụng mô hình **Singleton Pattern**: Chỉ khởi tạo kết nối Socket **một lần duy nhất** trong file `src/socket.js`.
- Các Views khác nhau chỉ `import socket from './socket'` để dùng lại kết nối đó.
- Lợi ích: Tránh việc lỡ tay tạo ra 10 kết nối socket khi người dùng chuyển trang.

---

## 4. Chi Tiết Các Màn Hình Chính

### 1. ChatView (`ChatView.jsx`)

Đây là màn hình phức tạp nhất.

- **Logic**:
  - Lắng nghe sự kiện `receive_message` từ server để cập nhật mảng `messages`.
  - Tự động cuộn xuống cuối (Auto-scroll) khi có tin nhắn mới bằng `useRef`.
  - Xử lý file upload: Convert file sang Base64 hoặc Blob để preview trước khi gửi.
- **Giao diện**: Chia 3 phần: Header (Info phòng), Body (List tin nhắn), Footer (Input nhập liệu).

### 2. VoiceChat (`VoiceChat.jsx`)

- Sử dụng SDK `@livekit/components-react`.
- **Component**: `<LiveKitRoom />` bao bọc lấy các chức năng.
- **Tự động hóa**: Ngay khi người dùng vào phòng Chat, component này âm thầm kết nối (hoặc chờ người dùng bấm nút) để lấy Token từ Server API và join kênh voice.
- **Visualizer**: Có các thanh sóng âm nhảy múa khi có người nói (dùng `useParticipants` hook để detect ai đang nói).

---

## 5. Kịch Bản Thuyết Trình Frontend (Ví dụ)

> _"Về phía Frontend, chúng em chọn ReactJS kết hợp với TailwindCSS để xây dựng một giao diện mang phong cách Cyberpunk hiện đại._
>
> _Điểm đặc biệt trong kiến trúc Frontend của chúng em là:_
>
> 1.  **Quy trình từng bước (Step-based Flow)**: Không dùng Router truyền thống, chúng em tự xây dựng cơ chế điều hướng để tạo cảm giác như đang cài đặt một phần mềm mật vụ, từng bước xác thực người dùng.
> 2.  **Tối ưu hiệu năng Socket**: Kết nối Socket được quản lý tập trung (Singleton), đảm bảo dù người dùng chuyển qua lại giữa các màn hình thì kết nối vẫn thông suốt, không bị đứt đoạn.
> 3.  **Trải nghiệm Voice tích hợp**: Component VoiceChat được nhúng trực tiếp vào giao diện Chat, sử dụng React Hooks để hiển thị sóng âm và trạng thái mic theo thời gian thực."\*

---

> _Tài liệu này giúp bạn tự tin trả lời các câu hỏi sâu về React và cách tổ chức code phía Client._
