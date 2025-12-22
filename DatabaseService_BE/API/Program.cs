using System.Text;
using Application.Services;
using Application.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Persistence.EF;
using Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// OpenAPI/Swagger cho .NET 8
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
builder.Services.AddScoped<Domain.Interfaces.IUserRepository, UserRepository>();
builder.Services.AddScoped<Domain.Interfaces.IProvisionedDatabaseRepository, ProvisionedDatabaseRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProvisionService>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddScoped<DataService>();
builder.Services.AddScoped<TableService>();
builder.Services.AddScoped<ColumnService>();

// CORS configuration for frontend
var allowedOrigins = new List<string>
{
    "http://localhost:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
};

// Lấy PublicIp từ appsettings (appsettings.json / appsettings.Development.json)
var publicIp = builder.Configuration["PublicIp"];

if (!string.IsNullOrWhiteSpace(publicIp))
{
    allowedOrigins.Add($"http://{publicIp}:5500");
    allowedOrigins.Add($"http://{publicIp}:5003");
}


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Cho phép localhost, private IPs trong VPC (10.0.x.x), và public IPs
        // Không cần cập nhật lại khi Public IP thay đổi
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin))
                return false;

            var uri = new Uri(origin);
            var host = uri.Host;

            // Cho phép localhost
            if (host == "localhost" || host == "127.0.0.1")
                return true;

            // Cho phép private IPs trong VPC (10.0.0.0/16)
            if (host.StartsWith("10.0."))
                return true;

            // Cho phép public IPs (bất kỳ IP nào)
            // Có thể giới hạn lại nếu cần bảo mật hơn
            if (System.Net.IPAddress.TryParse(host, out _))
                return true;

            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});



var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var key = Encoding.UTF8.GetBytes(jwtOptions.Secret);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

var app = builder.Build();

// Auto migrate database on startup to create tables
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("Checking database connection and applying migrations...");

        // Test connection first
        if (context.Database.CanConnect())
        {
            logger.LogInformation("Database connection successful.");

            // Get pending migrations
            var pendingMigrations = context.Database.GetPendingMigrations().ToList();
            if (pendingMigrations.Any())
            {
                logger.LogInformation($"Found {pendingMigrations.Count} pending migration(s). Applying migrations to create tables...");
                foreach (var migration in pendingMigrations)
                {
                    logger.LogInformation($"  - {migration}");
                }
                context.Database.Migrate();
                logger.LogInformation("Database migrations applied successfully. Tables created.");
            }
            else
            {
                logger.LogInformation("Database is up to date. No pending migrations.");
            }
        }
        else
        {
            logger.LogError("Cannot connect to database. Please check your connection string and ensure MySQL server is running.");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
        logger.LogError($"Connection string: {connectionString?.Replace("Password=", "Password=***")}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// CORS must be before Authentication and Authorization
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
