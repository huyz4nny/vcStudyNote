# 📚 StudyNote — Kế Hoạch Triển Khai Web App

> **Mô tả ngắn:** Ứng dụng web ASP.NET Core giúp sinh viên ghi chú lưu ý học tập theo môn học, theo dõi bài tập/deadline trong kỳ, và quản lý việc cần làm trong ngày dưới dạng checklist.

---

## 1. Tổng Quan Dự Án

| Mục | Chi tiết |
|-----|----------|
| **Tên dự án** | StudyNote |
| **Ngôn ngữ** | C# |
| **Framework** | ASP.NET Core 8 (MVC) |
| **ORM** | Entity Framework Core 8 |
| **Database** | SQL Server (hoặc SQLite cho dev local) |
| **Frontend** | Razor Views + Bootstrap 5 + Vanilla JS |
| **Auth** | ASP.NET Core Identity (đăng ký / đăng nhập) |
| **Môi trường dev** | Visual Studio 2022 / Rider |
| **Target** | Single user hoặc multi-user (mỗi người có dữ liệu riêng) |

---

## 2. Tính Năng Chính (Feature List)

### 2.1 Module Quản Lý Môn Học (Subject)
- Tạo / sửa / xóa môn học trong kỳ
- Mỗi môn có: tên, mã môn, giảng viên, số tín chỉ, màu nhận diện (color tag)
- Xem danh sách tất cả môn trong kỳ

### 2.2 Module Ghi Chú Theo Môn (SubjectNote)
- Tạo / sửa / xóa ghi chú gắn với 1 môn học cụ thể
- Mỗi ghi chú có: tiêu đề, nội dung (rich text / Markdown), ngày tạo, tag (lưu ý / lý thuyết / đề cương...)
- Tìm kiếm ghi chú theo từ khóa, lọc theo môn, lọc theo tag
- Ghi chú ghim (pin) lên đầu danh sách

### 2.3 Module Bài Tập / Deadline (Assignment)
- Tạo / sửa / xóa bài tập gắn với môn học
- Mỗi bài tập có: tên, mô tả, deadline (ngày giờ), mức độ ưu tiên (Thấp / Trung / Cao / Khẩn), trạng thái (Chưa làm / Đang làm / Hoàn thành)
- Hiển thị badge màu khi deadline gần (còn ≤ 2 ngày → đỏ, còn ≤ 5 ngày → vàng)
- Lọc: theo môn, theo trạng thái, theo mức ưu tiên
- Sắp xếp: theo deadline tăng dần / giảm dần

### 2.4 Module Việc Cần Làm Hôm Nay (DailyChecklist)
- Tạo checklist cho từng ngày (mặc định mở checklist ngày hôm nay)
- Thêm / xóa / đánh dấu hoàn thành từng task
- Mỗi task có: nội dung, thứ tự (drag-drop reorder), trạng thái (done / undone)
- Hiển thị progress bar tỷ lệ hoàn thành trong ngày
- Xem lại checklist của các ngày trước (lịch sử)
- Tùy chọn: copy task chưa xong từ hôm qua sang hôm nay

### 2.5 Dashboard (Trang Chủ)
- Tóm tắt số ghi chú / bài tập còn lại / task hôm nay
- Hiển thị 5 deadline gần nhất
- Hiển thị checklist hôm nay
- Thống kê tiến độ theo môn (progress bar)

---

## 3. Kiến Trúc Hệ Thống

```
StudyNote/
├── StudyNote.Web/                  # ASP.NET Core MVC Project
│   ├── Controllers/
│   │   ├── HomeController.cs
│   │   ├── SubjectController.cs
│   │   ├── NoteController.cs
│   │   ├── AssignmentController.cs
│   │   ├── ChecklistController.cs
│   │   └── AccountController.cs
│   ├── Models/
│   │   ├── ViewModels/             # ViewModel riêng cho từng View
│   │   └── (Domain models được đặt ở tầng Data)
│   ├── Views/
│   │   ├── Home/
│   │   │   └── Index.cshtml        # Dashboard
│   │   ├── Subject/
│   │   │   ├── Index.cshtml
│   │   │   ├── Create.cshtml
│   │   │   └── Edit.cshtml
│   │   ├── Note/
│   │   │   ├── Index.cshtml
│   │   │   ├── Create.cshtml
│   │   │   ├── Edit.cshtml
│   │   │   └── Detail.cshtml
│   │   ├── Assignment/
│   │   │   ├── Index.cshtml
│   │   │   ├── Create.cshtml
│   │   │   └── Edit.cshtml
│   │   ├── Checklist/
│   │   │   └── Index.cshtml
│   │   └── Shared/
│   │       ├── _Layout.cshtml
│   │       └── _SubjectSidebar.cshtml
│   ├── wwwroot/
│   │   ├── css/
│   │   ├── js/
│   │   └── lib/
│   └── Program.cs
│
├── StudyNote.Data/                 # Class Library — Data Layer
│   ├── Entities/
│   │   ├── AppUser.cs
│   │   ├── Subject.cs
│   │   ├── SubjectNote.cs
│   │   ├── Assignment.cs
│   │   ├── ChecklistDay.cs
│   │   └── ChecklistItem.cs
│   ├── AppDbContext.cs
│   └── Migrations/
│
└── StudyNote.sln
```

