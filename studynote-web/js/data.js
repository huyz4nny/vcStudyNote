// ===================================================
// StudyNote — Demo Data
// ===================================================

const today = new Date();
today.setHours(0,0,0,0);

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const subjects = [
  {
    id: 1, name: 'Cấu Trúc Dữ Liệu & Giải Thuật', code: 'CSD201',
    lecturer: 'Nguyễn Văn An', credits: 3, colorHex: '#6366f1',
    semester: 'SU2026', isActive: true,
    noteCount: 5, assignmentCount: 3
  },
  {
    id: 2, name: 'Dự Án Lập Trình Java', code: 'PRJ301',
    lecturer: 'Trần Thị Bình', credits: 3, colorHex: '#10b981',
    semester: 'SU2026', isActive: true,
    noteCount: 4, assignmentCount: 2
  },
  {
    id: 3, name: 'Cơ Sở Dữ Liệu', code: 'DBI202',
    lecturer: 'Lê Minh Cường', credits: 3, colorHex: '#f59e0b',
    semester: 'SU2026', isActive: true,
    noteCount: 2, assignmentCount: 1
  },
  {
    id: 4, name: 'Internet of Things', code: 'IOT102',
    lecturer: 'Phạm Thu Hà', credits: 3, colorHex: '#ec4899',
    semester: 'SU2026', isActive: true,
    noteCount: 1, assignmentCount: 1
  }
];

const notes = [
  {
    id: 1, subjectId: 1, title: 'Thuật toán sắp xếp nhanh (QuickSort)',
    content: 'QuickSort là thuật toán chia để trị.\n\n**Độ phức tạp:**\n- Trung bình: O(n log n)\n- Tệ nhất: O(n²)\n\n**Bước thực hiện:**\n1. Chọn pivot\n2. Phân hoạch mảng\n3. Đệ quy sắp xếp 2 nửa',
    tag: 'lý-thuyết', isPinned: true,
    createdAt: addDays(today, -3), updatedAt: addDays(today, -1)
  },
  {
    id: 2, subjectId: 1, title: 'Lưu ý thi cuối kỳ CSD201',
    content: 'Các dạng bài cần ôn:\n- Linked List, Stack, Queue\n- Binary Search Tree\n- Graph: BFS, DFS\n- Sorting: QuickSort, MergeSort',
    tag: 'lưu-ý', isPinned: true,
    createdAt: addDays(today, -5), updatedAt: addDays(today, -2)
  },
  {
    id: 3, subjectId: 2, title: 'Mô hình MVC trong Java Spring',
    content: 'Model - View - Controller pattern\nController nhận request từ user, gọi Model, trả về View.',
    tag: 'lý-thuyết', isPinned: false,
    createdAt: addDays(today, -7), updatedAt: addDays(today, -7)
  },
  {
    id: 4, subjectId: 2, title: 'Đề cương ôn thi PRJ301',
    content: 'Chapter 1-5:\n- OOP Review\n- Design Patterns\n- Spring Boot basics\n- Hibernate & JPA\n- REST API',
    tag: 'đề-cương', isPinned: false,
    createdAt: addDays(today, -10), updatedAt: addDays(today, -4)
  },
  {
    id: 5, subjectId: 3, title: 'Các loại JOIN trong SQL',
    content: 'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN\nCú pháp và ví dụ cụ thể.',
    tag: 'lý-thuyết', isPinned: false,
    createdAt: addDays(today, -2), updatedAt: addDays(today, -2)
  },
  {
    id: 6, subjectId: 1, title: 'Ghi chú về Binary Tree',
    content: 'Cây nhị phân tìm kiếm (BST): mọi node bên trái < node gốc, bên phải > node gốc.',
    tag: 'lý-thuyết', isPinned: false,
    createdAt: addDays(today, -1), updatedAt: addDays(today, -1)
  },
  {
    id: 7, subjectId: 4, title: 'Giao thức MQTT trong IoT',
    content: 'MQTT - Message Queuing Telemetry Transport\nNhẹ, phù hợp thiết bị có băng thông thấp.',
    tag: 'lưu-ý', isPinned: false,
    createdAt: addDays(today, -6), updatedAt: addDays(today, -6)
  },
  {
    id: 8, subjectId: 3, title: 'Normalization — Chuẩn hóa CSDL',
    content: '1NF, 2NF, 3NF, BCNF - Các dạng chuẩn trong thiết kế CSDL quan hệ.',
    tag: 'đề-cương', isPinned: false,
    createdAt: addDays(today, -4), updatedAt: addDays(today, -3)
  }
];

