using System;

namespace Application.DTOs.Responses;

public class TableDataResponse
{
    public List<string> Columns { get; set; } = new();
    public List<Dictionary<string, object?>> Rows { get; set; } = new();
    public int RowCount { get; set; }
}