> **Lưu ý kiến trúc:** Dự án nhỏ có thể gộp Data vào Web project (1 project duy nhất). Tách ra 2 project nếu muốn mở rộng sau này.

---

## 4. Thiết Kế Database

### 4.1 Entity Relationship Diagram (ERD — mô tả text)

```
AppUser (1) ──< (N) Subject
Subject  (1) ──< (N) SubjectNote
Subject  (1) ──< (N) Assignment
AppUser  (1) ──< (N) ChecklistDay
ChecklistDay (1) ──< (N) ChecklistItem
```

### 4.2 Chi Tiết Bảng

#### Bảng `AspNetUsers` (Identity — có sẵn)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | nvarchar(450) | PK |
| UserName | nvarchar(256) | |
| Email | nvarchar(256) | |
| PasswordHash | nvarchar(max) | |
| ... | ... | Các cột Identity mặc định |

---

#### Bảng `Subjects`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | int | PK, Identity |
| UserId | nvarchar(450) | FK → AspNetUsers |
| Name | nvarchar(100) | Tên môn, NOT NULL |
| Code | nvarchar(20) | Mã môn (VD: CSD201) |
| Lecturer | nvarchar(100) | Tên giảng viên |
| Credits | int | Số tín chỉ |
| ColorHex | nvarchar(7) | VD: #3B82F6 |
| Semester | nvarchar(20) | VD: SU2026 |
| IsActive | bit | Môn đang học trong kỳ |
| CreatedAt | datetime2 | |

---

#### Bảng `SubjectNotes`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | int | PK, Identity |
| SubjectId | int | FK → Subjects |
| Title | nvarchar(200) | NOT NULL |
| Content | nvarchar(max) | Nội dung ghi chú (có thể Markdown) |
| Tag | nvarchar(50) | lưu-ý / lý-thuyết / đề-cương / khác |
| IsPinned | bit | Ghim lên đầu |
| CreatedAt | datetime2 | |
| UpdatedAt | datetime2 | |

---

#### Bảng `Assignments`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | int | PK, Identity |
| SubjectId | int | FK → Subjects |
| Title | nvarchar(200) | NOT NULL |
| Description | nvarchar(max) | |
| Deadline | datetime2 | |
| Priority | int | 0=Thấp, 1=Trung, 2=Cao, 3=Khẩn |
| Status | int | 0=ChuaLam, 1=DangLam, 2=HoanThanh |
| CreatedAt | datetime2 | |
| UpdatedAt | datetime2 | |

---

#### Bảng `ChecklistDays`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | int | PK, Identity |
| UserId | nvarchar(450) | FK → AspNetUsers |
| Date | date | Ngày của checklist (UNIQUE per user) |
| CreatedAt | datetime2 | |

---

#### Bảng `ChecklistItems`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| Id | int | PK, Identity |
| ChecklistDayId | int | FK → ChecklistDays |
| Content | nvarchar(500) | Nội dung task |
| IsDone | bit | Trạng thái |
| SortOrder | int | Thứ tự hiển thị |
| CreatedAt | datetime2 | |

---

## 5. Domain Entities (C# Code)

