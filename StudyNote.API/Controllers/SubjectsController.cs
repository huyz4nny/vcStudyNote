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
public class SubjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SubjectsController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/subjects
    [HttpGet]
    public async Task<ActionResult<List<SubjectResponse>>> GetAll()
    {
        var subjects = await _db.Subjects
            .Include(s => s.GradeItems)
            .Where(s => s.UserId == UserId)
            .OrderByDescending(s => s.IsActive)
            .ThenBy(s => s.Name)
            .Select(s => new SubjectResponse(
                s.Id, s.Name, s.Code, s.Lecturer, s.Credits,
                s.ColorHex, s.Semester, s.IsActive, s.CreatedAt,
                s.LetterGrade, s.PassThreshold, s.IsCountedInGPA,
                s.Notes.Count,
                s.Assignments.Count(a => a.Status != AssignmentStatus.Done),
                s.StatusOverride,
                s.GradeItems.Select(g => new GradeItemResponse(g.Id, g.SubjectId, g.Category, g.Name, g.Weight, g.Value, g.Condition)).ToList()
            ))
            .ToListAsync();

        return Ok(subjects);
    }

    // GET /api/subjects/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<SubjectResponse>> GetById(int id)
    {
        var s = await _db.Subjects
            .Include(s => s.Notes)
            .Include(s => s.Assignments)
            .Include(s => s.GradeItems)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);

        if (s == null) return NotFound();

        return Ok(new SubjectResponse(
            s.Id, s.Name, s.Code, s.Lecturer, s.Credits,
            s.ColorHex, s.Semester, s.IsActive, s.CreatedAt,
            s.LetterGrade, s.PassThreshold, s.IsCountedInGPA,
            s.Notes.Count,
            s.Assignments.Count(a => a.Status != AssignmentStatus.Done),
            s.StatusOverride,
            s.GradeItems.Select(g => new GradeItemResponse(g.Id, g.SubjectId, g.Category, g.Name, g.Weight, g.Value, g.Condition)).ToList()
        ));
    }

    // POST /api/subjects
    [HttpPost]
    public async Task<ActionResult<SubjectResponse>> Create([FromBody] SubjectRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var subject = new Subject
        {
            UserId = UserId,
            Name = req.Name,
            Code = req.Code,
            Lecturer = req.Lecturer,
            Credits = req.Credits,
            ColorHex = req.ColorHex,
            Semester = req.Semester,
            IsActive = req.IsActive,
            LetterGrade = req.LetterGrade,
            PassThreshold = req.PassThreshold,
            IsCountedInGPA = req.IsCountedInGPA,
            StatusOverride = req.StatusOverride
        };

        _db.Subjects.Add(subject);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = subject.Id },
            new SubjectResponse(subject.Id, subject.Name, subject.Code, subject.Lecturer,
                subject.Credits, subject.ColorHex, subject.Semester, subject.IsActive,
                subject.CreatedAt, subject.LetterGrade, subject.PassThreshold, subject.IsCountedInGPA, 0, 0, subject.StatusOverride, new List<GradeItemResponse>()));
    }

    // PUT /api/subjects/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] SubjectRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (subject == null) return NotFound();

        subject.Name = req.Name;
        subject.Code = req.Code;
        subject.Lecturer = req.Lecturer;
        subject.Credits = req.Credits;
        subject.ColorHex = req.ColorHex;
        subject.Semester = req.Semester;
        subject.IsActive = req.IsActive;
        subject.LetterGrade = req.LetterGrade;
        subject.PassThreshold = req.PassThreshold;
        subject.IsCountedInGPA = req.IsCountedInGPA;
        subject.StatusOverride = req.StatusOverride;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/subjects/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (subject == null) return NotFound();

        _db.Subjects.Remove(subject);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/subjects/sync-transcript
    [HttpPost("sync-transcript")]
    public async Task<IActionResult> SyncTranscript([FromBody] SyncTranscriptRequest req)
    {
        // Delete old subjects
        var oldSubjects = await _db.Subjects.Where(s => s.UserId == UserId).ToListAsync();
        _db.Subjects.RemoveRange(oldSubjects);

        // Add new subjects and grades
        foreach (var sDto in req.Subjects)
        {
            var subj = new Subject
            {
                UserId = UserId,
                Name = string.IsNullOrEmpty(sDto.Name) ? (sDto.NameEn ?? "Unknown") : sDto.Name,
                Code = sDto.Code,
                Credits = sDto.Credits,
                Semester = sDto.Semester,
                LetterGrade = sDto.LetterGrade,
                ColorHex = sDto.ColorHex ?? "#3B82F6",
                PassThreshold = sDto.PassThreshold,
                IsCountedInGPA = sDto.IsCountedInGPA
            };
            
            if (sDto.GradeItems != null)
            {
                foreach (var gDto in sDto.GradeItems)
                {
                    subj.GradeItems.Add(new GradeItem
                    {
                        Category = gDto.Category,
                        Name = gDto.Name,
                        Weight = gDto.Weight,
                        Value = gDto.Value,
                        Condition = gDto.Condition
                    });
                }
            }
            _db.Subjects.Add(subj);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Sync complete" });
    }
}
