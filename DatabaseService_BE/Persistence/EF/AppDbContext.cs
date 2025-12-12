using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Persistence.EF;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ProvisionedDatabase> ProvisionedDatabases => Set<ProvisionedDatabase>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(400);
            entity.Property(u => u.DbUsername).HasMaxLength(64);
            entity.Property(u => u.DbPassword).HasMaxLength(200);
            entity.Property(u => u.MaxDatabaseLimit).HasDefaultValue(3);
            entity.Property(u => u.CreatedDatabaseCount).HasDefaultValue(0);
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<ProvisionedDatabase>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.DatabaseName).IsRequired().HasMaxLength(200);
            entity.Property(p => p.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP(6)")
                .HasPrecision(6);
            entity.HasIndex(p => new { p.UserId, p.DatabaseName }).IsUnique();
        });
    }
}

