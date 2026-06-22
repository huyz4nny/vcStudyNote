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
public class CurriculumController : ControllerBase
{
    private readonly AppDbContext _db;

    public CurriculumController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/curriculum
    [HttpGet]
    public async Task<ActionResult<List<CurriculumSubjectResponse>>> GetAll()
    {
        var list = await _db.CurriculumSubjects
            .Where(c => c.UserId == UserId)
            .OrderBy(c => c.TermNo)
            .ThenBy(c => c.Name)
            .Select(c => new CurriculumSubjectResponse(
                c.Id, c.Name, c.Code, c.Credits, c.TermNo, c.ColorHex, c.PassThreshold, c.IsCountedInGPA
            ))
            .ToListAsync();
            
        return Ok(list);
    }

    // POST /api/curriculum/sync
    [HttpPost("sync")]
    public async Task<IActionResult> Sync([FromBody] List<CurriculumSubjectRequest> requests)
    {
        var oldList = await _db.CurriculumSubjects.Where(c => c.UserId == UserId).ToListAsync();
        _db.CurriculumSubjects.RemoveRange(oldList);

        foreach (var req in requests)
        {
            _db.CurriculumSubjects.Add(new CurriculumSubject
            {
                UserId = UserId,
                Name = req.Name,
                Code = req.Code,
                Credits = req.Credits,
                TermNo = req.TermNo,
                ColorHex = req.ColorHex ?? "#3B82F6",
                PassThreshold = req.PassThreshold,
                IsCountedInGPA = req.IsCountedInGPA
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Curriculum synced" });
    }
}
