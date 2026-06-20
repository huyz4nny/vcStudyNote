using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public class ChecklistDay
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppUser User { get; set; } = null!;
    public ICollection<ChecklistItem> Items { get; set; } = new List<ChecklistItem>();
}

public class ChecklistItem
{
    public int Id { get; set; }
    public int ChecklistDayId { get; set; }

    [Required, MaxLength(500)]
    public string Content { get; set; } = string.Empty;

    public bool IsDone { get; set; } = false;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ChecklistDay ChecklistDay { get; set; } = null!;
}
