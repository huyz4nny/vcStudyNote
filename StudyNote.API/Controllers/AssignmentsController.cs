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
public class AssignmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssignmentsController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/assignments?subjectId=&status=&priority=
    [HttpGet]
    public async Task<ActionResult<List<AssignmentResponse>>> GetAll(
        [FromQuery] int? subjectId,
        [FromQuery] int? status,
        [FromQuery] int? priority)
    {
        var query = _db.Assignments
            .Include(a => a.Subject)
            .Where(a => a.Subject.UserId == UserId);

        if (subjectId.HasValue) query = query.Where(a => a.SubjectId == subjectId.Value);
        if (status.HasValue) query = query.Where(a => (int)a.Status == status.Value);
        if (priority.HasValue) query = query.Where(a => (int)a.Priority == priority.Value);

        var result = await query
            .OrderBy(a => a.Deadline)
            .ThenByDescending(a => a.Priority)
            .ToListAsync();

        return Ok(result.Select(MapToResponse).ToList());
    }

    // GET /api/assignments/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<AssignmentResponse>> GetById(int id)
    {
        var a = await _db.Assignments
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.Id == id && a.Subject.UserId == UserId);

        if (a == null) return NotFound();
        return Ok(MapToResponse(a));
    }

    // GET /api/assignments/upcoming — 5 deadline gần nhất (cho Dashboard)
    [HttpGet("upcoming")]
    public async Task<ActionResult<List<AssignmentResponse>>> Upcoming([FromQuery] int count = 5)
    {
        var now = DateTime.Now;
        var result = await _db.Assignments
            .Include(a => a.Subject)
            .Where(a => a.Subject.UserId == UserId
                     && a.Status != AssignmentStatus.Done
                     && a.Deadline >= now)
            .OrderBy(a => a.Deadline)
            .Take(count)
            .ToListAsync();

        return Ok(result.Select(MapToResponse).ToList());
    }

    // POST /api/assignments
    [HttpPost]
    public async Task<ActionResult<AssignmentResponse>> Create([FromBody] AssignmentRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == req.SubjectId && s.UserId == UserId);
        if (subject == null) return BadRequest(new { message = "Môn học không tồn tại." });

        var a = new Assignment
        {
            SubjectId = req.SubjectId,
            Title = req.Title,
            Description = req.Description,
            Deadline = req.Deadline,
            Priority = (Priority)req.Priority,
            Status = (AssignmentStatus)req.Status
        };

        _db.Assignments.Add(a);
        await _db.SaveChangesAsync();

        await _db.Entry(a).Reference(x => x.Subject).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = a.Id }, MapToResponse(a));
    }

    // PUT /api/assignments/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AssignmentRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var a = await _db.Assignments
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.Id == id && a.Subject.UserId == UserId);

        if (a == null) return NotFound();

        a.Title = req.Title;
        a.Description = req.Description;
        a.Deadline = req.Deadline;
        a.Priority = (Priority)req.Priority;
        a.Status = (AssignmentStatus)req.Status;
        a.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH /api/assignments/{id}/status — Cập nhật trạng thái nhanh
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] AssignmentStatusRequest req)
    {
        var a = await _db.Assignments
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.Id == id && a.Subject.UserId == UserId);

        if (a == null) return NotFound();

        a.Status = (AssignmentStatus)req.Status;
        a.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { status = a.Status, updatedAt = a.UpdatedAt });
    }

    // DELETE /api/assignments/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await _db.Assignments
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.Id == id && a.Subject.UserId == UserId);

        if (a == null) return NotFound();

        _db.Assignments.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Mapper ───────────────────────────────────────────────────────────────
    private static AssignmentResponse MapToResponse(Assignment a) => new(
        a.Id, a.SubjectId,
        a.Subject.Name, a.Subject.ColorHex,
        a.Title, a.Description, a.Deadline,
        (int)a.Priority, (int)a.Status,
        a.IsOverdue, a.IsNearDeadline,
        a.CreatedAt, a.UpdatedAt
    );
}
