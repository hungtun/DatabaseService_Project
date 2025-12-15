
namespace Application.DTOs.Responses;

public class TableInfoResponse
{
    public string TableName { get; set; } = string.Empty;
    public long RowCount { get; set; }
    public DateTime CreatedAt { get; set; }
}