using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public class GradeItem
{
    public int Id { get; set; }

    [Required]
    public int SubjectId { get; set; }

    [MaxLength(50)]
    public string? Category { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public double Weight { get; set; }

    public double? Value { get; set; }

    [MaxLength(20)]
    public string? Condition { get; set; }

    // Navigation
    public Subject Subject { get; set; } = null!;
}
