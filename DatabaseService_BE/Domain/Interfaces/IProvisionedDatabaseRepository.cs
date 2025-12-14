using Domain.Entities;

namespace Domain.Interfaces;

public interface IProvisionedDatabaseRepository
{
    Task<User?> GetUserAsync(int userId);
    Task<int> CountByUserIdAsync(int userId);
    Task AddProvisionedDatabaseAsync(ProvisionedDatabase db);
    Task UpdateUserAsync(User user);
    Task SaveChangesAsync();
    Task<List<ProvisionedDatabase>> GetByUserIdAsync(int userId);
    Task<ProvisionedDatabase?> GetByIdAsync(int id, int userId);
    Task DeleteProvisionDatabasAsync(ProvisionedDatabase db);

}

