<div align="center">

# 🎓 StudyNote (Fullstack Version)

### Ứng dụng quản lý học tập cá nhân toàn diện dành cho sinh viên

*Ghi chú theo môn · Theo dõi deadline · Checklist hằng ngày · Hệ thống Gamification · Tính điểm GPA*

<br />

![.NET](https://img.shields.io/badge/.NET_10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
<br />
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)

<br />

**[🌍 Trải nghiệm thực tế tại: huyz4nny.xyz](http://huyz4nny.xyz)**

</div>

---

## 📖 Giới thiệu dự án

**StudyNote** là một ứng dụng Web Fullstack được thiết kế để giúp sinh viên tổ chức việc học trực quan, tối ưu và tràn đầy động lực. Khác biệt với các ứng dụng To-do list thông thường, StudyNote tập trung mạnh vào **Gamification** (Tạo động lực bằng hệ thống Streak), **Đặc thù sinh viên** (Quản lý môn học, tín chỉ, tính điểm GPA) và trải nghiệm người dùng cực kỳ mượt mà.

Ở phiên bản mới nhất, hệ thống đã được nâng cấp hoàn chỉnh từ LocalStorage lên **Backend API chuyên nghiệp**, cho phép dữ liệu được đồng bộ liên tục, xác thực bảo mật qua JWT và lưu trữ an toàn trên Database thực tế.

---

## 🏗️ Kiến trúc Hệ thống & Ngăn xếp Công nghệ (Tech Stack)

Dự án áp dụng mô hình kiến trúc **Monolithic** nhúng Frontend vào Backend trong quá trình triển khai (Publish) để tối ưu hóa tài nguyên server (chạy chung trên 1 Host).

### 🖥️ Backend (API Server)
- **Framework:** .NET 10 (ASP.NET Core Web API).
- **Cơ sở dữ liệu:** SQLite thông qua **Entity Framework Core** (Code-First Migration).
- **Bảo mật & Xác thực:** JWT (JSON Web Tokens) kết hợp với **ASP.NET Core Identity** để mã hóa mật khẩu và quản lý phiên đăng nhập.
- **Tài liệu API:** Tích hợp sẵn Swagger UI (`/swagger`).

### 🎨 Frontend (Client-side)
- **Công nghệ lõi:** HTML5, CSS3, JavaScript ES6+ (Vanilla JS).
- **Tương tác API:** Custom Fetch Wrapper (`api.js`) xử lý tự động đính kèm Token và Refresh/Logout khi hết hạn.
- **Giao diện:** Responsive Design, Micro-interactions (Hiệu ứng hover, transition), không phụ thuộc vào Framework nặng nề.

### 🚀 Hạ tầng & CI/CD
- **Tên miền (Domain):** Được cung cấp bởi **Nhân Hòa**.
- **Quản lý DNS & Bảo mật mạng:** **Cloudflare** (SSL/TLS, Proxy, DDoS Protection).
- **Hosting / Máy chủ:** **SmarterASP.NET**.
- **CI/CD (Continuous Deployment):** Tự động hóa qua hệ thống kéo mã nguồn từ GitHub của SmarterASP.NET.

---

## ✨ Tính năng cốt lõi

| Module | Chi tiết tính năng |
|--------|--------------------|
| 🔐 **Identity & Security** | Đăng ký & Đăng nhập thông qua API. Hệ thống bảo vệ Route, phân quyền người dùng riêng biệt nhờ JWT. |
| 📚 **Quản lý Môn học** | Lưu trữ thông tin chi tiết: Tên môn, Mã môn, Giảng viên, Số tín chỉ, Phân loại theo Học kỳ và màu sắc nhận diện. |
| 📝 **Smart Notes** | Hệ thống ghi chú thông minh gắn liền với môn học. Hỗ trợ phân loại qua tag (*lưu ý / lý thuyết / đề cương*), ghim nội dung lên đầu. |
| 📋 **Deadline Tracker** | Theo dõi bài tập theo mức độ ưu tiên (Thấp → Khẩn cấp). Huy hiệu cảnh báo tự động trạng thái (Chưa làm, Đang làm, Hoàn thành). |
| ✅ **Checklist Hôm nay** | Bảng công việc mỗi ngày đồng bộ Server. Nút copy thông minh: Tự động sao chép các task chưa hoàn thành của ngày hôm qua sang hôm nay. |
| 🔥 **Streak Engine** | **Gamification:** Hệ thống tính điểm chuỗi ngày học liên tục với hiệu ứng pháo hoa nhằm duy trì thói quen học tập mỗi ngày. |
| 🎯 **Bộ máy GPA** | Tính điểm GPA tự động theo chuẩn đại học (FPT) thông qua tính toán trọng số các cột điểm thành phần. |

---

## 🛠️ Hướng dẫn Triển khai Lên Internet (Deploy to Production)

Quá trình đưa StudyNote lên Internet được tự động hóa tối đa bằng tính năng GitHub Deployment.

### Bước 1: Cấu hình DNS trên Cloudflare
1. Đăng ký tên miền (VD: `huyz4nny.xyz`) tại Nhân Hòa và trỏ **Nameserver** về Cloudflare.
2. Tại Cloudflare, vào mục **DNS > Records**:
   - Thêm bản ghi `A`, Name là `@`, IP là **IP của Hosting SmarterASP.NET**.
   - Bật đám mây màu cam (Proxied) để nhận SSL miễn phí.

### Bước 2: Chuẩn bị Hosting SmarterASP.NET
1. Vào mục Websites trong Control Panel của SmarterASP.NET.
2. Mở cấu hình Domain Bindings (Pointers) và thêm tên miền `huyz4nny.xyz` vào.
3. Chắc chắn rằng tùy chọn **"Security Lock"** đã được tắt để mở public truy cập.

### Bước 3: Thiết lập CI/CD (GitHub Auto Deploy)
SmarterASP.NET có khả năng tự động đọc file `.csproj` và tiến hành biên dịch (build) dự án .NET.

1. Tại Control Panel của trang web, chọn tính năng **Deploy from GitHub**.
2. Kết nối với repo `vcStudyNote` nhánh `main`.
3. Bấm **Deploy**. Lúc này, kịch bản triển khai phía sau sẽ diễn ra như sau:
   - Hệ thống tải source code về.
   - Quét thấy thư mục `StudyNote.API/` có chứa project `.NET 10`.
   - MSBuild chạy lệnh `dotnet publish`.
   - **Đặc biệt:** Trong file `StudyNote.API.csproj`, đã có cấu hình tự động gom (copy) toàn bộ thư mục `studynote-web/` (Frontend) vào chung thư mục `wwwroot/` của bản Build.
   - ASP.NET Core sẽ khởi động, mở API tại `huyz4nny.xyz/api/...` và phục vụ giao diện Web ngay tại trang gốc `huyz4nny.xyz/`. Swagger được chuyển sang `huyz4nny.xyz/swagger`.

> 💡 **Kết quả:** Mọi thay đổi bạn Push lên GitHub nhánh Main, chỉ cần vào Hosting bấm Deploy lại là hệ thống tự động cập nhật cả Frontend lẫn Backend!

---

## 💻 Hướng dẫn Chạy Local (Môi trường Phát triển)

Để chạy dự án ngay trên máy tính cá nhân của bạn để lập trình:

### 1. Yêu cầu hệ thống
- Tải và cài đặt [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0).
- Git.

### 2. Khởi động hệ thống (Chỉ cần 1 bước duy nhất)

Mở Terminal / Command Prompt:

```bash
# 1. Clone dự án về máy
git clone https://github.com/huyz4nny/vcStudyNote.git
cd vcStudyNote/StudyNote.API

# 2. Khởi động Backend (Tự động tạo database SQLite ở lần đầu tiên)
dotnet run
```

Hệ thống sẽ chạy tại địa chỉ: `http://localhost:5000`

- **Để lập trình Frontend:** Mở file `studynote-web/index.html` bằng tiện ích **Live Server** trên VS Code (thường chạy ở port 5500). Hệ thống JS đã được lập trình sẵn để tự động phát hiện môi trường Local và kết nối chéo sang API ở cổng 5000 cực kỳ thông minh.
- **Để test API (Backend):** Mở trình duyệt truy cập vào `http://localhost:5000/swagger`.

---

## 👨‍💻 Tác giả

Được thiết kế và phát triển bởi [**@huyz4nny**](https://github.com/huyz4nny).

Mọi góp ý hoặc báo lỗi, vui lòng tạo Issue trên kho lưu trữ. Nếu bạn thấy dự án này thú vị, hãy để lại một ⭐ nhé!

<div align="center">
<sub>Made with ❤️ & ☕ for students</sub>
</div>
