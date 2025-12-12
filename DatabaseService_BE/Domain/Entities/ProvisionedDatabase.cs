namespace Domain.Entities;

public class ProvisionedDatabase
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string DatabaseName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

