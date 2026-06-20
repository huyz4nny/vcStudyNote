using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using StudyNote.API.DTOs;
using StudyNote.API.Entities;

namespace StudyNote.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = new AppUser
        {
            UserName = req.Username,
            Email = req.Email,
            DisplayName = req.DisplayName ?? req.Username
        };

        var result = await _userManager.CreateAsync(user, req.Password);

        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "Đăng ký thành công! Hãy đăng nhập." });
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByNameAsync(req.Username);
        if (user == null)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, req.Password, false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

        var token = GenerateJwtToken(user);
        var expireMinutes = _config.GetValue<int>("Jwt:ExpireMinutes");

        return Ok(new AuthResponse(
            Token: token,
            Username: user.UserName!,
            Email: user.Email!,
            DisplayName: user.DisplayName,
            Expires: DateTime.UtcNow.AddMinutes(expireMinutes)
        ));
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        return Ok(new
        {
            user.UserName,
            user.Email,
            user.DisplayName,
            user.CreatedAt
        });
    }

    // ── Helper ───────────────────────────────────────────────────────────────
    private string GenerateJwtToken(AppUser user)
    {
        var jwtConfig = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expireMinutes = jwtConfig.GetValue<int>("ExpireMinutes");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName!),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim("displayName", user.DisplayName ?? user.UserName!)
        };

        var token = new JwtSecurityToken(
            issuer: jwtConfig["Issuer"],
            audience: jwtConfig["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
