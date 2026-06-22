using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StudyNote.API.Data;
using StudyNote.API.Entities;

var builder = WebApplication.CreateBuilder(args);

// Configure Forwarded Headers for Cloudflare proxy support
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// -- Database ----------------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (connectionString != null && connectionString.Contains("studynote.db") && !connectionString.Contains(":\\") && !connectionString.Contains("/"))
{
    var dbPath = System.IO.Path.Combine(builder.Environment.ContentRootPath, "studynote.db");
    connectionString = $"Data Source={dbPath}";
}
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// -- Identity -----------------------------------------------------------------
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireUppercase = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// -- JWT Authentication -------------------------------------------------------
var jwtConfig = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtConfig["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtConfig["Issuer"],
        ValidAudience = jwtConfig["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── Controllers & Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "StudyNote API",
        Version = "v1",
        Description = "Backend API cho ứng dụng StudyNote"
    });

    // Cho phép nhập JWT token vào Swagger để test
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập JWT token: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseForwardedHeaders();

// Auto migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ── Middleware ───────────────────────────────────────────────────────────────
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "StudyNote API v1");
    c.RoutePrefix = "swagger"; // Mở Swagger ở /swagger thay vì trang gốc
});

app.UseCors("FrontendPolicy");
app.Use(async (context, next) => {
    if (context.Request.Method == "POST") {
        Console.WriteLine("POST request to " + context.Request.Path);
        if (context.Request.Headers.TryGetValue("Authorization", out var auth)) {
            Console.WriteLine("Auth header: " + auth);
        } else {
            Console.WriteLine("Auth header MISSING");
        }
    }
    await next();
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
