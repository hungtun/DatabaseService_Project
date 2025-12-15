using System;

namespace Application.DTOs.Responses;

public class ColumnInfoResponse
{
    public string ColumnName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsNullable { get; set; } 
    public bool IsPrimaryKey { get; set;}
    public string? DefaultValue { get; set; }
    public int? MaxLength { get; set;}
}