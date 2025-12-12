using Domain.Entities;
using Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Persistence.EF;

namespace Persistence.Repositories;

public class ProvisionedDatabaseRepository(AppDbContext context) : IProvisionedDatabaseRepository
{
    private readonly AppDbContext _context = context;

    public Task<User?> GetUserAsync(int userId)
    {
        return _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    public Task<int> CountByUserIdAsync(int userId)
    {
        return _context.ProvisionedDatabases.CountAsync(p => p.UserId == userId);
    }

    public async Task AddProvisionedDatabaseAsync(ProvisionedDatabase db)
    {
        await _context.ProvisionedDatabases.AddAsync(db);
    }

    public Task UpdateUserAsync(User user)
    {
        _context.Users.Update(user);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}

