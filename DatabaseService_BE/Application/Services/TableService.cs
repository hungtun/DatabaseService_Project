using Application.DTOs.Requests;
using Application.DTOs.Responses;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace Application.Services;

public class TableService
{
    private readonly string _adminConnectionString;
    private readonly ILogger<TableService> _logger;
    private readonly IProvisionedDatabaseRepository _repository;

    public TableService(
        IConfiguration configuration,
        ILogger<TableService> logger,
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

    public async Task<List<TableInfoResponse>> GetTablesAsync(int userId, int databaseId)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        var result = new List<TableInfoResponse>();

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SHOW TABLES;";
        await using var reader = await cmd.ExecuteReaderAsync();

        var tableNames = new List<string>();
        while (await reader.ReadAsync())
        {
            tableNames.Add(reader.GetString(0));
        }
        await reader.CloseAsync();

        foreach (var tableName in tableNames)
        {
            await using var countCmd = conn.CreateCommand();
            countCmd.CommandText = $"SELECT COUNT(*) FROM `{EscapeIdentifier(tableName)}`;";
            var count = Convert.ToInt64(await countCmd.ExecuteScalarAsync());

            result.Add(new TableInfoResponse
            {
                TableName = tableName,
                RowCount = count
            });
        }

        return result;
    }

    public async Task<bool> CreateTableAsync(int userId, int databaseId, CreateTableRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        if (request.Columns.Count == 0)
            throw new InvalidOperationException("Table phải có ít nhất 1 cột");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(request.TableName);
        var columnDefinitions = new List<string>();

        foreach (var col in request.Columns)
        {
            var colDef = $"`{EscapeIdentifier(col.Name)}` {col.DataType}";
            if (!col.IsNullable) colDef += " NOT NULL";
            if (col.IsAutoIncrement) colDef += " AUTO_INCREMENT";
            if (!string.IsNullOrWhiteSpace(col.DefaultValue))
                colDef += $" DEFAULT {col.DefaultValue}";
            columnDefinitions.Add(colDef);
        }

        var primaryKeys = request.Columns
            .Where(c => c.IsPrimaryKey)
            .Select(c => $"`{EscapeIdentifier(c.Name)}`")
            .ToList();

        var sql = $"CREATE TABLE `{safeTableName}` ({string.Join(", ", columnDefinitions)}";
        if (primaryKeys.Any())
        {
            sql += $", PRIMARY KEY ({string.Join(", ", primaryKeys)})";
        }
        sql += ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();

        return true;
    }

    public async Task<bool> DropTableAsync(int userId, int databaseId, string tableName)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(tableName);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DROP TABLE IF EXISTS `{safeTableName}`;";
        await cmd.ExecuteNonQueryAsync();

        return true;
    }

    internal static string EscapeIdentifier(string identifier)
    {
        return identifier.Replace("`", "``");
    }
}

