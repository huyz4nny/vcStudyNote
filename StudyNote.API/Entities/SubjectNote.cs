using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public class SubjectNote
{
    public int Id { get; set; }
    public int SubjectId { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    [MaxLength(50)]
    public string? Tag { get; set; } // "luu-y" | "ly-thuyet" | "de-cuong" | "khac"

    public bool IsPinned { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Subject Subject { get; set; } = null!;
}
