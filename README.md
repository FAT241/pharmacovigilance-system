# DACS4

Ứng dụng desktop hỗ trợ kê đơn và cảnh giác dược cho bác sĩ điều trị nội trú. Xem [phân tích và thiết kế hệ thống](docs/phan-tich-thiet-ke-he-thong.md) và [kiến trúc dự án](docs/kien-truc.md).

## Chạy trên Windows

Trên máy đã cài đặt, mở PowerShell tại `D:\DACS4` và chạy `npm start`. Lệnh mở cửa sổ Electron và khởi động API nếu cần. Đóng cửa sổ sẽ dừng API do lệnh này mở. Sau khi sửa giao diện, chạy `npm run build` rồi mở lại.

Nếu dùng một cụm PostgreSQL cục bộ riêng trên Windows, có thể đặt `DACS4_PG_CTL` (đường dẫn đến pg_ctl.exe) và `DACS4_PG_DATA` (thư mục dữ liệu cụm đã khởi tạo) trong `.env`. Khi có hai giá trị này, `npm start` cũng có thể khởi động cụm theo cổng trong `DATABASE_URL`.

### Cài lần đầu

Dùng Node.js 22.12+ và PostgreSQL. Nếu đã có PostgreSQL, trỏ `DATABASE_URL` trong `.env` đến cơ sở dữ liệu riêng của DACS4. Docker Compose là một cách khởi động PostgreSQL khi cổng cấu hình còn trống.

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Trong `.env`, đặt `DACS4_JWT_SECRET` thành chuỗi ngẫu nhiên ít nhất 32 ký tự và đặt `DACS4_INITIAL_ADMIN_PASSWORD` từ 8 ký tự, tối đa 72 byte. Nếu dùng Docker, chạy `npm run db:up`.

```powershell
npm run db:migrate
npm run db:generate
npm run db:seed
npm run build
npm start
```

Đăng nhập tài khoản `admin` bằng giá trị `DACS4_INITIAL_ADMIN_PASSWORD` đã dùng lúc chạy seed lần đầu. Chạy lại seed giữ mật khẩu của tài khoản hiện có. Tạo bác sĩ trong mục **Tài khoản**, rồi đăng nhập bác sĩ để tạo hồ sơ và cấp mã bệnh nhân. Khi phát triển, chạy `npm run dev` trong terminal thứ nhất và `npm run desktop` trong terminal thứ hai để cập nhật giao diện khi sửa mã.

Electron luôn dùng giao diện trong `client/src`. Khi chạy `npm start`, Electron tải các tệp do Vite biên dịch vào `client/dist`. Khi phát triển, Electron tải cùng mã giao diện từ Vite để cập nhật ngay khi lưu tệp.

## Soạn giải thích cho người bệnh

Trên máy Windows mới, chạy `npm run ai:install` trên máy chạy API để cài llama.cpp và mô hình Qwen2.5-0.5B-Instruct vào thư mục dữ liệu người dùng. Script đối chiếu SHA-256 trước khi sử dụng tệp tải về. Mặc định API chạy mô hình trên chính máy đó. Nếu đơn vị chọn dịch vụ AI qua mạng, đặt `DACS4_AI_HTTPS_ENDPOINT` thành URL chat completions, `DACS4_AI_MODEL` thành tên mô hình và `DACS4_AI_KEY` thành khóa dịch vụ trong cấu hình máy chủ. Chỉ dữ liệu y lệnh và trích đoạn tài liệu thuốc được dùng để soạn.

Quản trị viên nhập nguồn và trích đoạn đã kiểm tra trong **Danh mục thuốc**. Sau khi bác sĩ xác nhận y lệnh, mở **Giải thích cho bệnh nhân**, soạn bằng AI, đối chiếu nguồn, chỉnh sửa rồi lưu nháp hoặc duyệt. Bệnh nhân đọc nội dung đã duyệt trong **Điều trị của tôi**. Khi bác sĩ ngừng hoặc thay thế y lệnh, giải thích của dòng cũ đi cùng lịch sử thuốc.

## Sử dụng ứng dụng

Ứng dụng lưu tài khoản, hồ sơ hành chính và danh mục thuốc vào PostgreSQL. Quản trị viên quản lý tài khoản, trạng thái thuốc và thành phần hoạt chất. Bác sĩ tạo và sửa hồ sơ hành chính. Bệnh nhân tra cứu hồ sơ của mình bằng mã được cấp.

Trong Electron, bác sĩ vào **Hồ sơ bệnh nhân**, tìm theo tên, mã hoặc CCCD rồi chọn **Đợt điều trị**. Bác sĩ có thể ghi lý do vào viện và mở đợt. Máy chủ ghi thời điểm và bác sĩ tiếp nhận. Một bệnh nhân chỉ có một đợt mở tại một thời điểm. Bác sĩ tiếp nhận xác nhận **Xuất viện** để đóng đợt. Lịch sử được lưu trong PostgreSQL và vẫn xem được khi tái nhập viện.

