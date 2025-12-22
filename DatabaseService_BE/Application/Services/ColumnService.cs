using Application.DTOs.Requests;
using Application.DTOs.Responses;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace Application.Services;

public class ColumnService
{
    private readonly string _adminConnectionString;
    private readonly ILogger<ColumnService> _logger;
    private readonly IProvisionedDatabaseRepository _repository;

    public ColumnService(
        IConfiguration configuration,
        ILogger<ColumnService> logger,
        IProvisionedDatabaseRepository repository)
    {
        _adminConnectionString = configuration.GetConnectionString("AdminConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:AdminConnection is missing.");
        _logger = logger;
        _repository = repository;
    }

    private async Task<string?> GetUserConnectionStringAsync(int userId, int databaseId)
    {
        var db = await _repository.GetByIdAsync(databaseId, userId);
        if (db == null) return null;

        var user = await _repository.GetUserAsync(userId);
        if (user == null || string.IsNullOrWhiteSpace(user.DbUsername)) return null;

        var adminBuilder = new MySqlConnectionStringBuilder(_adminConnectionString);
        return new MySqlConnectionStringBuilder
        {
            Server = adminBuilder.Server,
            Port = adminBuilder.Port,
            Database = db.DatabaseName,
            UserID = user.DbUsername,
            Password = user.DbPassword,
            CharacterSet = adminBuilder.CharacterSet,
            AllowUserVariables = adminBuilder.AllowUserVariables,
            SslMode = adminBuilder.SslMode,
            TreatTinyAsBoolean = adminBuilder.TreatTinyAsBoolean
        }.ConnectionString;
    }

    public async Task<List<ColumnInfoResponse>> GetColumnsAsync(int userId, int databaseId, string tableName)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = TableService.EscapeIdentifier(tableName);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_KEY,
                EXTRA,
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION;";
        cmd.Parameters.AddWithValue("@tableName", tableName);

        var columns = new List<ColumnInfoResponse>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            columns.Add(new ColumnInfoResponse
            {
                ColumnName = reader.GetString(0),
                DataType = reader.GetString(1),
                IsNullable = reader.GetString(2) == "YES",
                IsPrimaryKey = reader.GetString(3) == "PRI",
                IsAutoIncrement = !reader.IsDBNull(4) && reader.GetString(4).Contains("auto_increment", StringComparison.OrdinalIgnoreCase),
                DefaultValue = reader.IsDBNull(5) ? null : reader.GetString(5),
                MaxLength = reader.IsDBNull(6) ? null : reader.GetInt32(6)
            });
        }

        return columns;
    }

    public async Task<bool> AddColumnAsync(int userId, int databaseId, string tableName, AddColumnRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = TableService.EscapeIdentifier(tableName);
        var safeColumnName = TableService.EscapeIdentifier(request.Name);
        var colDef = $"`{safeColumnName}` {request.DataType}";
        if (!request.IsNullable) colDef += " NOT NULL";
        if (!string.IsNullOrWhiteSpace(request.DefaultValue))
            colDef += $" DEFAULT {request.DefaultValue}";

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"ALTER TABLE `{safeTableName}` ADD COLUMN {colDef};";
        await cmd.ExecuteNonQueryAsync();

        return true;
    }

    public async Task<bool> ModifyColumnAsync(int userId, int databaseId, string tableName, ModifyColumnRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = TableService.EscapeIdentifier(tableName);
        var safeColumnName = TableService.EscapeIdentifier(request.Name);
        var colDef = $"`{safeColumnName}` {request.DataType}";
        if (!request.IsNullable) colDef += " NOT NULL";
        if (!string.IsNullOrWhiteSpace(request.DefaultValue))
            colDef += $" DEFAULT {request.DefaultValue}";

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"ALTER TABLE `{safeTableName}` MODIFY COLUMN {colDef};";
        await cmd.ExecuteNonQueryAsync();

        return true;
    }

    public async Task<bool> DropColumnAsync(int userId, int databaseId, string tableName, string columnName)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = TableService.EscapeIdentifier(tableName);
        var safeColumnName = TableService.EscapeIdentifier(columnName);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"ALTER TABLE `{safeTableName}` DROP COLUMN `{safeColumnName}`;";
        await cmd.ExecuteNonQueryAsync();

        return true;
    }
}

