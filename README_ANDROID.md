# Hướng dẫn triển khai STTT lên Android

Tài liệu này hướng dẫn bạn cách đóng gói và chạy ứng dụng Speech-to-Text Translation (STTT) trên thiết bị Android hoặc máy ảo Android.

## 1. Yêu cầu hệ thống
- **Node.js & npm**: Đã cài đặt.
- **Android Studio**: Đã cài đặt và cấu hình Android SDK.
- **Java Development Kit (JDK)**: Phiên bản 17 trở lên.

## 2. Cấu hình Capacitor
Ứng dụng đã được tích hợp **Capacitor** để chuyển đổi từ Web sang Native Android.

Các file quan trọng:
- `capacitor.config.ts`: Cấu hình chính của Capacitor.
- `android/`: Thư mục chứa mã nguồn Android native.

## 3. Quy trình xây dựng (Build)

Mỗi khi bạn thay đổi mã nguồn React, bạn cần thực hiện các bước sau:

1. **Build ứng dụng web:**
   ```bash
   INLINE_RUNTIME_CHUNK=false GENERATE_SOURCEMAP=false npm run build
   ```

2. **Đồng bộ với thư mục Android:**
   ```bash
   npx cap sync
   ```

3. **Mở dự án trong Android Studio:**
   ```bash
   npx cap open android
   ```

## 4. Cấu hình API Port & Kết nối (Quan trọng)

Mặc định, ứng dụng kết nối tới `http://localhost:8111`. Tuy nhiên, trên Android, `localhost` trỏ về chính thiết bị Android chứ không phải máy tính chạy backend của bạn.

### Cách A: Sử dụng máy ảo Android (Emulator)
Nếu bạn chạy backend trên máy tính và dùng máy ảo, hãy đổi URL API thành:
`http://10.0.2.2:8111`

### Cách B: Sử dụng thiết bị thật
1. Đảm bảo điện thoại và máy tính cùng kết nối một mạng Wi-Fi.
2. Tìm địa chỉ IP nội bộ của máy tính (VD: `192.168.1.15`).
3. Đổi URL API thành: `http://192.168.1.15:8111`.

### Cách C: Port Forwarding (Dùng cáp USB)
Nếu bạn kết nối thiết bị thật qua USB, bạn có thể dùng lệnh sau để chuyển tiếp port:
```bash
adb reverse tcp:8111 tcp:8111
```
Sau khi chạy lệnh này, ứng dụng trên Android có thể gọi tới `http://localhost:8111` và nó sẽ tự động trỏ về backend trên máy tính của bạn.

## 5. Cách thay đổi URL API vĩnh viễn cho Android

Bạn nên tạo file `.env.production` hoặc sửa trực tiếp trong `src/lib/api.ts`:

```typescript
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.0.2.2:8111'; 
```

## 6. Chạy ứng dụng

Trong Android Studio:
1. Đợi Gradle đồng bộ xong.
2. Chọn thiết bị (máy ảo hoặc máy thật).
3. Bấm nút **Run** (hình tam giác xanh).

---
**Lưu ý:** Nếu bạn gặp lỗi về `Cleartext Traffic` (không cho phép gọi http), bạn cần cấu hình `networkSecurityConfig` trong AndroidManifest.xml hoặc sử dụng **https** cho backend.
