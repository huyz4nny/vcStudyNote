using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace StudyNote.API.Entities;

public class AppUser : IdentityUser
{
    [MaxLength(100)]
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
    public ICollection<ChecklistDay> ChecklistDays { get; set; } = new List<ChecklistDay>();
}
