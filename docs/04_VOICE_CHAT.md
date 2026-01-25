# 🎙️ FILE PHÂN TÍCH: `client/src/views/VoiceChat.jsx`

> **Vai trò:** Module gọi thoại (Voice Chat Component). Tách biệt hoàn toàn với logic chat text.
> **Mức độ quan trọng:** ⭐⭐⭐⭐⭐ (Tính năng nâng cao "ăn tiền")

---

## 🎓 GÓC SOI CHIẾU LÝ THUYẾT MẠNG (MAPPING TO NETWORK THEORY)

| Code thực tế       | Lý thuyết Lập Trình Mạng         | Giải thích "Ăn điểm"                                                                                                                                                                             |
| :----------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LiveKit (WebRTC)` | **UDP (User Datagram Protocol)** | Voice Chat dùng UDP thay vì TCP. Tại sao? Vì UDP nhanh, trễ thấp. Mất vài gói tin (Packet Loss) -> Tiếng hơi rè chút nhưng vẫn nghe được. TCP mà mất gói -> Chờ gửi lại -> Tiếng bị khựng (Lag). |
| `SFU Topology`     | **Network Topology**             | Thay vì mô hình Mesh (P2P thuần - mọi người nối nhau), ta dùng mô hình hình sao (Star Topology) qua Server trung gian. Giảm băng thông Upload cho Client.                                        |
| `ICE Candidates`   | **NAT Traversal**                | Kỹ thuật vượt tường lửa (Firewall) và NAT bằng giao thức STUN/TURN. Giúp 2 máy tính nằm trong 2 mạng LAN khác nhau tìm thấy nhau.                                                                |
| `JWT Token`        | **Authentication Protocol**      | Cơ chế xác thực phi trạng thái (Stateless Auth). Server cấp "vé" có chữ ký điện tử. LiveKit Server tin tưởng vé đó mà không cần tra Database.                                                    |

---

## 1. TỔNG QUAN

File này sử dụng thư viện `@livekit/components-react`. Thay vì tự viết WebRTC từ đầu (rất khó và dễ lỗi), ta dùng SDK của LiveKit để họ lo phần khó (Peer Connection, ICE Candidates).

---

## 2. QUY TRÌNH KẾT NỐI (CONNECTION FLOW)

### 📌 Lấy Token (Lines 82-99)

```javascript
86: const getToken = async () => {
    // Gọi API của server mình viết
    89: const resp = await fetch(`${apiBase}/api/get-token?...`);
    90: const data = await resp.json();
    91: setToken(data.token);
};
```

- **Tại sao cần Token?** LiveKit là dịch vụ bảo mật. Không phải ai muốn vào phòng nào cũng được. Token này giống như "Vé vào cửa" do Server cấp (đã ký tên đóng dấu).

### 📌 Component Chính (Lines 117-133)

```javascript
117: <LiveKitRoom
        token={token}
        serverUrl={SERVER_URL}
        data-lk-theme="default"
     >
        130: <RoomAudioRenderer />
        132: <VoiceControls />
     </LiveKitRoom>
```

- `<LiveKitRoom>`: Component bao bọc (Wrapper). Nó tự động kết nối WebSocket tới LiveKit Server ngay khi có `token`.
- `<RoomAudioRenderer />`: **CỰC KỲ QUAN TRỌNG**. Component này không có giao diện (vô hình), nhưng nhiệm vụ của nó là tạo ra thẻ `<audio>` HTML để phát ra tiếng của người khác. Nếu quên dòng này -> Vào phòng thấy nhau nhưng không nghe thấy gì.

---

## 3. GIAO DIỆN ĐIỀU KHIỂN (VOICE CONTROLS)

### 📌 Lines 35-77: Nút Mute/Unmute

```javascript
40: await localParticipant.setMicrophoneEnabled(!newState);
```

- Đây hàm của SDK để bật/tắt mic phần cứng.

---

## 4. CÂU HỎI BẢO VỆ DỰA TRÊN FILE NÀY

**Q: LiveKit là gì? Tại sao không dùng PeerJS (P2P) như cũ?**

> **A:** Dạ, LiveKit sử dụng mô hình SFU (Selective Forwarding Unit).
>
> - **P2P cũ (PeerJS):** Máy em phải gửi dữ liệu cho 9 người khác -> Mạng lag, nóng máy.
> - **SFU (LiveKit):** Máy em chỉ gửi 1 luồng lên Server -> Server nhân bản gửi cho 9 người kia. Giúp ổn định hơn khi họp nhóm đông người.

**Q: Token này sống bao lâu?**

> **A:** Token này là JWT (Json Web Token), có thời hạn (TTL) do server quy định lúc tạo (thường là vài giờ). Hết hạn thì User phải xin cấp lại, nhưng trong thời gian gọi thì kết nối vẫn duy trì.
