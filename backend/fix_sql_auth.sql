-- Enable SQL Server Authentication and fix login
-- Run as administrator: sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -i fix_sql_auth.sql

USE [master]
GO

-- Enable SQL Server Authentication (Mixed Mode)
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2
GO

-- Drop and recreate login with proper settings
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'rrz_app_user')
BEGIN
    DROP LOGIN [rrz_app_user];
END
GO

CREATE LOGIN [rrz_app_user] WITH PASSWORD = 'RockzRollz2025!', 
    DEFAULT_DATABASE = [RRzDBdev_1],
    CHECK_EXPIRATION = OFF,
    CHECK_POLICY = OFF;
GO

-- Grant access to the database
USE [RRzDBdev_1]
GO

IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'rrz_app_user')
BEGIN
    DROP USER [rrz_app_user];
END
GO

CREATE USER [rrz_app_user] FOR LOGIN [rrz_app_user];
ALTER ROLE [db_owner] ADD MEMBER [rrz_app_user];
GO

PRINT 'SQL Server Authentication enabled and login created!';
PRINT 'You may need to restart SQL Server for changes to take effect.';
GO