```csharp
// Subject.cs
public class Subject
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Lecturer { get; set; }
    public int? Credits { get; set; }
    public string ColorHex { get; set; } = "#3B82F6";
    public string? Semester { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppUser User { get; set; } = null!;
    public ICollection<SubjectNote> Notes { get; set; } = new List<SubjectNote>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

// SubjectNote.cs
public class SubjectNote
{
    public int Id { get; set; }
    public int SubjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? Tag { get; set; }
    public bool IsPinned { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Subject Subject { get; set; } = null!;
}

// Assignment.cs
public enum Priority { Low = 0, Medium = 1, High = 2, Urgent = 3 }
public enum AssignmentStatus { Todo = 0, InProgress = 1, Done = 2 }

public class Assignment
{
    public int Id { get; set; }
    public int SubjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? Deadline { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Todo;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Subject Subject { get; set; } = null!;

    // Helper
    public bool IsOverdue => Deadline.HasValue && Deadline < DateTime.Now && Status != AssignmentStatus.Done;
    public bool IsNearDeadline => Deadline.HasValue && Deadline > DateTime.Now
                                   && (Deadline - DateTime.Now)?.TotalDays <= 2
                                   && Status != AssignmentStatus.Done;
}

// ChecklistDay.cs
public class ChecklistDay
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<ChecklistItem> Items { get; set; } = new List<ChecklistItem>();
}

// ChecklistItem.cs
public class ChecklistItem
{
    public int Id { get; set; }
    public int ChecklistDayId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsDone { get; set; } = false;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ChecklistDay ChecklistDay { get; set; } = null!;
}
```

---

## 6. AppDbContext

```csharp
public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<SubjectNote> SubjectNotes => Set<SubjectNote>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<ChecklistDay> ChecklistDays => Set<ChecklistDay>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Unique constraint: mỗi user chỉ có 1 ChecklistDay per date
        builder.Entity<ChecklistDay>()
            .HasIndex(x => new { x.UserId, x.Date })
            .IsUnique();
    }
}
```

---

## 7. Program.cs (cấu hình cơ bản)

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.LogoutPath = "/Account/Logout";
});

builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
```

---

## 8. Routing & Controller Actions

### HomeController
| Action | Method | Route | Mô tả |
|--------|--------|-------|-------|
| Index | GET | / | Dashboard |

### SubjectController
| Action | Method | Route | Mô tả |
|--------|--------|-------|-------|
| Index | GET | /Subject | Danh sách môn |
| Create | GET | /Subject/Create | Form tạo môn |
| Create | POST | /Subject/Create | Lưu môn mới |
| Edit | GET | /Subject/Edit/{id} | Form sửa |
| Edit | POST | /Subject/Edit/{id} | Lưu sửa |
| Delete | POST | /Subject/Delete/{id} | Xóa môn |

### NoteController
| Action | Method | Route | Mô tả |
|--------|--------|-------|-------|
| Index | GET | /Note?subjectId=&tag= | Danh sách ghi chú (có filter) |
| Detail | GET | /Note/Detail/{id} | Xem chi tiết |
| Create | GET | /Note/Create?subjectId= | Form tạo |
| Create | POST | /Note/Create | Lưu ghi chú |
| Edit | GET | /Note/Edit/{id} | Form sửa |
| Edit | POST | /Note/Edit/{id} | Lưu sửa |
| Delete | POST | /Note/Delete/{id} | Xóa |
| TogglePin | POST | /Note/TogglePin/{id} | Ghim/bỏ ghim (AJAX) |

### AssignmentController
| Action | Method | Route | Mô tả |
|--------|--------|-------|-------|
| Index | GET | /Assignment?subjectId=&status=&priority= | Danh sách |
| Create | GET | /Assignment/Create?subjectId= | Form tạo |
| Create | POST | /Assignment/Create | Lưu |
| Edit | GET | /Assignment/Edit/{id} | Form sửa |
| Edit | POST | /Assignment/Edit/{id} | Lưu sửa |
| UpdateStatus | POST | /Assignment/UpdateStatus/{id} | Đổi trạng thái (AJAX) |
| Delete | POST | /Assignment/Delete/{id} | Xóa |

### ChecklistController
| Action | Method | Route | Mô tả |
|--------|--------|-------|-------|
| Index | GET | /Checklist?date= | Xem checklist theo ngày (mặc định: hôm nay) |
| AddItem | POST | /Checklist/AddItem | Thêm task (AJAX, trả JSON) |
| ToggleItem | POST | /Checklist/ToggleItem/{id} | Check/uncheck (AJAX) |
| DeleteItem | POST | /Checklist/DeleteItem/{id} | Xóa task (AJAX) |
| ReorderItems | POST | /Checklist/ReorderItems | Cập nhật thứ tự (AJAX) |
| CopyYesterday | POST | /Checklist/CopyYesterday | Copy task chưa xong từ hôm qua |

---

## 9. ViewModels Quan Trọng

```csharp
// Dashboard
public class DashboardViewModel
{
    public int TotalSubjects { get; set; }
    public int TotalNotes { get; set; }
    public int PendingAssignments { get; set; }
    public List<Assignment> UpcomingDeadlines { get; set; } = new();
    public ChecklistDay? TodayChecklist { get; set; }
    public int TodayDoneCount { get; set; }
    public int TodayTotalCount { get; set; }
}

