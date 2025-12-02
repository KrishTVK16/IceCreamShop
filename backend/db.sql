IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'RRzDBdev_1')
BEGIN
    PRINT 'Creating database RRzDBdev_1';
    CREATE DATABASE RRzDBdev_1;
END
GO

USE RRzDBdev_1;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'Users'
)
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'ContactMessages'
)
BEGIN
    CREATE TABLE ContactMessages (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(15) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- User Sessions Table (Track login/logout)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'UserSessions'
)
BEGIN
    CREATE TABLE UserSessions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        LoginTime DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LogoutTime DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END
GO

-- Carts Table (Save user carts)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'Carts'
)
BEGIN
    CREATE TABLE Carts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        ItemName NVARCHAR(255) NOT NULL,
        Price DECIMAL(10,2) NOT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        UNIQUE(UserId, ItemName)
    );
END
GO

-- Orders Table
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'Orders'
)
BEGIN
    CREATE TABLE Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        TotalAmount DECIMAL(10,2) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END
GO

-- Order Items Table
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'OrderItems'
)
BEGIN
    CREATE TABLE OrderItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        ItemName NVARCHAR(255) NOT NULL,
        Price DECIMAL(10,2) NOT NULL,
        Quantity INT NOT NULL,
        SubTotal DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
    );
END
GO
