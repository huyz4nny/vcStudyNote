using System.ComponentModel.DataAnnotations;

namespace StudyNote.API.Entities;

public enum Priority { Low = 0, Medium = 1, High = 2, Urgent = 3 }
public enum AssignmentStatus { Todo = 0, InProgress = 1, Done = 2 }

public class Assignment
{
    public int Id { get; set; }
    public int SubjectId { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public DateTime? Deadline { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Todo;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Subject Subject { get; set; } = null!;

    // Computed helpers
    public bool IsOverdue => Deadline.HasValue && Deadline < DateTime.Now && Status != AssignmentStatus.Done;
    public bool IsNearDeadline => Deadline.HasValue && Deadline > DateTime.Now
                                  && (Deadline - DateTime.Now)?.TotalDays <= 2
                                  && Status != AssignmentStatus.Done;
}