// Note Index
public class NoteIndexViewModel
{
    public List<SubjectNote> Notes { get; set; } = new();
    public List<Subject> Subjects { get; set; } = new();
    public int? SelectedSubjectId { get; set; }
    public string? SelectedTag { get; set; }
    public string? SearchKeyword { get; set; }
}

// Assignment Index
public class AssignmentIndexViewModel
{
    public List<Assignment> Assignments { get; set; } = new();
    public List<Subject> Subjects { get; set; } = new();
    public int? SelectedSubjectId { get; set; }
    public AssignmentStatus? SelectedStatus { get; set; }
    public Priority? SelectedPriority { get; set; }
}
```

---

## 10. Giao Diện (UI Layout)

### Layout chính (`_Layout.cshtml`)
```
┌─────────────────────────────────────────────────────┐
│  🎓 StudyNote          [Tên User]  [Đăng xuất]      │  ← Navbar
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  📊 Dashboard│         [Nội dung chính]             │
│  📚 Môn học  │                                      │
│  📝 Ghi chú  │                                      │
│  📋 Bài tập  │                                      │
│  ✅ Hôm nay  │                                      │
│              │                                      │
│  [Môn học]   │                                      │
│  · CSD201 🔵 │                                      │
│  · PRJ301 🟢 │                                      │
│  · DBI202 🟠 │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Dashboard
```
┌──────────────────────────────────────────────────────┐
│  Chào buổi sáng! Hôm nay là Thứ Hai, 15/06/2026     │
├────────────┬────────────┬────────────┬───────────────┤
│  4 Môn học │ 12 Ghi chú │ 5 Bài tập  │ 3/7 Task hôm │
│            │            │  chờ nộp   │  nay ✅       │
├────────────┴────────────┴────────────┴───────────────┤
│  ⚠️ Deadline Gần Nhất         │  ✅ Checklist Hôm Nay│
│  ─────────────────────────── │  ──────────────────── │
│  [🔴] Lab 3 - CSD201  hôm nay│  ☑ Ôn linked list    │
│  [🟡] Report - PRJ301  2 ngày│  ☑ Nộp Lab 2         │
│  [🟢] SQL script  5 ngày     │  ☐ Đọc slide IoT      │
│                               │  ☐ Push code lên git  │
│                               │  Progress: ████░░ 50% │
└───────────────────────────────┴──────────────────────┘
```

### Checklist Hôm Nay
```
┌──────────────────────────────────────────────────────┐
│  ✅ Việc cần làm — Thứ Hai 15/06/2026                │
│  [< Hôm qua]  [Hôm nay]  [Ngày mai >]               │
│  ──────────────────────────────────────────────────  │
│  Progress: ████████░░░░  3/5 hoàn thành              │
│                                                      │
│  ☑ Ôn linked list cho CSD201                  [🗑]  │
│  ☑ Nộp Lab 2 trên portal                      [🗑]  │
│  ☑ Fix bug authenticate PRJ301                 [🗑]  │
│  ☐ Đọc slide chương 4 IoT                     [🗑]  │  ← kéo thả được
│  ☐ Push code Java MVC lên GitHub              [🗑]  │
│                                                      │
│  [+ Thêm task...]                                    │
│  [📋 Copy task chưa xong từ hôm qua]                │
└──────────────────────────────────────────────────────┘
```

---

## 11. Thư Viện & Package NuGet Cần Dùng

```xml
<!-- StudyNote.Web.csproj -->
<PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="8.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.*" />

<!-- Nếu dùng SQLite cho dev local -->
<PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.*" />

<!-- Markdown rendering (tùy chọn — để render nội dung ghi chú) -->
<PackageReference Include="Markdig" Version="0.37.*" />
```

