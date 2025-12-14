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

    public Task<List<ProvisionedDatabase>> GetByUserIdAsync(int userId)
    {
        return _context.ProvisionedDatabases
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public Task<ProvisionedDatabase?> GetByIdAsync(int id, int userId)
    {
        return _context.ProvisionedDatabases
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
    }

    public Task DeleteProvisionDatabasAsync(ProvisionedDatabase db)
    {
        _context.ProvisionedDatabases.Remove(db);
        return Task.CompletedTask;
    }

}

