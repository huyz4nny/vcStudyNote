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
public class NotesController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotesController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/notes?subjectId=&tag=&q=&pinned=
    [HttpGet]
    public async Task<ActionResult<List<NoteResponse>>> GetAll(
        [FromQuery] int? subjectId,
        [FromQuery] string? tag,
        [FromQuery] string? q,
        [FromQuery] bool? pinned)
    {
        var query = _db.SubjectNotes
            .Include(n => n.Subject)
            .Where(n => n.Subject.UserId == UserId);

        if (subjectId.HasValue)
            query = query.Where(n => n.SubjectId == subjectId.Value);

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(n => n.Tag == tag);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(n => n.Title.Contains(q) || (n.Content != null && n.Content.Contains(q)));

        if (pinned.HasValue)
            query = query.Where(n => n.IsPinned == pinned.Value);

        var notes = await query
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.UpdatedAt)
            .Select(n => MapToResponse(n))
            .ToListAsync();

        return Ok(notes);
    }

    // GET /api/notes/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<NoteResponse>> GetById(int id)
    {
        var note = await _db.SubjectNotes
            .Include(n => n.Subject)
            .FirstOrDefaultAsync(n => n.Id == id && n.Subject.UserId == UserId);

        if (note == null) return NotFound();
        return Ok(MapToResponse(note));
    }

    // POST /api/notes
    [HttpPost]
    public async Task<ActionResult<NoteResponse>> Create([FromBody] NoteRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Kiểm tra subject thuộc về user này
        var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == req.SubjectId && s.UserId == UserId);
        if (subject == null) return BadRequest(new { message = "Môn học không tồn tại hoặc không có quyền." });

        var note = new SubjectNote
        {
            SubjectId = req.SubjectId,
            Title = req.Title,
            Content = req.Content,
            Tag = req.Tag
        };

        _db.SubjectNotes.Add(note);
        await _db.SaveChangesAsync();

        // Reload với Subject để map response
        await _db.Entry(note).Reference(n => n.Subject).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = note.Id }, MapToResponse(note));
    }

    // PUT /api/notes/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] NoteRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var note = await _db.SubjectNotes
            .Include(n => n.Subject)
            .FirstOrDefaultAsync(n => n.Id == id && n.Subject.UserId == UserId);

        if (note == null) return NotFound();

        // Kiểm tra subject mới (nếu đổi môn)
        if (note.SubjectId != req.SubjectId)
        {
            var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == req.SubjectId && s.UserId == UserId);
            if (subject == null) return BadRequest(new { message = "Môn học không tồn tại." });
            note.SubjectId = req.SubjectId;
        }

        note.Title = req.Title;
        note.Content = req.Content;
        note.Tag = req.Tag;
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH /api/notes/{id}/pin — Toggle ghim
    [HttpPatch("{id}/pin")]
    public async Task<IActionResult> TogglePin(int id)
    {
        var note = await _db.SubjectNotes
            .Include(n => n.Subject)
            .FirstOrDefaultAsync(n => n.Id == id && n.Subject.UserId == UserId);

        if (note == null) return NotFound();

        note.IsPinned = !note.IsPinned;
        note.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { isPinned = note.IsPinned });
    }

    // DELETE /api/notes/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var note = await _db.SubjectNotes
            .Include(n => n.Subject)
            .FirstOrDefaultAsync(n => n.Id == id && n.Subject.UserId == UserId);

        if (note == null) return NotFound();

        _db.SubjectNotes.Remove(note);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Mapper helper ────────────────────────────────────────────────────────
    private static NoteResponse MapToResponse(SubjectNote n) => new(
        n.Id, n.SubjectId,
        n.Subject.Name, n.Subject.ColorHex,
        n.Title, n.Content, n.Tag,
        n.IsPinned, n.CreatedAt, n.UpdatedAt
    );
}
