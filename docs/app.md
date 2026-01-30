# 🎹 FILE PHÂN TÍCH: `client/src/App.jsx`

> **Vai trò:** "Nhạc trưởng" (Orchestrator). Quản lý toàn bộ trạng thái (State), Điều hướng (Navigation) và giữ kết nối Mạng (Socket Connection).
> **Mức độ quan trọng:** ⭐⭐⭐⭐ (Khung sườn)

---

## 🎓 GÓC SOI CHIẾU LÝ THUYẾT MẠNG (MAPPING TO NETWORK THEORY)

| Code thực tế         | Lý thuyết Lập Trình Mạng        | Giải thích "Ăn điểm"                                                                                                                                                    |
| :------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io(url)`            | **3-Way Handshake + Upgrade**   | Khi dòng này chạy, Client gửi HTTP Request kèm header `Upgrade: websocket`. Server trả về `101 Switching Protocols`. Đây là quá trình "Bắt tay" nâng cấp giao thức.     |
| `socket.on(...)`     | **Event-Driven (Asynchronous)** | Lập trình mạng bất đồng bộ (Asynchronous). Chương trình không "đứng chờ" (Block) tin nhắn đến, mà đăng ký một hàm "Callback" để khi nào tin đến thì chạy.               |
| `useEffect`          | **Connection Lifecycle**        | Quản lý vòng đời kết nối. Kết nối mở (`connect`) và đóng (`disconnect`) phải được quản lý chặt chẽ để tránh "Zombies Connections" (Kết nối ma - tốn tài nguyên server). |
| `reconnection: true` | **Fault UpdateTolerance**       | Cơ chế tự động khôi phục kết nối (Reconnection Strategy) khi rớt mạng TCP.                                                                                              |

---

## 1. KHỞI TẠO SOCKET (Singleton Pattern)

### 📌 Lines 27-44: Kết nối Server

```javascript
27: const getSocketUrl = () => { ... }
40: const socket = io(getSocketUrl(), { ... });
```

- **Chi tiết:** Đoạn code `const socket = ...` nằm **bên ngoài function App()**.
- **Tại sao? (Key Point):** Đây là kỹ thuật **Singleton**. Nó đảm bảo chỉ có **DUY NHẤT 1 kết nối** được tạo ra khi trang web tải xong. Dù user có chuyển qua chuyển lại giữa các màn hình, Component App có bị vẽ lại (re-render) 100 lần, thì kết nối socket vẫn giữ nguyên, không bị đứt.

---

## 2. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)

### 📌 Lines 51-78: Các biến nhớ

```javascript
51: const [currentView, setCurrentView] = useState('HOME');
54: const [userData, setUserData] = useState({ ... });
62: const [messages, setMessages] = useState([]);
```

- `currentView`: Quyết định đang hiện màn hình nào (HOME, CHAT, JOIN...).
- `userData`: Lưu tên, phòng, pass của user hiện tại.
- `messages`: Mảng chứa tin nhắn. App.jsx giữ mảng này (chứ không phải ChatView) để khi user lỡ điều hướng đi đâu đó, quay lại tin nhắn vẫn còn (trừ khi F5).

---

## 3. LẮNG NGHE SỰ KIỆN (EVENT LISTENERS)

### 📌 `useEffect` (Lines 85-175) - Quan trọng nhất!

```javascript
85: useEffect(() => {
    // 1. Định nghĩa hàm xử lý
    113: socket.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
    });

    // 2. Dọn dẹp (Cleanup)
    161: return () => {
        socket.off('receive_message'); // Hủy lắng nghe
        ...
    };
}, []);
```

- **`setMessages((prev) => ...)`**: Tại sao phải dùng `prev`?
  - Trong Javascript closure, nếu viết `setMessages([...messages, newMsg])` thì nó chỉ nhớ giá trị cũ của `messages` lúc khởi tạo. Dùng `prev` đảm bảo luôn lấy được danh sách tin nhắn mới nhất để nối thêm vào.
- **Cleanup Function (`socket.off`)**:
  - Khi `App` bị hủy (ví dụ tắt tab), hàm này chạy để gỡ bỏ các tai nghe sự kiện, tránh rò rỉ bộ nhớ (Memory Leak).

---

## 4. ĐIỀU HƯỚNG (NAVIGATION & ROUTING)

### 📌 Hàm `renderView()` (Line 315)

```javascript
315: const renderView = () => {
    switch (currentView) {
        case 'HOME': return <HomeView ... />;
        case 'CHAT': return <ChatView ... />;
        ...
    }
};
```

- **Giải thích:** Đây là cách làm **SPA (Single Page Application)** thủ công.
- Thay vì tải lại trang (reload) chuyển sang `chat.html`, ta chỉ đơn giản là thay component `HomeView` bằng `ChatView`. Người dùng thấy mượt mà tức thì.

---

## 5. CÂU HỎI BẢO VỆ DỰA TRÊN FILE NÀY

**Q: Tại sao em để `socket` ở ngoài App component?**

> **A:** Để duy trì kết nối liên tục (Persistent Logic). Nếu em để trong function App, mỗi lần React render lại, nó sẽ tạo ra một connection mới -> Server sẽ tưởng là 1 người mới -> Loạn kết nối.

**Q: SPA là gì? App của em có phải SPA không?**

> **A:** SPA là Single Page Application. App của em chính là SPA vì server chỉ trả về đúng 1 file `index.html` duy nhất. Việc đổi màn hình là do Javascript (React) tự ẩn hiện các thẻ `div` (Component) chứ không tải lại trang.
