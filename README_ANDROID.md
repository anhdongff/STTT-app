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

Mỗi khi bạn thay đổi mã nguồn React (như sửa file `api.ts`), bạn **BẮT BUỘC** phải thực hiện các bước sau để cập nhật ứng dụng trên Android:

1. **Build ứng dụng web:**
   ```bash
   npm run build
   ```

2. **Đồng bộ mã nguồn mới vào thư mục Android:**
   ```bash
   npx cap sync android
   ```

3. **Chạy lại ứng dụng từ Android Studio:**
   - Mở Android Studio.
   - Bấm nút **Stop** (nếu đang chạy).
   - Bấm nút **Run** (hình tam giác xanh) để cài đặt bản build mới nhất lên điện thoại.

**Lưu ý:** Nếu bạn không chạy `npx cap sync`, ứng dụng trên điện thoại sẽ vẫn chạy phiên bản cũ và có thể vẫn gọi API tới `localhost:8111`.

## 4. Cấu hình API Port & Kết nối (Quan trọng)

Mặc định, ứng dụng trên Android sẽ tự động nhận diện nếu đang chạy trong môi trường Native và sử dụng IP cứng trong `src/lib/api.ts`.

### Cách A: Sử dụng IP máy tính (Khuyên dùng cho thiết bị thật)
1. Đảm bảo điện thoại và máy tính cùng kết nối một mạng Wi-Fi.
2. Tìm địa chỉ IP nội bộ của máy tính (VD: `192.168.1.15`).
3. Mở file `src/lib/api.ts` và sửa dòng `const androidIp = 'http://192.168.0.100:8111';` thành IP của bạn.
4. Thực hiện lại **Quy trình xây dựng** ở mục 3.

### Cách B: Port Forwarding (Dùng cáp USB)
Nếu bạn kết nối thiết bị thật qua USB và muốn dùng `localhost:8111`, hãy chạy lệnh sau trên máy tính:
```bash
adb reverse tcp:8111 tcp:8111
```
Sau khi chạy lệnh này, ứng dụng trên Android có thể gọi tới `http://localhost:8111` và nó sẽ tự động trỏ về backend trên máy tính của bạn. Trong trường hợp này, bạn cần sửa `src/lib/api.ts` để nó trả về `http://localhost:8111` ngay cả trên Android.

## 5. Kiểm tra lỗi (Debug)
Nếu ứng dụng vẫn không kết nối được:
1. Kiểm tra xem backend (port 8111) trên máy tính đã chạy chưa.
2. Kiểm tra xem máy tính có chặn tường lửa (Firewall) không.
3. Trong Android Studio, mở tab **Logcat** và lọc từ khóa `Capacitor` hoặc `BASE_URL` để xem ứng dụng đang thực sự gọi tới địa chỉ nào.

## 6. Chạy ứng dụng

Trong Android Studio:
1. Đợi Gradle đồng bộ xong.
2. Chọn thiết bị (máy ảo hoặc máy thật).
3. Bấm nút **Run** (hình tam giác xanh).

---
**Lưu ý:** Nếu bạn gặp lỗi về `Cleartext Traffic` (không cho phép gọi http), bạn cần cấu hình `networkSecurityConfig` trong AndroidManifest.xml hoặc sử dụng **https** cho backend.
