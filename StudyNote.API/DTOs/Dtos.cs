using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.DTOs;

// ===== AUTH =====
public record RegisterRequest(
    [Required, MaxLength(50)] string Username,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? DisplayName
);

public record LoginRequest(
    [Required] string Username,
    [Required] string Password
);

public record AuthResponse(
    string Token,
    string Username,
    string Email,
    string? DisplayName,
    DateTime Expires
);

public record UpdatePreferencesRequest(string PreferencesJson);

// ===== SUBJECT =====
public record SubjectRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(20)] string? Code,
    [MaxLength(100)] string? Lecturer,
    int? Credits,
    [MaxLength(7)] string ColorHex,
    [MaxLength(20)] string? Semester,
    bool IsActive,
    string? LetterGrade,
    double PassThreshold,
    bool IsCountedInGPA,
    string? StatusOverride
);

public record SubjectResponse(
    int Id,
    string Name,
    string? Code,
    string? Lecturer,
    int? Credits,
    string ColorHex,
    string? Semester,
    bool IsActive,
    DateTime CreatedAt,
    string? LetterGrade,
    double PassThreshold,
    bool IsCountedInGPA,
    int NotesCount,
    int AssignmentsCount,
    string? StatusOverride,
    List<GradeItemResponse>? GradeItems = null
);

// ===== NOTES =====
public record NoteRequest(
    int SubjectId,
    [Required, MaxLength(200)] string Title,
    string? Content,
    [MaxLength(50)] string? Tag
);

public record NoteResponse(
    int Id,
    int SubjectId,
    string SubjectName,
    string SubjectColor,
    string Title,
    string? Content,
    string? Tag,
    bool IsPinned,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ===== ASSIGNMENT =====
public record AssignmentRequest(
    int SubjectId,
    [Required, MaxLength(200)] string Title,
    string? Description,
    DateTime? Deadline,
    int Priority,
    int Status
);

public record AssignmentStatusRequest(int Status);

public record AssignmentResponse(
    int Id,
    int SubjectId,
    string SubjectName,
    string SubjectColor,
    string Title,
    string? Description,
    DateTime? Deadline,
    int Priority,
    int Status,
    bool IsOverdue,
    bool IsNearDeadline,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ===== CHECKLIST =====
public record ChecklistItemRequest(
    [Required, MaxLength(500)] string Content,
    string? Date // "2026-06-20", null = hôm nay
);

public record ChecklistItemResponse(
    int Id,
    string Content,
    bool IsDone,
    int SortOrder,
    DateTime CreatedAt
);

public record ChecklistDayResponse(
    int Id,
    DateOnly Date,
    List<ChecklistItemResponse> Items,
    int TotalCount,
    int DoneCount
);

public record ReorderRequest(List<int> ItemIds); // Thứ tự mới

// ===== CURRICULUM =====
public record CurriculumSubjectRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(20)] string? Code,
    int? Credits,
    int TermNo,
    [MaxLength(7)] string ColorHex,
    double PassThreshold,
    bool IsCountedInGPA
);

public record CurriculumSubjectResponse(
    int Id,
    string Name,
    string? Code,
    int? Credits,
    int TermNo,
    string ColorHex,
    double PassThreshold,
    bool IsCountedInGPA
);

// ===== GRADES =====
public record GradeItemRequest(
    int SubjectId,
    [MaxLength(50)] string? Category,
    [Required, MaxLength(100)] string Name,
    double Weight,
    double? Value,
    [MaxLength(20)] string? Condition
);

public record GradeItemResponse(
    int Id,
    int SubjectId,
    string? Category,
    string Name,
    double Weight,
    double? Value,
    string? Condition
);

// ===== SYNC =====
public record SyncTranscriptRequest(
    List<SubjectSyncDto> Subjects
);

public record SubjectSyncDto(
    string Name,
    string? NameEn,
    string? Code,
    int? Credits,
    string? Semester,
    string? LetterGrade,
    string ColorHex,
    double PassThreshold,
    bool IsCountedInGPA,
    List<GradeItemSyncDto> GradeItems
);

public record GradeItemSyncDto(
    string? Category,
    string Name,
    double Weight,
    double? Value,
    string? Condition
);
