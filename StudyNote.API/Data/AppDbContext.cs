using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using StudyNote.API.Entities;

namespace StudyNote.API.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<SubjectNote> SubjectNotes => Set<SubjectNote>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<ChecklistDay> ChecklistDays => Set<ChecklistDay>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Mỗi user chỉ có 1 ChecklistDay per date
        builder.Entity<ChecklistDay>()
            .HasIndex(x => new { x.UserId, x.Date })
            .IsUnique();

        // Xóa Subject thì cascade xóa Notes và Assignments
        builder.Entity<Subject>()
            .HasMany(s => s.Notes)
            .WithOne(n => n.Subject)
            .HasForeignKey(n => n.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Subject>()
            .HasMany(s => s.Assignments)
            .WithOne(a => a.Subject)
            .HasForeignKey(a => a.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Xóa ChecklistDay thì cascade xóa Items
        builder.Entity<ChecklistDay>()
            .HasMany(d => d.Items)
            .WithOne(i => i.ChecklistDay)
            .HasForeignKey(i => i.ChecklistDayId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
