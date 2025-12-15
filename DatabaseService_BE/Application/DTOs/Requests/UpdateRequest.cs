using System;

namespace Application.DTOs.Requests;

public class UpdateRequest
{
    public string TableName { get; set; } = string.Empty;
    public Dictionary<string, object?> Data { get; set; } = new();
    public Dictionary<string, object?> Where { get; set; } = new();

}
