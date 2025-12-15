using System;

namespace Application.DTOs.Requests;

public class InsertRequest
{
    public string TableName { get; set; } = string.Empty;
    public Dictionary<string, object?> Data { get; set;} = new();
}
