namespace Application.DTOs;

public class RegisterResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? Error { get; set; }
}

