using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyNote.API.Data;
using StudyNote.API.DTOs;
using StudyNote.API.Entities;

namespace StudyNote.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GradesController : ControllerBase
{
    private readonly AppDbContext _db;

    public GradesController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // POST /api/grades
    [HttpPost]
    public async Task<ActionResult<GradeItemResponse>> Create([FromBody] GradeItemRequest req)
    {
        // Verify Subject belongs to User
        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == req.SubjectId && s.UserId == UserId);
        if (subject == null) return NotFound("Subject not found or access denied.");

        var grade = new GradeItem
        {
            SubjectId = req.SubjectId,
            Category = req.Category,
            Name = req.Name,
            Weight = req.Weight,
            Value = req.Value,
            Condition = req.Condition
        };

        _db.GradeItems.Add(grade);
        await _db.SaveChangesAsync();

        return Ok(new GradeItemResponse(grade.Id, grade.SubjectId, grade.Category, grade.Name, grade.Weight, grade.Value, grade.Condition));
    }

    // PUT /api/grades/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] GradeItemRequest req)
    {
        var grade = await _db.GradeItems
            .Include(g => g.Subject)
            .FirstOrDefaultAsync(g => g.Id == id && g.Subject.UserId == UserId);

        if (grade == null) return NotFound();

        grade.Category = req.Category;
        grade.Name = req.Name;
        grade.Weight = req.Weight;
        grade.Value = req.Value;
        grade.Condition = req.Condition;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/grades/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var grade = await _db.GradeItems
            .Include(g => g.Subject)
            .FirstOrDefaultAsync(g => g.Id == id && g.Subject.UserId == UserId);

        if (grade == null) return NotFound();

        _db.GradeItems.Remove(grade);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/grades/sync/{subjectId}
    [HttpPost("sync/{subjectId}")]
    public async Task<IActionResult> Sync(int subjectId, [FromBody] List<GradeItemRequest> reqs)
    {
        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == subjectId && s.UserId == UserId);
        if (subject == null) return NotFound("Subject not found or access denied.");

        var oldGrades = await _db.GradeItems.Where(g => g.SubjectId == subjectId).ToListAsync();
        _db.GradeItems.RemoveRange(oldGrades);

        foreach (var req in reqs)
        {
            _db.GradeItems.Add(new GradeItem
            {
                SubjectId = subjectId,
                Category = req.Category,
                Name = req.Name,
                Weight = req.Weight,
                Value = req.Value,
                Condition = req.Condition
            });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
