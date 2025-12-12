namespace Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? DbUsername { get; set; }
    public string? DbPassword { get; set; }
    public int MaxDatabaseLimit { get; set; } = 3;
    public int CreatedDatabaseCount { get; set; }
}

