using System;

namespace Application.DTOs.Responses;

public class DatabaseInfoResponse
{
    public int Id { get; set; }
    public string DatabaseName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

}
