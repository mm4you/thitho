# 🏆 ĐƯỜNG LÊN ĐỈNH TRI THỨC - HỆ THỐNG GAMESHOW ĐẤU TRÍ TRỰC TIẾP

Hệ thống Web thi đấu 4 người chơi theo format Gameshow Đấu Trí (như Đường lên đỉnh Olympia), hỗ trợ đồng bộ thời gian thực siêu tốc, bảng điều khiển MC/Giám khảo và màn hình sân khấu.

---

## ✨ Tính năng nổi bật

1. **📺 Màn hình Trình chiếu Sân khấu (`/display`)**:
   - Đồng hồ đếm ngược với âm thanh tích tắc kịch tính.
   - Thẻ lật mở đáp án (Flip card) của 4 thí sinh kèm thời gian nộp (chính xác đến mili-giây).
   - Tự động đổi màu Xanh (Đúng, +điểm) / Đỏ (Sai, -điểm) và nổ điểm số.
   - Hiệu ứng pháo hoa, âm thanh chuông, chiến thắng (Web Audio API tích hợp sẵn).

2. **🎛️ Bảng điều khiển MC / Giám khảo (`/admin/live`)**:
   - Bắt đầu đếm ngược, tạm dừng, khóa máy.
   - Giám sát trực tiếp đáp án thí sinh đang gõ/chọn trước khi hết giờ.
   - Lật mở đáp án lên màn hình chính.
   - Chấm điểm tự động (so sánh đáp án) hoặc chấm thủ công bằng tay (tick Đúng/Sai).
   - Cộng / trừ điểm linh hoạt cho từng thí sinh.
   - Quản lý và reset chuông giành quyền trả lời.

3. **📱 4 Máy Thí sinh (`/player/1`, `/player/2`, `/player/3`, `/player/4`)**:
   - Thích ứng mọi thiết bị (Điện thoại, Tablet, Laptop).
   - Chế độ **Trắc nghiệm** (A, B, C, D to rõ).
   - Chế độ **Tăng tốc / Tự luận** (Gõ text nhanh + Enter để gửi).
   - Chế độ **Bấm chuông** (Nút Buzzer khổng lồ, hỗ trợ rung haptic).

4. **⚡ Công nghệ sử dụng**:
   - **Next.js 14 (App Router)**, **Tailwind CSS**, **Framer Motion**, **Canvas Confetti**.
   - **Supabase Realtime Broadcast** (kết hợp Local Bus) cho độ trễ < 50ms.
   - **Web Audio Synthesizer** (tạo âm thanh gameshow chân thực không lo lỗi file).

---

## 🚀 Hướng dẫn Cài đặt & Chạy Dự án

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Chạy môi trường phát triển:
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### 3. Cài đặt Cơ sở Dữ liệu Supabase (Tùy chọn):
Nếu muốn lưu dữ liệu lên Supabase:
1. Đăng nhập Supabase Dashboard.
2. Vào **SQL Editor**.
3. Mở file `supabase/schema.sql` trong dự án này, copy toàn bộ nội dung và bấm **Run**.

---

## 🎯 Điều hướng nhanh các màn hình:
- **Trang chủ / Sảnh chọn**: `http://localhost:3000`
- **Màn hình Máy chiếu Sân khấu**: `http://localhost:3000/display`
- **Bảng điều khiển MC**: `http://localhost:3000/admin/live`
- **Cấu hình Đề thi & Thí sinh**: `http://localhost:3000/admin`
- **Máy Thí sinh 1 -> 4**: `http://localhost:3000/player/1` (đến `/player/4`)