const assignments = [
  {
    id: 1, subjectId: 1, title: 'Lab 3 — Linked List Implementation',
    description: 'Cài đặt Singly và Doubly Linked List bằng C#. Submit file .zip lên portal.',
    deadline: addDays(today, 0), // today
    priority: 3, status: 0
  },
  {
    id: 2, subjectId: 2, title: 'Project Report — Java MVC',
    description: 'Viết báo cáo dự án 15 trang, bao gồm Use Case, Class Diagram, và Database Design.',
    deadline: addDays(today, 2),
    priority: 2, status: 1
  },
  {
    id: 3, subjectId: 3, title: 'SQL Script — Database Design',
    description: 'Thiết kế và implement CSDL cho hệ thống quản lý bán hàng.',
    deadline: addDays(today, 5),
    priority: 1, status: 0
  },
  {
    id: 4, subjectId: 1, title: 'Quiz — Tree & Graph Algorithms',
    description: 'Online quiz trên hệ thống Efis, 30 câu, thời gian 45 phút.',
    deadline: addDays(today, 8),
    priority: 1, status: 0
  },
  {
    id: 5, subjectId: 4, title: 'IoT Lab — Arduino Sensor',
    description: 'Lập trình cảm biến DHT11 gửi dữ liệu lên ThingSpeak.',
    deadline: addDays(today, 12),
    priority: 0, status: 0
  },
  {
    id: 6, subjectId: 2, title: 'Code Review — Spring Boot REST',
    description: 'Demo và code review API endpoints với giảng viên.',
    deadline: addDays(today, -1), // overdue
    priority: 2, status: 1
  }
];

// checklist keyed by date string "YYYY-MM-DD"
function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

const checklistData = {
  [dateKey(addDays(today, -1))]: [
    { id: 101, content: 'Ôn linked list cho CSD201', isDone: true, sortOrder: 0 },
    { id: 102, content: 'Nộp Lab 2 trên portal', isDone: true, sortOrder: 1 },
    { id: 103, content: 'Fix bug authenticate PRJ301', isDone: true, sortOrder: 2 },
    { id: 104, content: 'Đọc slide chương 4 IoT', isDone: false, sortOrder: 3 },
    { id: 105, content: 'Push code Java MVC lên GitHub', isDone: false, sortOrder: 4 },
  ],
  [dateKey(today)]: [
    { id: 201, content: 'Ôn linked list cho CSD201', isDone: true, sortOrder: 0 },
    { id: 202, content: 'Nộp Lab 2 trên portal', isDone: true, sortOrder: 1 },
    { id: 203, content: 'Fix bug authenticate PRJ301', isDone: true, sortOrder: 2 },
    { id: 204, content: 'Đọc slide chương 4 IoT', isDone: false, sortOrder: 3 },
    { id: 205, content: 'Push code Java MVC lên GitHub', isDone: false, sortOrder: 4 },
    { id: 206, content: 'Viết báo cáo PRJ301', isDone: false, sortOrder: 5 },
    { id: 207, content: 'Review SQL script DBI202', isDone: false, sortOrder: 6 },
  ]
};

let nextId = 1000;
function genId() { return ++nextId; }
