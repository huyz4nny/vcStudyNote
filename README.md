<div align="center">

# 🎓 StudyNote

### Ứng dụng web quản lý học tập cá nhân dành cho sinh viên

*Ghi chú theo môn · Theo dõi deadline · Checklist hằng ngày · Chuỗi streak gamification · Tính điểm GPA*

<br />

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![LocalStorage](https://img.shields.io/badge/Storage-localStorage-4CAF50?style=for-the-badge)

<br />

**[🌍 Trải nghiệm thực tế tại: huyz4nny.xyz](http://huyz4nny.xyz)**

</div>

---

## 📖 Giới thiệu dự án

**StudyNote** là một ứng dụng web dạng *Single-Page Application (SPA)* được thiết kế nhằm giúp các bạn sinh viên tổ chức việc học một cách trực quan, tối ưu và tràn đầy động lực. 

Dự án hiện đang ở giai đoạn **Frontend hoàn chỉnh**, mọi dữ liệu được lưu trữ siêu tốc và an toàn ngay trên trình duyệt thông qua `localStorage`. Khác biệt với các ứng dụng To-do list thông thường, StudyNote tập trung mạnh vào **Gamification** (Tạo động lực bằng hệ thống Streak) và **Đặc thù sinh viên** (Quản lý môn học, tín chỉ, tính điểm GPA).

> 🌐 **Thông tin Triển khai (Deployment):**
> - **Tên miền (Domain):** `huyz4nny.xyz` (Được đăng ký và quản lý tại **Nhân Hòa**).
> - **Máy chủ (Hosting):** Được lưu trữ và triển khai thông qua dịch vụ **SmarterASP.NET** (Gói Trial).
> - **CI/CD:** Đồng bộ và cập nhật mã nguồn hoàn toàn tự động nhờ tính năng **GitHub Deployment** của SmarterASP.NET.

---

## ✨ Tính năng nổi bật

| Module | Chi tiết tính năng |
|--------|--------------------|
| 🔐 **Xác thực người dùng** | Đăng ký & Đăng nhập mượt mà. Hệ thống tự động mã hóa mật khẩu, phân chia không gian làm việc (workspace) riêng biệt cho từng tài khoản trên cùng một thiết bị. |
| 📚 **Quản lý Môn học** | Lưu trữ thông tin chi tiết: Tên môn, Mã môn, Giảng viên, Số tín chỉ, Phân loại theo Học kỳ và gắn Màu sắc nhận diện riêng biệt. |
| 📝 **Smart Notes** | Hệ thống ghi chú thông minh gắn liền với môn học. Hỗ trợ phân loại qua tag (*lưu ý / lý thuyết / đề cương*), ghim nội dung quan trọng lên đầu, tìm kiếm nhanh và lọc thông tin. |
| 📋 **Deadline Tracker** | Theo dõi bài tập theo mức độ ưu tiên (Thấp → Khẩn cấp). Huy hiệu (badge) cảnh báo tự động khi deadline sắp đến hoặc đã quá hạn. |
| ✅ **Checklist & To-do** | Bảng công việc mỗi ngày với khả năng kéo-thả (Drag & Drop) siêu nhạy, thanh tiến độ trực quan và khả năng xem lại lịch sử các ngày trước đó. |
| 🔥 **Streak Engine** | **Gamification cốt lõi:** Hệ thống tính điểm chuỗi ngày học liên tục với **4 cấp độ** (Khởi động, Chăm chỉ, Đa môn, ALL CLEAR) kèm hiệu ứng ăn mừng pháo hoa đẹp mắt nhằm duy trì thói quen học tập. |
| 🎯 **Bộ máy GPA (Tính điểm)**| Theo dõi đa dạng các cột điểm theo trọng số (Lab 20%, Assignment 30%, Final 50%). Tự động cảnh báo môn học có nguy cơ rớt hoặc tính điểm trung bình tích lũy. |
| 📊 **Dashboard Tổng quan** | Giao diện Control Panel hiện đại thống kê toàn bộ tiến độ: số môn đang học, deadline sắp cháy, số ghi chú, chuỗi streak hiện tại. |

---

## 🏗️ Ngăn xếp Công nghệ (Tech Stack)

Dự án được xây dựng hoàn toàn bằng các công nghệ nền tảng, không phụ thuộc vào framework nặng nề, đảm bảo tốc độ phản hồi tính bằng mili-giây:

- **Frontend:** HTML5, CSS3, JavaScript ES6+ (Vanilla JS).
- **Cơ sở dữ liệu:** Browser `localStorage` (API lưu trữ cục bộ).
- **Kiến trúc UI/UX:** Responsive Design, Micro-interactions (Hiệu ứng hover, transition), DOM Manipulation.
- **Hạ tầng mạng:** 
  - Domain cung cấp bởi **Nhân Hòa**.
  - Hosting cung cấp bởi **SmarterASP.NET**.
- **Công cụ hỗ trợ:** 
  - Icon: [Phosphor Icons](https://phosphoricons.com/)
  - Font chữ: Google Fonts (Inter/Roboto).

---

## 🚀 Hướng dẫn Cài đặt & Chạy dưới Local

Dự án không cần cài đặt môi trường phức tạp (không NodeJS, không npm). Bạn có thể chạy theo 2 cách cực kỳ đơn giản:

### Cách 1: Chạy trực tiếp qua trình duyệt
```bash
git clone https://github.com/huyz4nny/vcStudyNote.git
cd vcStudyNote/studynote-web
# Bấm đúp vào file index.html để trải nghiệm ngay
```

### Cách 2: Chạy qua Live Server (Khuyên dùng cho Developer)
Mở dự án bằng Visual Studio Code, sử dụng extension **Live Server** hoặc dùng các công cụ HTTP Server tích hợp sẵn:
```bash
cd vcStudyNote/studynote-web
# Nếu dùng Node.js
npx serve . 

# Nếu dùng Python
python -m http.server 8000
```
Truy cập: `http://localhost:8000`

---

## 🗺️ Lộ trình Phát triển (Roadmap)

Trong tương lai gần, StudyNote sẽ được nâng cấp từ một trang web tĩnh thành một **Hệ thống phần mềm Fullstack hoàn chỉnh** (chi tiết xem tại [`StudyNote_ProjectPlan.md`](./StudyNote_ProjectPlan.md)):

- [ ] **Xây dựng Backend:** Chuyển đổi sang **ASP.NET Core 8 (Web API)** theo mô hình MVC hoặc Clean Architecture.
- [ ] **Thiết kế Database:** Sử dụng **Entity Framework Core** kết nối với hệ quản trị cơ sở dữ liệu **Microsoft SQL Server**.
- [ ] **Bảo mật:** Tích hợp **ASP.NET Core Identity** kết hợp với **JWT Token** để quản lý phiên đăng nhập thực tế.
- [ ] **Tính năng nâng cao:**
  - Đồng bộ dữ liệu theo thời gian thực (Cloud Sync).
  - Gửi email thông báo nhắc nhở deadline tự động.
  - Hỗ trợ Markdown đầy đủ cho phần Ghi chú.
  - Tự động xuất lịch học & kết quả ra PDF/Word.

---

## 👨‍💻 Tác giả

Được thiết kế và phát triển bởi [**@huyz4nny**](https://github.com/huyz4nny).

Mọi góp ý hoặc báo lỗi, vui lòng tạo Issue trên kho lưu trữ. Nếu bạn thấy dự án này thú vị, hãy để lại một ⭐ nhé!

<div align="center">
<sub>Made with ❤️ & ☕ for students</sub>
</div>
