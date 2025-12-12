using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserDbAccountColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @sql := IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'CreatedDatabaseCount') = 0,
                    'ALTER TABLE `Users` ADD COLUMN `CreatedDatabaseCount` int NOT NULL DEFAULT 0;',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @sql := IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'DbPassword') = 0,
                    'ALTER TABLE `Users` ADD COLUMN `DbPassword` varchar(200) NULL;',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @sql := IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'DbUsername') = 0,
                    'ALTER TABLE `Users` ADD COLUMN `DbUsername` varchar(64) NULL;',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @sql := IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'MaxDatabaseLimit') = 0,
                    'ALTER TABLE `Users` ADD COLUMN `MaxDatabaseLimit` int NOT NULL DEFAULT 3;',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @sql := IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'PasswordHash') = 0,
                    'ALTER TABLE `Users` ADD COLUMN `PasswordHash` varchar(400) NOT NULL DEFAULT '''';',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS `ProvisionedDatabases` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `UserId` int NOT NULL,
                    `DatabaseName` varchar(200) NOT NULL,
                    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `IX_ProvisionedDatabases_UserId_DatabaseName` (`UserId`, `DatabaseName`)
                ) CHARACTER SET utf8mb4;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProvisionedDatabases");

            migrationBuilder.DropColumn(
                name: "CreatedDatabaseCount",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DbPassword",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DbUsername",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MaxDatabaseLimit",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Users");

            migrationBuilder.AddColumn<string>(
                name: "Password",
                table: "Users",
                type: "varchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
