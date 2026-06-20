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
public class ChecklistController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChecklistController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/checklist?date=2026-06-20  (default = hôm nay)
    [HttpGet]
    public async Task<ActionResult<ChecklistDayResponse>> GetByDate([FromQuery] string? date)
    {
        var targetDate = string.IsNullOrWhiteSpace(date)
            ? DateOnly.FromDateTime(DateTime.Today)
            : DateOnly.Parse(date);

        var day = await _db.ChecklistDays
            .Include(d => d.Items.OrderBy(i => i.SortOrder))
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == targetDate);

        if (day == null)
        {
            // Tự động tạo nếu chưa có
            day = new ChecklistDay { UserId = UserId, Date = targetDate };
            _db.ChecklistDays.Add(day);
            await _db.SaveChangesAsync();
        }

        return Ok(MapDayResponse(day));
    }

    // POST /api/checklist/items — Thêm task mới
    [HttpPost("items")]
    public async Task<ActionResult<ChecklistItemResponse>> AddItem([FromBody] ChecklistItemRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var targetDate = string.IsNullOrWhiteSpace(req.Date)
            ? DateOnly.FromDateTime(DateTime.Today)
            : DateOnly.Parse(req.Date);

        // Lấy hoặc tạo ChecklistDay
        var day = await _db.ChecklistDays
            .Include(d => d.Items)
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == targetDate);

        if (day == null)
        {
            day = new ChecklistDay { UserId = UserId, Date = targetDate };
            _db.ChecklistDays.Add(day);
            await _db.SaveChangesAsync();
        }

        var maxOrder = day.Items.Any() ? day.Items.Max(i => i.SortOrder) : -1;
        var item = new ChecklistItem
        {
            ChecklistDayId = day.Id,
            Content = req.Content,
            SortOrder = maxOrder + 1
        };

        _db.ChecklistItems.Add(item);
        await _db.SaveChangesAsync();

        return CreatedAtAction(null, MapItemResponse(item));
    }

    // PATCH /api/checklist/items/{id}/toggle — Check/uncheck task
    [HttpPatch("items/{id}/toggle")]
    public async Task<IActionResult> ToggleItem(int id)
    {
        var item = await GetOwnedItem(id);
        if (item == null) return NotFound();

        item.IsDone = !item.IsDone;
        await _db.SaveChangesAsync();

        return Ok(new { id = item.Id, isDone = item.IsDone });
    }

    // PUT /api/checklist/items/{id} — Sửa nội dung task
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] ChecklistItemRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var item = await GetOwnedItem(id);
        if (item == null) return NotFound();

        item.Content = req.Content;
        await _db.SaveChangesAsync();

        return Ok(MapItemResponse(item));
    }

    // DELETE /api/checklist/items/{id} — Xóa task
    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var item = await GetOwnedItem(id);
        if (item == null) return NotFound();

        _db.ChecklistItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/checklist/reorder — Sắp xếp lại thứ tự
    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderRequest req)
    {
        // Lấy tất cả items của user theo danh sách id
        var items = await _db.ChecklistItems
            .Include(i => i.ChecklistDay)
            .Where(i => req.ItemIds.Contains(i.Id) && i.ChecklistDay.UserId == UserId)
            .ToListAsync();

        for (int i = 0; i < req.ItemIds.Count; i++)
        {
            var item = items.FirstOrDefault(x => x.Id == req.ItemIds[i]);
            if (item != null) item.SortOrder = i;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/checklist/copy-yesterday — Copy task chưa xong từ hôm qua
    [HttpPost("copy-yesterday")]
    public async Task<ActionResult<ChecklistDayResponse>> CopyYesterday()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var yesterday = today.AddDays(-1);

        var yesterdayDay = await _db.ChecklistDays
            .Include(d => d.Items)
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == yesterday);

        if (yesterdayDay == null)
            return BadRequest(new { message = "Không có dữ liệu checklist hôm qua." });

        var unfinished = yesterdayDay.Items.Where(i => !i.IsDone).ToList();
        if (!unfinished.Any())
            return BadRequest(new { message = "Hôm qua bạn đã hoàn thành tất cả task rồi! 🎉" });

        // Lấy hoặc tạo checklist hôm nay
        var today_day = await _db.ChecklistDays
            .Include(d => d.Items)
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == today);

        if (today_day == null)
        {
            today_day = new ChecklistDay { UserId = UserId, Date = today };
            _db.ChecklistDays.Add(today_day);
            await _db.SaveChangesAsync();
        }

        var maxOrder = today_day.Items.Any() ? today_day.Items.Max(i => i.SortOrder) : -1;

        foreach (var oldItem in unfinished)
        {
            maxOrder++;
            _db.ChecklistItems.Add(new ChecklistItem
            {
                ChecklistDayId = today_day.Id,
                Content = oldItem.Content,
                SortOrder = maxOrder
            });
        }

        await _db.SaveChangesAsync();

        // Reload và trả về checklist hôm nay
        await _db.Entry(today_day).Collection(d => d.Items).LoadAsync();
        return Ok(MapDayResponse(today_day));
    }

    // ── Dashboard helper: stats hôm nay ──────────────────────────────────────
    // GET /api/checklist/today-stats
    [HttpGet("today-stats")]
    public async Task<IActionResult> TodayStats()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var day = await _db.ChecklistDays
            .Include(d => d.Items)
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == today);

        if (day == null)
            return Ok(new { totalCount = 0, doneCount = 0, streakDate = today });

        return Ok(new
        {
            totalCount = day.Items.Count,
            doneCount = day.Items.Count(i => i.IsDone),
            streakDate = today
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────
    private async Task<ChecklistItem?> GetOwnedItem(int itemId)
    {
        return await _db.ChecklistItems
            .Include(i => i.ChecklistDay)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ChecklistDay.UserId == UserId);
    }

    private static ChecklistDayResponse MapDayResponse(ChecklistDay day) => new(
        day.Id,
        day.Date,
        day.Items.OrderBy(i => i.SortOrder).Select(MapItemResponse).ToList(),
        day.Items.Count,
        day.Items.Count(i => i.IsDone)
    );

    private static ChecklistItemResponse MapItemResponse(ChecklistItem i) => new(
        i.Id, i.Content, i.IsDone, i.SortOrder, i.CreatedAt
    );
}
