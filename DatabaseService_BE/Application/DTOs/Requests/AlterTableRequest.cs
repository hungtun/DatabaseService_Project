using System;
using Application.DTOs.Requests;

namespace Application.DTOs.Requests;

public class AlterTableRequest
{
    public string? NewTableName { get; set; }
    public List<AddColumnRequest>? AddColumns { get; set; }
    public List<string>? DropColumns { get; set;}
    public List<ModifyColumnRequest>? ModifyColumns{ get; set; }
}

public class AddColumnRequest : ColumnDefinition { }
public class ModifyColumnRequest : ColumnDefinition { }