### Thư viện Frontend (CDN)
```html
<!-- Bootstrap 5 -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- Bootstrap Icons -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">

<!-- SortableJS — drag-drop reorder checklist -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

<!-- EasyMDE — Markdown editor cho ghi chú (tùy chọn) -->
<link href="https://unpkg.com/easymde/dist/easymde.min.css" rel="stylesheet">
<script src="https://unpkg.com/easymde/dist/easymde.min.js"></script>
```

---

## 12. Lộ Trình Phát Triển (Sprint Plan)

### Sprint 0 — Setup (1–2 ngày)
- [ ] Tạo solution, project MVC + Data library
- [ ] Cài NuGet packages
- [ ] Tạo entities, AppDbContext
- [ ] Setup Identity (AppUser, đăng ký, đăng nhập)
- [ ] Migration đầu tiên, seed data thử nghiệm
- [ ] `_Layout.cshtml` với sidebar + navbar cơ bản

### Sprint 1 — Môn học + Ghi chú (2–3 ngày)
- [ ] CRUD Subject (Controller + Views)
- [ ] CRUD SubjectNote (Controller + Views)
- [ ] Filter ghi chú theo môn, tag, từ khóa
- [ ] Tính năng ghim ghi chú (AJAX)
- [ ] Sidebar hiển thị danh sách môn động

### Sprint 2 — Bài tập / Deadline (2–3 ngày)
- [ ] CRUD Assignment (Controller + Views)
- [ ] Badge màu deadline (Razor helper / CSS class)
- [ ] Filter + sort bài tập
- [ ] AJAX cập nhật trạng thái nhanh (click toggle)

### Sprint 3 — Checklist Hôm Nay (2 ngày)
- [ ] Controller + View Checklist
- [ ] Thêm / xóa / check task (AJAX)
- [ ] Progress bar
- [ ] Drag-drop reorder (SortableJS)
- [ ] Copy task chưa xong từ hôm qua

### Sprint 4 — Dashboard + Hoàn thiện (2 ngày)
- [ ] Dashboard tổng hợp
- [ ] Điều hướng ngày checklist (hôm qua / hôm nay / ngày mai)
- [ ] Responsive mobile check
- [ ] Xử lý edge case (subject bị xóa có note/assignment liên kết)
- [ ] Thêm `[Authorize]` tất cả controller

### Sprint 5 — Tính năng nâng cao (tùy chọn)
- [ ] Markdown editor cho ghi chú (EasyMDE)
- [ ] Export ghi chú ra PDF / Word
- [ ] Nhắc nhở deadline qua email (Background Service)
- [ ] Dark mode toggle
- [ ] Import bài tập hàng loạt từ CSV

---

## 13. Bảo Mật Cơ Bản

- Tất cả Controller cần `[Authorize]` attribute (trừ AccountController)
- Mỗi query đều filter `WHERE UserId = currentUserId` — không cho user A xem dữ liệu user B
- Anti-forgery token cho tất cả form POST (`@Html.AntiForgeryToken()` / `[ValidateAntiForgeryToken]`)
- Validate input phía server (ModelState.IsValid)
- Không expose Id liên tục — kiểm tra ownership trước khi Edit/Delete

---

## 14. Connection String Mẫu

```json
// appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=StudyNoteDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  }
}

// Hoặc SQL Server Express
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyNoteDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}

// Hoặc SQLite (nhẹ hơn cho dev)
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=studynote.db"
  }
}
```

---

## 15. Lệnh EF Core Cần Dùng

```bash
# Tạo migration đầu tiên
dotnet ef migrations add InitialCreate --project StudyNote.Data --startup-project StudyNote.Web

# Áp dụng migration lên database
dotnet ef database update --project StudyNote.Data --startup-project StudyNote.Web

# Nếu gộp 1 project
dotnet ef migrations add InitialCreate
dotnet ef database update
```

---

## 16. Checklist Trước Khi Deploy

- [ ] Đổi `appsettings.Production.json` dùng connection string thật
- [ ] Tắt `UseDeveloperExceptionPage` trong Production
- [ ] Bật HTTPS redirect
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Chạy `dotnet ef database update` trên server
- [ ] Test đăng ký / đăng nhập
- [ ] Test CRUD tất cả module
- [ ] Test trên mobile (responsive)

---

*Tài liệu này đủ để 1 developer đọc và bắt đầu code từ đầu. Phiên bản: 1.0 — Tháng 6/2026*
