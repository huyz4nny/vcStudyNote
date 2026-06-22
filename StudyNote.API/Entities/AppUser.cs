using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace StudyNote.API.Entities;

public class AppUser : IdentityUser
{
    [MaxLength(100)]
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // User preferences (JSON)
    public string? PreferencesJson { get; set; }

    // Navigation
    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
    public ICollection<ChecklistDay> ChecklistDays { get; set; } = new List<ChecklistDay>();
    public ICollection<CurriculumSubject> CurriculumSubjects { get; set; } = new List<CurriculumSubject>();
}
