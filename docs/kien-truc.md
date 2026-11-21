# Kiến trúc DACS4

Dự án dùng npm workspaces và một lockfile. Client và server có package, lệnh chạy và cấu hình TypeScript riêng.

```text
client/
  desktop/                 Tiến trình chính Electron, preload khi cần
  src/
    main.tsx               Điểm vào React
    features/             UI và lời gọi API theo tính năng, tạo khi triển khai
    shared/               Thành phần thật sự dùng chung, tạo khi có nhu cầu
server/
  src/
    index.ts              Khởi động HTTP và Socket.IO
    app.ts                Cấu hình Express và đăng ký router
    modules/
      health/             Route kiểm tra API hiện có
  prisma/                 Schema và migration
docs/                     Phân tích thiết kế và quy ước
```

## Chia theo nghiệp vụ

| Phạm vi | Module dự kiến |
|---|---|
| Tài khoản và phân quyền | auth, accounts |
| Bệnh nhân và hồ sơ nội trú | patients, encounters |
| Danh mục thuốc và kê đơn | medications, prescriptions |
| Kiểm tra cảnh báo và quản lý luật | drug-safety |
| Soạn và duyệt nội dung giải thích | explanations |

Đây là tên dự kiến. Tạo thư mục khi bắt đầu tính năng. Nhóm các thao tác trên cùng hồ sơ hoặc đơn thuốc theo trách nhiệm. Khi một module lớn dần, chia theo nhóm thao tác có tên nghiệp vụ rõ ràng.

## Client

Đặt trang, component, hook và lời gọi HTTP của tính năng ở `client/src/features/<feature>/`. Khi có nhiều file cùng loại, gom vào `pages/`, `components/`, `hooks/` hoặc `api/` bên trong tính năng. Component phụ thuộc dữ liệu của một tính năng nằm cạnh tính năng đó. Chuyển thành phần vào `shared/` khi thực sự có nhiều tính năng dùng chung.

## Server

Đặt endpoint trong `server/src/modules/<module>/`. Route kiểm tra đầu vào, gọi nghiệp vụ và trả HTTP. Service xử lý nghiệp vụ và quyết định giao dịch. Tách truy vấn Prisma khi truy vấn đủ phức tạp hoặc có nhiều thao tác cùng dùng. Với route đơn giản như health, một file route là đủ. Khi có nhiều use case, có thể chia module thành các nhóm như `confirm/` và `history/`.

Điểm vào ứng dụng ghép router. Module khác gọi qua hàm hoặc kiểu dữ liệu được công khai của module. Thêm `index.ts` khi cần công khai giao diện module, tránh import sâu sang file nội bộ và phụ thuộc vòng. Client gọi REST hoặc Socket.IO, còn truy vấn PostgreSQL đi qua API. Khi thay đổi dữ liệu trả về, cập nhật và kiểm tra cả phía gọi tương ứng.

## Quy ước tách file

Một file nên có một trách nhiệm chính và tên mô tả được trách nhiệm đó. Tách khi file chứa nhiều luồng nghiệp vụ độc lập hoặc khó rà soát trong một lần đọc. Khi thư mục bắt đầu khó quét, gom theo tính năng con hoặc theo trách nhiệm. Dùng các dấu hiệu đó để quyết định tách, tránh tạo các lớp hoặc thư mục chỉ chứa file chuyển tiếp.

## Tham khảo

- [Microsoft Rayfin React Clean Architecture](https://github.com/microsoft/rayfin/blob/main/.github/skills/react-clean-architecture/SKILL.md) về đặt UI và logic gần tính năng, giữ ranh giới import.
- [Vercel Composition Patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) về cách chia và kết hợp component React.
