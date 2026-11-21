# DACS4

Đọc [Phân tích và thiết kế hệ thống](docs/phan-tich-thiet-ke-he-thong.md) trước khi triển khai nghiệp vụ. Tài liệu đã tích hợp các quyết định của chủ đồ án về giải trình cảnh báo, quyền tạm ngưng luật và y lệnh thuốc đồng thời.

Đọc [README](README.md) để chạy môi trường. Mọi dữ liệu bệnh nhân dùng trong đồ án là dữ liệu mô phỏng. Kiểm tra bằng `npm run build` sau khi sửa TypeScript.

## Giao diện desktop

Electron dùng một giao diện React trong `client/src`. Bổ sung chức năng và kết nối API ngay trong giao diện này. Các vai trò đăng nhập cùng ứng dụng. Chế độ phát triển và `npm start` dùng chung điểm vào `client/src/main.tsx`.

## Kiến trúc mã nguồn

Đọc [Kiến trúc dự án](docs/kien-truc.md) trước khi thêm tính năng. Đặt UI và lời gọi HTTP theo tính năng trong client. Đặt route, nghiệp vụ và truy cập dữ liệu theo module trong `server/src/modules/`. Mỗi module chỉ công khai phần mà module khác cần dùng.
