using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public class Subject
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [MaxLength(100)]
    public string? Lecturer { get; set; }

    public int? Credits { get; set; }

    [MaxLength(7)]
    public string ColorHex { get; set; } = "#3B82F6";

    [MaxLength(20)]
    public string? Semester { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppUser User { get; set; } = null!;
    public ICollection<SubjectNote> Notes { get; set; } = new List<SubjectNote>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
