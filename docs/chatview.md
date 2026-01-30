# 💬 FILE PHÂN TÍCH: `client/src/views/ChatView.jsx`

> **Vai trò:** Giao diện Chat chính. Hiển thị tin nhắn và gửi file.
> **Mức độ quan trọng:** ⭐⭐⭐ (Giao diện người dùng)

---

## 🎓 GÓC SOI CHIẾU LÝ THUYẾT MẠNG (MAPPING TO NETWORK THEORY)

| Code thực tế      | Lý thuyết Lập Trình Mạng         | Giải thích "Ăn điểm"                                                                                                                                                   |
| :---------------- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Base64 Encoding` | **Presentation Layer (Layer 6)** | Chuyển đổi dữ liệu nhị phân (Binary - Ảnh) thành dạng text (ASCII) để truyền qua giao thức JSON. Đây là nhiệm vụ của tầng Trình Diễn (Presentation) trong mô hình OSI. |
| `DOMPurify`       | **Application Layer Security**   | Chống lại tấn công XSS (Cross-Site Scripting). Trong an toàn mạng, việc lọc dữ liệu đầu vào (Input Sanitization) là bắt buộc.                                          |
| `FileReader`      | **Client-side Processing**       | Xử lý dữ liệu ngay tại rìa mạng (Edge), giảm tải cho Server. Thay vì gửi file thụ động, Client chủ động mã hóa trước.                                                  |
| `message object`  | **PDU (Protocol Data Unit)**     | Cấu trúc gói tin ứng dụng: `{ sender, content, timestamp }`. Đây là định dạng gói tin (Packet Format) do chúng ta tự định nghĩa ở lớp Application.                     |

---

## 1. CODE LOGIC (XỬ LÝ FILE & TIN NHẮN)

### 📌 Xử lý Gửi tin nhắn (Lines 57-84)

```javascript
57: const handleSendMessage = (e) => {
    e.preventDefault(); // Chặn reload trang

    // Ưu tiên gửi file trước
    61: if (previewFile) {
        socket.emit('send_file', { ...fileData: previewFile.data... });
    }

    // Sau đó gửi text
    74: if (messageInput.trim()) {
        socket.emit('send_message', { content: messageInput... });
    }
};
```

- **Logic:** Tách biệt luồng gửi File và gửi Text.

### 📌 Xử lý Đọc file ảnh (Lines 102-124)

```javascript
110: const reader = new FileReader();
111: reader.onload = (event) => {
    const dataUrl = event.target.result; // Chuỗi Base64
    setPreviewFile({ data: dataUrl ... });
};
123: reader.readAsDataURL(file);
```

- **FileReader:** API của trình duyệt giúp đọc nội dung file từ máy tính người dùng mà không cần gửi lên server ngay.
- **Base64:** Biến `dataUrl` chứa chuỗi ký tự đại diện cho bức ảnh. Chuỗi này có thể dùng làm `src` cho thẻ `<img>` để hiện ảnh preview ngay lập tức.

### 📌 Xử lý Paste từ Clipboard (Lines 139-151)

```javascript
139: const handlePaste = (e) => {
    140: const items = e.clipboardData?.items;
    144: if (item.type.indexOf('image') !== -1) { // Nếu nhìn thấy ảnh
        const file = item.getAsFile();
        processFile(file); // Xử lý như file upload bình thường
    }
}
```

- **Trải nghiệm người dùng (UX):** Giúp người dùng chụp màn hình rồi Ctrl+V dán thẳng vào chat, không cần lưu file rồi chọn upload lằng nhằng.

---

## 2. CODE GIAO DIỆN (RENDER JSX)

### 📌 Tự động cuộn xuống dưới (Autoscroll - Lines 52-54)

```javascript
47: const messagesEndRef = useRef(null);
52: useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

- **Cơ chế:** Mỗi khi danh sách `messages` thay đổi (có tin mới), trình duyệt sẽ tìm cái thẻ `div` vô hình (nằm ở đáy danh sách) và cuộn màn hình tới đó.

### 📌 Hiển thị Tin nhắn An toàn (Line 240)

```javascript
240: dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
```

- **Vấn đề:** Muốn tin nhắn có thể **in đậm**, _in nghiêng_ (render HTML).
- **Nguy hiểm:** Hacker có thể gửi `<script>alert('Hack')</script>`. Nếu render thẳng thừng, script sẽ chạy -> Mất an toàn.
- **Giải pháp `DOMPurify`:** Nó là cái "máy lọc nước". Nó quét qua đoạn HTML, giữ lại thẻ `<b>`, `<i>` nhưng vứt bỏ thẻ `<script>`, `<iframe>` độc hại trước khi in ra màn hình.

---

## 3. CÂU HỎI BẢO VỆ DỰA TRÊN FILE NÀY

**Q: Base64 là gì? Tại sao em dùng nó để gửi ảnh?**

> **A:** Base64 là cách biến đổi file nhị phân (Binary) thành chuỗi ký tự ASCII (String). Em dùng nó vì JSON (Giao thức trao đổi dữ liệu của Socket.IO) chỉ hiểu text. Nhược điểm là dung lượng tăng khoảng 33%, nhưng ưu điểm là dễ xử lý đồng bộ với tin nhắn text.

**Q: Làm sao em ngăn chặn việc người dùng gửi tin nhắn mã độc (XSS)?**

> **A:** Code của em sử dụng thư viện `DOMPurify` ở dòng 240. Mọi tin nhắn trước khi hiển thị lên màn hình đều được đi qua màng lọc này để loại bỏ các thẻ script độc hại.
