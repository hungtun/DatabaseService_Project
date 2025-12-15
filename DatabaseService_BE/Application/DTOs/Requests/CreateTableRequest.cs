using System;

namespace Application.DTOs.Requests;

public class CreateTableRequest
{
    public string TableName { get; set; } = string.Empty;
    public List<ColumnDefinition> Columns{ get; set; } = new();
}

public class ColumnDefinition
{
    public string Name { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsNullable { get; set; } 
    public bool IsPrimaryKey { get; set;}
    public bool IsAutoIncrement { get; set;} = false;
    public string? DefaultValue { get; set; }

}