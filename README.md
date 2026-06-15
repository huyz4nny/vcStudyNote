<div align="center">

# 🎓 StudyNote

### Ứng dụng web quản lý học tập dành cho sinh viên

*Ghi chú theo môn · Theo dõi deadline · Checklist hằng ngày · Chuỗi streak gamification · Tính điểm GPA*

<br />

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![LocalStorage](https://img.shields.io/badge/Storage-localStorage-4CAF50?style=for-the-badge)
![No Build](https://img.shields.io/badge/build-zero%20config-purple?style=for-the-badge)

<br />

**[✨ Tính năng](#-tính-năng-chính)** ·
**[🚀 Cài đặt](#-cài-đặt--chạy)** ·
**[🏗️ Kiến trúc](#️-công-nghệ--cấu-trúc)** ·
**[🗺️ Roadmap](#️-roadmap)**

</div>

---

## 📖 Giới thiệu

**StudyNote** là một ứng dụng web *single-page* giúp sinh viên tổ chức việc học một cách trực quan và có động lực. Mọi dữ liệu được lưu ngay trên trình duyệt bằng `localStorage` — **không cần server, không cần database, không cần cài đặt gì** — chỉ cần mở là chạy.

Điểm khác biệt của StudyNote không chỉ là quản lý ghi chú và deadline, mà còn ở **hệ thống streak gamification** khích lệ thói quen học mỗi ngày và **module tính điểm GPA** theo trọng số từng cột điểm.

> 💡 Phiên bản hiện tại là bản frontend hoàn chỉnh (vanilla JS). Kế hoạch nâng cấp lên **ASP.NET Core 8 + EF Core + SQL Server** được mô tả trong [`StudyNote_ProjectPlan.md`](./StudyNote_ProjectPlan.md).

---

## ✨ Tính năng chính

| Module | Mô tả |
|--------|-------|
| 🔐 **Xác thực** | Đăng ký / đăng nhập, mỗi người dùng có dữ liệu riêng (lưu localStorage, mật khẩu được hash) |
| 📚 **Môn học** | Quản lý môn theo kỳ: tên, mã môn, giảng viên, số tín chỉ, màu nhận diện, học kỳ |
| 📝 **Ghi chú** | Ghi chú gắn với từng môn, phân loại theo tag (*lưu-ý / lý-thuyết / đề-cương*), ghim lên đầu, tìm kiếm & lọc |
| 📋 **Bài tập / Deadline** | Theo dõi deadline với mức ưu tiên (Thấp → Khẩn), trạng thái (Chưa làm / Đang làm / Hoàn thành), badge cảnh báo deadline gần & quá hạn |
| ✅ **Checklist hôm nay** | Danh sách việc cần làm theo ngày, kéo-thả sắp xếp, thanh tiến độ, xem lại lịch sử các ngày |
| 🔥 **Streak** | Hệ thống chuỗi ngày học có **4 cấp độ**, hiệu ứng ăn mừng khi hoàn thành — tạo động lực duy trì thói quen |
| 🎯 **Tính điểm (GPA)** | Bảng điểm theo trọng số từng cột, ngưỡng đạt tùy chỉnh, tự tính điểm tổng kết & cảnh báo điều kiện |
| 📊 **Dashboard** | Tổng quan: số môn, ghi chú, bài tập chờ nộp, deadline gần nhất, checklist & streak hôm nay |

---

## 🏗️ Công nghệ & cấu trúc

### Công nghệ sử dụng

| Lớp | Công nghệ |
|-----|-----------|
| **Ngôn ngữ** | HTML5, CSS3, JavaScript (ES6+, vanilla — không framework) |
| **Lưu trữ** | Browser `localStorage` (không cần backend) |
| **Icon** | [Phosphor Icons](https://phosphoricons.com/) |
| **Font** | Google Fonts |
| **Build** | Không cần — mở thẳng `index.html` |

### Cấu trúc thư mục

```
dotnetCheckList/
├── studynote-web/              # 🌐 Ứng dụng web (bản chạy thực tế)
│   ├── index.html             # Toàn bộ giao diện SPA (dashboard, modals, panels)
│   ├── css/
│   │   ├── redesign.css       # Giao diện chính (bản redesign)
│   │   └── style.css          # Style nền tảng
│   └── js/
│       ├── auth.js            # Đăng ký / đăng nhập, quản lý người dùng
│       ├── data.js            # Dữ liệu demo (môn, ghi chú, bài tập, checklist)
│       ├── app.js             # Logic ứng dụng cốt lõi
│       ├── redesign.js        # Render UI, điều hướng, modal, sự kiện
│       ├── streak.js          # Streak Engine — tính cấp độ chuỗi học
│       └── grades.js          # Grade Module — tính điểm theo trọng số
│
├── StudyNote_ProjectPlan.md    # 📐 Kế hoạch nâng cấp lên ASP.NET Core 8
└── README.md                   # 📄 Tài liệu này
```

---

## 🚀 Cài đặt & chạy

Không cần build, không cần npm. Chọn 1 trong 2 cách:

### Cách 1 — Mở trực tiếp
```bash
git clone https://github.com/huyz4nny/vcStudyNote.git
cd vcStudyNote/studynote-web
# Mở file index.html bằng trình duyệt
```

### Cách 2 — Dùng Live Server (khuyến nghị)
Dùng extension **Live Server** của VS Code, hoặc một HTTP server bất kỳ:

```bash
cd studynote-web
npx serve .          # hoặc: python -m http.server 8000
```

Rồi mở `http://localhost:8000` (hoặc cổng tương ứng).

> 🔑 **Lần đầu sử dụng:** đăng ký một tài khoản mới ngay trên màn hình đăng nhập. Dữ liệu của bạn được lưu cục bộ trên trình duyệt này.

---

## 🔥 Hệ thống Streak

Mỗi ngày hoàn thành công việc sẽ được chấm một cấp độ streak, khích lệ duy trì thói quen học:

| Cấp | Tên | Biểu tượng | Điều kiện |
|:---:|-----|:---:|-----------|
| 1 | Khởi động | ✨ | Ít nhất 1 task hoàn thành |
| 2 | Chăm chỉ | 🔥 | 100% task xong (trong 1 môn) |
| 3 | Đa môn | 🔥🔥 | Hoàn thành task từ ≥ 2 môn |
| 4 | ALL CLEAR | 🔥🔥🔥 | 100% task **và** phủ tất cả môn có task |

---

## 🎯 Tính điểm (GPA)

Module **Bảng điểm** cho phép mỗi môn:
- Thêm nhiều **cột điểm** với **trọng số (%)** riêng (VD: Lab 20%, Assignment 30%, Final 50%)
- Tự động tính **điểm tổng kết theo trọng số**
- Đặt **ngưỡng đạt** tùy chỉnh (mặc định 5.0)
- Gắn **điều kiện** cho từng cột (VD: Final ≥ 4) và cảnh báo khi không đạt

---

## 🗺️ Roadmap

Bản hiện tại là frontend hoàn chỉnh. Hướng phát triển tiếp theo (chi tiết trong [`StudyNote_ProjectPlan.md`](./StudyNote_ProjectPlan.md)):

- [ ] Nâng cấp backend lên **ASP.NET Core 8 (MVC) + EF Core + SQL Server**
- [ ] Xác thực bằng **ASP.NET Core Identity** (đa người dùng thực sự)
- [ ] Đồng bộ dữ liệu đám mây thay cho localStorage
- [ ] Trình soạn thảo **Markdown** cho ghi chú
- [ ] Nhắc deadline qua **email**
- [ ] Export ghi chú ra **PDF / Word**
- [ ] **Dark mode** & cải thiện responsive mobile

---

## 👤 Tác giả

Phát triển bởi [**@huyz4nny**](https://github.com/huyz4nny) — dự án học tập cá nhân.

## 📄 License

Phát hành phục vụ mục đích học tập. Bạn có thể tự do tham khảo và mở rộng.

<div align="center">
<br />

⭐ **Nếu thấy hữu ích, hãy để lại một star nhé!** ⭐

<sub>Made with ❤️ for students</sub>

</div>
