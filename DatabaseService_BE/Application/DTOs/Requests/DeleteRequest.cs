using System;

namespace Application.DTOs.Requests;

public class DeleteRequest
{
    public string TableName { get; set; } = string.Empty;
    public Dictionary<string, object?> Where { get; set; } = new();
    
}