Chọn **Hồ sơ lâm sàng** trên một đợt để cập nhật chẩn đoán thí điểm, tiền sử dị ứng và cân nặng. Cân nặng được ghi bằng kg tại thời điểm lưu. Đợt mới kế thừa tiền sử dị ứng gần nhất và đưa các thuốc tại nhà còn dùng về trạng thái chờ đối chiếu. Trong **Đối chiếu thuốc**, bác sĩ chọn ngừng hoặc tiếp tục với liều và số lần mỗi ngày. Tiếp tục tạo dòng y lệnh nháp trong tab **Y lệnh**.

Trong **Y lệnh**, chọn **Kê thuốc mới** hoặc dùng bản nháp từ đối chiếu. Lịch dùng cố định tính theo số viên hoặc mL mỗi lần và số lần mỗi ngày. Bấm **Kiểm tra y lệnh** lần đầu. Lưu thay đổi trên một y lệnh nháp sẽ tự chạy và lưu kết quả kiểm tra mới. Khi dữ liệu đối chiếu thay đổi, máy chủ đánh giá lại các y lệnh nháp đã kiểm tra. Bác sĩ xem kết quả mới, sửa y lệnh hoặc nhập lý do để tiếp tục khi có cảnh báo hay thiếu dữ liệu. Nếu mất phản hồi lúc xác nhận, gửi lại cùng nội dung trong cùng phiên sẽ dùng lại khóa xác nhận và trả kết quả đã lưu. Lỗi kiểm tra chặn xác nhận. Khi thay thế một dòng, dòng cũ kết thúc lúc dòng mới được xác nhận. Xuất viện kết thúc các dòng còn hiệu lực. Lịch sử từng dòng lưu kết quả từng luật và giải trình trong PostgreSQL.

Bộ luật dùng cho hồ sơ mô phỏng của đồ án. Các ví dụ tương tác, tổng liều theo cân nặng và nhóm thuốc dùng mã hoạt chất `DEMO_A`, `DEMO_B` và nhóm `DEMO_GROUP`. Quản trị viên gán nhóm và tác nhân dị ứng trong **Danh mục thuốc**. Sau khi cập nhật mã nguồn trên cơ sở dữ liệu cũ, chạy `npm run db:migrate`, `npm run db:generate` và `npm run build` trước khi mở lại Electron.

Trong **Hồ sơ lâm sàng → Đánh giá và lịch sử**, bác sĩ phụ trách có thể chọn mốc đánh giá và chạy lại bộ luật trên tất cả y lệnh đang hiệu lực. Mỗi lần đánh giá lưu dữ liệu thuốc và kết quả từng luật tại thời điểm chạy. Tại đây bác sĩ cũng có thể lọc lịch sử theo kết quả, mở căn cứ và xem lý do tiếp tục kê. Lịch sử vẫn truy cập được sau khi xuất viện.

Trong **Luật cảnh báo**, quản trị viên chọn **Tạm ngưng** hoặc **Kích hoạt lại**, nhập lý do và xác nhận. Trạng thái và nhật ký được lưu trong cùng giao dịch. Phiên bác sĩ đang kết nối nhận thông báo qua Socket.IO. Máy chủ đối chiếu lại bộ luật trước khi xác nhận y lệnh, kể cả khi kết nối thông báo bị gián đoạn.

Để giám sát, quản trị viên mở **Hồ sơ bệnh nhân → Đợt điều trị → Hồ sơ lâm sàng**, xem y lệnh và lọc lịch sử kiểm tra. Quyền giám sát chỉ cho phép đọc hồ sơ điều trị.

Thanh bên hiển thị chức năng theo vai trò và có thể thu gọn. Trong **Hồ sơ bệnh nhân**, dùng bộ lọc ở cột **Trạng thái điều trị**. Mở **Tổng quan** trong hồ sơ lâm sàng để ghi diễn biến, xem chỉ số gần nhất và kết quả kiểm tra. Mục **Y lệnh** đặt ngữ cảnh người bệnh, phần soạn thuốc và căn cứ xác nhận cạnh nhau. Khi xuất viện, bác sĩ xem lại danh sách y lệnh sẽ kết thúc, nhập tình trạng và lời dặn tái khám. Bệnh nhân đọc các thông tin này trong đợt tương ứng.

Trong **Tài khoản**, quản trị viên có thể cấp mã cho bệnh nhân, sửa tên, tạo tài khoản bác sĩ, lọc vai trò và khóa hoặc mở lại tài khoản. Mã cấp cho bệnh nhân dùng để đăng nhập vào mục **Bệnh nhân**.

API kiểm tra hoạt động tại `/api/health`. `npm run build` kiểm tra TypeScript và build giao diện.
