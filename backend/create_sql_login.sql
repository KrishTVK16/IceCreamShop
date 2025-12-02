-- Create SQL Server Login for the application
-- Run this script as administrator in SQL Server Management Studio
-- or using: sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -i create_sql_login.sql

USE [master]
GO

-- Create login (change password as needed)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'rrz_app_user')
BEGIN
    CREATE LOGIN [rrz_app_user] WITH PASSWORD = 'RockzRollz2025!', 
        DEFAULT_DATABASE = [RRzDBdev_1],
        CHECK_EXPIRATION = OFF,
        CHECK_POLICY = OFF;
    PRINT 'Login created successfully';
END
ELSE
BEGIN
    PRINT 'Login already exists';
END
GO

-- Grant access to the database
USE [RRzDBdev_1]
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'rrz_app_user')
BEGIN
    CREATE USER [rrz_app_user] FOR LOGIN [rrz_app_user];
    ALTER ROLE [db_owner] ADD MEMBER [rrz_app_user];
    PRINT 'User created and granted db_owner role';
END
ELSE
BEGIN
    PRINT 'User already exists';
END
GO

PRINT 'Setup complete! Update your .env file with:';
PRINT 'DB_USER=rrz_app_user';
PRINT 'DB_PASS=RockzRollz2025!';
GO

