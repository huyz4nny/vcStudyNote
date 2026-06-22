using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public class CurriculumSubject
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    public int? Credits { get; set; }

    public int TermNo { get; set; } = 1;

    [MaxLength(7)]
    public string ColorHex { get; set; } = "#3B82F6";

    public double PassThreshold { get; set; } = 5.0;

    public bool IsCountedInGPA { get; set; } = true;

    // Navigation
    public AppUser User { get; set; } = null!;
}
