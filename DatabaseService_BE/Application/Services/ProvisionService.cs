using System.Security.Cryptography;
using Application.DTOs;
using Domain.Entities;
using Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Scaffolding.Metadata;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using Persistence.EF;

namespace Application.Services;

public class ProvisionService
{
    private readonly string _adminConnectionString;
    private readonly ILogger<ProvisionService> _logger;
    private readonly AppDbContext _dbContext;
    private readonly IProvisionedDatabaseRepository _repository;

    public ProvisionService(
        IConfiguration configuration,
        ILogger<ProvisionService> logger,
        AppDbContext dbContext,
        IProvisionedDatabaseRepository repository)
    {
        _adminConnectionString = configuration.GetConnectionString("AdminConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:AdminConnection is missing.");
        _logger = logger;
        _dbContext = dbContext;
        _repository = repository;
    }

    public async Task<ProvisionResponse> ProvisionAsync(string? preferredName, int userId)
    {
        var user = await _repository.GetUserAsync(userId)
            ?? throw new InvalidOperationException("User không tồn tại");

        var existingCount = await _repository.CountByUserIdAsync(userId);
        var maxAllowed = user.MaxDatabaseLimit;

        if (existingCount >= maxAllowed)
        {
            throw new InvalidOperationException("Đã đạt giới hạn số lượng database được tạo cho tài khoản này.");
        }

        var safeDbName = BuildSafeName(preferredName, "tenant");
        var userName = user.DbUsername;
        var password = user.DbPassword;

        var needCreateUser = string.IsNullOrWhiteSpace(userName);
        if (needCreateUser)
        {
            userName = $"u_{Guid.NewGuid():N}".ToLowerInvariant()[..12];
            password = GeneratePassword();
        }

        var adminBuilder = new MySqlConnectionStringBuilder(_adminConnectionString);

        await using var conn = new MySqlConnection(adminBuilder.ConnectionString);
        await conn.OpenAsync();

        await using var tx = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            if (needCreateUser)
            {
                await CreateUser(conn, userName!, password!);
                user.DbUsername = userName;
                user.DbPassword = password;
            }

            await CreateDatabase(conn, safeDbName);
            await GrantPrivileges(conn, safeDbName, userName!);

            await _repository.AddProvisionedDatabaseAsync(new ProvisionedDatabase
            {
                UserId = userId,
                DatabaseName = safeDbName,
                CreatedAt = DateTime.UtcNow
            });
            user.CreatedDatabaseCount = existingCount + 1;
            await _repository.UpdateUserAsync(user);
            await _repository.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Provisioning failed for db {Database}", safeDbName);
            throw;
        }

        var tenantBuilder = new MySqlConnectionStringBuilder
        {
            Server = adminBuilder.Server,
            Port = adminBuilder.Port,
            Database = safeDbName,
            UserID = userName,
            Password = password,
            CharacterSet = adminBuilder.CharacterSet,
            AllowUserVariables = adminBuilder.AllowUserVariables,
            SslMode = adminBuilder.SslMode,
            TreatTinyAsBoolean = adminBuilder.TreatTinyAsBoolean
        };

        return new ProvisionResponse
        {
            DatabaseName = safeDbName,
            Username = userName!,
            Password = password!,
            ConnectionString = tenantBuilder.ConnectionString
        };
    }

    private static string BuildSafeName(string? preferred, string prefix)
    {
        var baseName = string.IsNullOrWhiteSpace(preferred) ? $"{prefix}_{Guid.NewGuid():N}" : preferred;
        var filtered = new string(baseName.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(filtered))
        {
            filtered = $"{prefix}_{Guid.NewGuid():N}";
        }
        return filtered.Length > 48 ? filtered[..48] : filtered;
    }

    private static string GeneratePassword()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));
    }

    private static async Task CreateDatabase(MySqlConnection conn, string dbName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE `{dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task CreateUser(MySqlConnection conn, string userName, string password)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE USER `{userName}`@'%' IDENTIFIED BY @pwd;";
        cmd.Parameters.AddWithValue("@pwd", password);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task GrantPrivileges(MySqlConnection conn, string dbName, string userName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"GRANT ALL PRIVILEGES ON `{dbName}`.* TO `{userName}`@'%'; FLUSH PRIVILEGES;";
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<DatabaseInfoResponse>> GetUserDatabasesAsync (int userId)
    {
        var databases = await _repository.GetByUserIdAsync(userId);

        return databases.Select(db => new DatabaseInfoResponse
        {
            Id = db.Id,
            DatabaseName = db.DatabaseName,
            CreatedAt = db.CreatedAt,
        }).ToList();
    }

    public async Task<DatabaseInfoResponse> GetDatabaseInfoAsync (int databaseId,int userId)
    {
        var database = await _repository.GetByIdAsync(databaseId, userId);
        if (database == null) return null;

        return new DatabaseInfoResponse
        {
            Id = database.Id,
            DatabaseName = database.DatabaseName,
            CreatedAt = database.CreatedAt,
        };
    }

    public async Task<bool> DeleteDatabaseAsync (int databaseId,int userId)
    {
        var db = await _repository.GetByIdAsync( databaseId, userId);
        if (db == null) return false;
        var user = await _repository.GetUserAsync(userId);
        if (user == null) return false;

        var adminBuilder = new MySqlConnectionStringBuilder(_adminConnectionString);

        await using var conn = new MySqlConnection(adminBuilder.ConnectionString);
        await conn.OpenAsync();

        await using var tx = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"DROP DATABASE IF EXISTS `{db.DatabaseName}`;";
            await cmd.ExecuteNonQueryAsync();

            await _repository.DeleteProvisionDatabasAsync(db);
            user.CreatedDatabaseCount = Math.Max(0, user.CreatedDatabaseCount-1);
            await _repository.UpdateUserAsync(user);
            await _repository.SaveChangesAsync();
            await tx.CommitAsync();

            return true;

        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Delete database failed for {Database}", db.DatabaseName);
            throw;
        }

    }

    


}

