using Application.DTOs.Requests;
using Application.DTOs.Responses;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using System.Text.Json;

namespace Application.Services;

public class DataService
{
    private readonly string _adminConnectionString;
    private readonly ILogger<DataService> _logger;
    private readonly IProvisionedDatabaseRepository _repository;

    public DataService(
        IConfiguration configuration,
        ILogger<DataService> logger,
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

    public async Task<TableDataResponse> GetTableDataAsync(int userId, int databaseId, string tableName, int page = 1, int pageSize = 100)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);
        var offset = (page - 1) * pageSize;

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(tableName);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT * FROM `{safeTableName}` LIMIT @limit OFFSET @offset;";
        cmd.Parameters.AddWithValue("@limit", pageSize);
        cmd.Parameters.AddWithValue("@offset", offset);

        return await ExecuteQueryAsync(cmd);
    }

    public async Task<int> InsertDataAsync(int userId, int databaseId, InsertRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");
        if (request.Data.Count == 0)
            throw new InvalidOperationException("Không có dữ liệu để thêm");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(request.TableName);
        var columns = string.Join(", ", request.Data.Keys.Select(EscapeIdentifier).Select(c => $"`{c}`"));
        var values = string.Join(", ", request.Data.Keys.Select((_, i) => $"@p{i}"));

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"INSERT INTO `{safeTableName}` ({columns}) VALUES ({values});";

        int idx = 0;
        foreach (var value in request.Data.Values)
        {
            cmd.Parameters.AddWithValue($"@p{idx++}", ConvertToMySqlValue(value));
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> UpdateDataAsync(int userId, int databaseId, UpdateRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");
        if (request.Data.Count == 0)
            throw new InvalidOperationException("Không có dữ liệu để cập nhật");
        if (request.Where.Count == 0)
            throw new InvalidOperationException("Phải có điều kiện WHERE để cập nhật");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(request.TableName);
        var setClause = string.Join(", ", request.Data.Keys.Select((col, i) => $"`{EscapeIdentifier(col)}` = @set{i}"));
        var whereClause = string.Join(" AND ", request.Where.Keys.Select((col, i) => $"`{EscapeIdentifier(col)}` = @where{i}"));

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"UPDATE `{safeTableName}` SET {setClause} WHERE {whereClause};";

        int idx = 0;
        foreach (var value in request.Data.Values)
        {
            cmd.Parameters.AddWithValue($"@set{idx++}", ConvertToMySqlValue(value));
        }

        idx = 0;
        foreach (var value in request.Where.Values)
        {
            cmd.Parameters.AddWithValue($"@where{idx++}", ConvertToMySqlValue(value));
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> DeleteDataAsync(int userId, int databaseId, DeleteRequest request)
    {
        var connString = await GetUserConnectionStringAsync(userId, databaseId);
        if (connString == null)
            throw new InvalidOperationException("Database không tồn tại hoặc không có quyền truy cập");
        if (request.Where.Count == 0)
            throw new InvalidOperationException("Phải có điều kiện WHERE để xóa");

        await using var conn = new MySqlConnection(connString);
        await conn.OpenAsync();

        var safeTableName = EscapeIdentifier(request.TableName);
        var whereClause = string.Join(" AND ", request.Where.Keys.Select((col, i) => $"`{EscapeIdentifier(col)}` = @where{i}"));

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DELETE FROM `{safeTableName}` WHERE {whereClause};";

        int idx = 0;
        foreach (var value in request.Where.Values)
        {
            cmd.Parameters.AddWithValue($"@where{idx++}", ConvertToMySqlValue(value));
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<TableDataResponse> ExecuteQueryAsync(MySqlCommand cmd)
    {
        var response = new TableDataResponse();

        await using var reader = await cmd.ExecuteReaderAsync();
        if (reader.HasRows)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                response.Columns.Add(reader.GetName(i));
            }

            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var columnName = reader.GetName(i);
                    row[columnName] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                }
                response.Rows.Add(row);
            }
        }

        response.RowCount = response.Rows.Count;
        return response;
    }

    private static string EscapeIdentifier(string identifier)
    {
        return identifier.Replace("`", "``");
    }

    // Helper method to convert JsonElement or any object to appropriate value for MySQL
    private static object? ConvertToMySqlValue(object? value)
    {
        if (value == null) return DBNull.Value;

        // Handle JsonElement from ASP.NET Core deserialization
        if (value is JsonElement jsonElement)
        {
            return jsonElement.ValueKind switch
            {
                JsonValueKind.String => jsonElement.GetString(),
                JsonValueKind.Number => jsonElement.TryGetInt64(out var longVal) ? longVal : jsonElement.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => DBNull.Value,
                _ => jsonElement.ToString()
            };
        }

        return value;
    }
}
