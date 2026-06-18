-- ============================================================================
-- DISASTER MANAGEMENT SYSTEM
-- Database Schema for MS SQL Server
-- Created: 2026
-- Database: DisasterManagement
-- ============================================================================

-- Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'DisasterManagement')
BEGIN
    CREATE DATABASE DisasterManagement;
END
GO

USE DisasterManagement;
GO

-- ============================================================================
-- TABLE 1: Admin
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Admin' AND xtype='U')
CREATE TABLE Admin (
    adminID VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'Admin',
    email VARCHAR(100),
    contactNumber VARCHAR(20),
    createdDate DATETIME DEFAULT GETDATE(),
    lastLogin DATETIME NULL,
    isActive BIT DEFAULT 1
);
GO

CREATE INDEX IX_Admin_username ON Admin(username);
CREATE INDEX IX_Admin_isActive ON Admin(isActive);
GO

-- ============================================================================
-- TABLE 2: Citizen
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Citizen' AND xtype='U')
CREATE TABLE Citizen (
    citizenID VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cnic VARCHAR(15) UNIQUE NOT NULL,
    contactNumber VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    dateOfBirth DATE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registrationDate DATETIME DEFAULT GETDATE(),
    isActive BIT DEFAULT 1,
    cnicImagePath VARCHAR(500) NULL
);
GO

CREATE INDEX IX_Citizen_cnic ON Citizen(cnic);
CREATE INDEX IX_Citizen_username ON Citizen(username);
CREATE INDEX IX_Citizen_city ON Citizen(city);
CREATE INDEX IX_Citizen_isActive ON Citizen(isActive);
GO

-- ============================================================================
-- TABLE 3: RescueTeam
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RescueTeam' AND xtype='U')
CREATE TABLE RescueTeam (
    teamID VARCHAR(10) PRIMARY KEY,
    teamName VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    teamSize INT,
    contactNumber VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    location TEXT,
    city VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Available',
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registrationDate DATETIME DEFAULT GETDATE(),
    isActive BIT DEFAULT 1,
    approvedBy VARCHAR(10) NULL,
    approvalDate DATETIME NULL,
    FOREIGN KEY (approvedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_RescueTeam_status ON RescueTeam(status);
CREATE INDEX IX_RescueTeam_username ON RescueTeam(username);
CREATE INDEX IX_RescueTeam_city ON RescueTeam(city);
CREATE INDEX IX_RescueTeam_isActive ON RescueTeam(isActive);
GO

-- ============================================================================
-- TABLE 4: NGO
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='NGO' AND xtype='U')
CREATE TABLE NGO (
    ngoID VARCHAR(10) PRIMARY KEY,
    ngoName VARCHAR(100) NOT NULL,
    registrationNumber VARCHAR(50) UNIQUE NOT NULL,
    contactNumber VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    focusArea VARCHAR(200),
    status VARCHAR(20) DEFAULT 'Available',
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registrationDate DATETIME DEFAULT GETDATE(),
    isActive BIT DEFAULT 1,
    approvedBy VARCHAR(10) NULL,
    approvalDate DATETIME NULL,
    FOREIGN KEY (approvedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_NGO_status ON NGO(status);
CREATE INDEX IX_NGO_username ON NGO(username);
CREATE INDEX IX_NGO_city ON NGO(city);
CREATE INDEX IX_NGO_isActive ON NGO(isActive);
GO

-- ============================================================================
-- TABLE 5: Donor
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Donor' AND xtype='U')
CREATE TABLE Donor (
    donorID VARCHAR(10) PRIMARY KEY,
    citizenID VARCHAR(10) NOT NULL UNIQUE,
    donorType VARCHAR(20) DEFAULT 'Individual',
    organizationName VARCHAR(100) NULL,
    taxID VARCHAR(50) NULL,
    totalDonated DECIMAL(12, 2) DEFAULT 0,
    donationCount INT DEFAULT 0,
    firstDonationDate DATETIME NULL,
    lastDonationDate DATETIME NULL,
    isVerified BIT DEFAULT 0,
    isActive BIT DEFAULT 1,
    isAnonymous BIT DEFAULT 0,
    createdDate DATETIME DEFAULT GETDATE(),
    updatedDate DATETIME DEFAULT GETDATE(),
    preferredCauses TEXT NULL,
    receiveUpdates BIT DEFAULT 1,
    FOREIGN KEY (citizenID) REFERENCES Citizen(citizenID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX IX_Donor_citizenID ON Donor(citizenID);
CREATE INDEX IX_Donor_totalDonated ON Donor(totalDonated);
CREATE INDEX IX_Donor_isAnonymous ON Donor(isAnonymous);
GO

-- ============================================================================
-- TABLE 6: Disaster
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Disaster' AND xtype='U')
CREATE TABLE Disaster (
    disasterID VARCHAR(10) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Reported',
    reportedDate DATETIME DEFAULT GETDATE(),
    resolvedDate DATETIME NULL,
    description TEXT,
    affectedArea TEXT,
    estimatedCasualties INT DEFAULT 0,
    estimatedDamage VARCHAR(100),
    reportedByType VARCHAR(20) NOT NULL,
    reportedByID VARCHAR(10) NOT NULL,
    assignedTeamID VARCHAR(10) NULL,
    assignedNGOID VARCHAR(10) NULL,
    isDeleted BIT DEFAULT 0,
    FOREIGN KEY (assignedTeamID) REFERENCES RescueTeam(teamID) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (assignedNGOID) REFERENCES NGO(ngoID) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Disaster_type ON Disaster(type);
CREATE INDEX IX_Disaster_severity ON Disaster(severity);
CREATE INDEX IX_Disaster_status ON Disaster(status);
CREATE INDEX IX_Disaster_reportedDate ON Disaster(reportedDate);
CREATE INDEX IX_Disaster_assignedTeamID ON Disaster(assignedTeamID);
CREATE INDEX IX_Disaster_assignedNGOID ON Disaster(assignedNGOID);
CREATE INDEX IX_Disaster_isDeleted ON Disaster(isDeleted);
GO

-- ============================================================================
-- TABLE 7: Emergency
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Emergency' AND xtype='U')
CREATE TABLE Emergency (
    emergencyID VARCHAR(10) PRIMARY KEY,
    citizenID VARCHAR(10) NOT NULL,
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    emergencyType VARCHAR(50) NOT NULL,
    description TEXT,
    timestamp DATETIME DEFAULT GETDATE(),
    status VARCHAR(20) DEFAULT 'Pending',
    assignedTeamID VARCHAR(10) NULL,
    disasterID VARCHAR(10) NULL,
    responseTime DATETIME NULL,
    resolvedTime DATETIME NULL,
    FOREIGN KEY (citizenID) REFERENCES Citizen(citizenID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assignedTeamID) REFERENCES RescueTeam(teamID) ON DELETE SET NULL ON UPDATE NO ACTION,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Emergency_citizenID ON Emergency(citizenID);
CREATE INDEX IX_Emergency_status ON Emergency(status);
CREATE INDEX IX_Emergency_assignedTeamID ON Emergency(assignedTeamID);
CREATE INDEX IX_Emergency_timestamp ON Emergency(timestamp);
GO

-- ============================================================================
-- TABLE 8: Alert
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Alert' AND xtype='U')
CREATE TABLE Alert (
    alertID VARCHAR(10) PRIMARY KEY,
    disasterID VARCHAR(10) NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal',
    alertType VARCHAR(50),
    targetAudience VARCHAR(50) DEFAULT 'All',
    affectedAreas TEXT,
    createdBy VARCHAR(10) NOT NULL,
    createdDate DATETIME DEFAULT GETDATE(),
    status VARCHAR(20) DEFAULT 'Active',
    expiryDate DATETIME NULL,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE SET NULL ON UPDATE NO ACTION,
    FOREIGN KEY (createdBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Alert_status ON Alert(status);
CREATE INDEX IX_Alert_priority ON Alert(priority);
CREATE INDEX IX_Alert_targetAudience ON Alert(targetAudience);
CREATE INDEX IX_Alert_expiryDate ON Alert(expiryDate);
CREATE INDEX IX_Alert_disasterID ON Alert(disasterID);
GO

-- ============================================================================
-- TABLE 9: Resource
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Resource' AND xtype='U')
CREATE TABLE Resource (
    resourceID VARCHAR(10) PRIMARY KEY,
    resourceName VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    totalQuantity INT DEFAULT 0,
    allocatedQuantity INT DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    location TEXT,
    status VARCHAR(20) DEFAULT 'Available',
    costPerUnit DECIMAL(10, 2) DEFAULT 0,
    managedBy VARCHAR(10) NULL,
    addedDate DATETIME DEFAULT GETDATE(),
    lastUpdated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (managedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Resource_type ON Resource(type);
CREATE INDEX IX_Resource_status ON Resource(status);
CREATE INDEX IX_Resource_managedBy ON Resource(managedBy);
GO

-- ============================================================================
-- TABLE 10: ResourcePackage
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResourcePackage' AND xtype='U')
CREATE TABLE ResourcePackage (
    packageID VARCHAR(10) PRIMARY KEY,
    resourceID VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    requestedBy VARCHAR(10) NOT NULL,
    requestedByType VARCHAR(20) NOT NULL,
    allocatedTo VARCHAR(10) NULL,
    allocatedToType VARCHAR(20) NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    purpose TEXT,
    priority VARCHAR(20) DEFAULT 'Medium',
    requestedDate DATETIME DEFAULT GETDATE(),
    allocatedDate DATETIME NULL,
    completedDate DATETIME NULL,
    totalCost DECIMAL(10, 2) DEFAULT 0,
    rejectionReason TEXT NULL,
    lastUpdated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (resourceID) REFERENCES Resource(resourceID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX IX_ResourcePackage_resourceID ON ResourcePackage(resourceID);
CREATE INDEX IX_ResourcePackage_status ON ResourcePackage(status);
CREATE INDEX IX_ResourcePackage_priority ON ResourcePackage(priority);
CREATE INDEX IX_ResourcePackage_requestedBy ON ResourcePackage(requestedBy);
GO

-- ============================================================================
-- TABLE 11: Donation
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Donation' AND xtype='U')
CREATE TABLE Donation (
    donationID VARCHAR(10) PRIMARY KEY,
    donorID VARCHAR(10) NULL,
    citizenID VARCHAR(10) NOT NULL,
    amount DECIMAL(12, 2) NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    donationType VARCHAR(20) DEFAULT 'Money',
    itemDescription TEXT NULL,
    itemQuantity INT NULL,
    itemUnit VARCHAR(20) NULL,
    estimatedValue DECIMAL(12, 2) NULL,
    allocationTarget VARCHAR(20) DEFAULT 'General',
    disasterID VARCHAR(10) NULL,
    ngoID VARCHAR(10) NULL,
    rescueTeamID VARCHAR(10) NULL,
    paymentMethod VARCHAR(50) NULL,
    transactionID VARCHAR(100) NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    donationDate DATETIME DEFAULT GETDATE(),
    processedDate DATETIME NULL,
    receiptNumber VARCHAR(50) UNIQUE NULL,
    receiptIssued BIT DEFAULT 0,
    isAnonymous BIT DEFAULT 0,
    message TEXT NULL,
    isTaxDeductible BIT DEFAULT 1,
    processedBy VARCHAR(10) NULL,
    receiptImagePath VARCHAR(500) NULL,
    FOREIGN KEY (donorID) REFERENCES Donor(donorID) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (citizenID) REFERENCES Citizen(citizenID) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE SET NULL ON UPDATE NO ACTION,
    FOREIGN KEY (ngoID) REFERENCES NGO(ngoID) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (rescueTeamID) REFERENCES RescueTeam(teamID) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (processedBy) REFERENCES Admin(adminID) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Donation_donorID ON Donation(donorID);
CREATE INDEX IX_Donation_citizenID ON Donation(citizenID);
CREATE INDEX IX_Donation_status ON Donation(status);
CREATE INDEX IX_Donation_disasterID ON Donation(disasterID);
CREATE INDEX IX_Donation_donationDate ON Donation(donationDate);
CREATE INDEX IX_Donation_allocationTarget ON Donation(allocationTarget);
GO

-- ============================================================================
-- TABLE 12: Mission
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mission' AND xtype='U')
CREATE TABLE Mission (
    missionID VARCHAR(10) PRIMARY KEY,
    teamID VARCHAR(10) NOT NULL,
    disasterID VARCHAR(10) NOT NULL,
    assignedDate DATETIME DEFAULT GETDATE(),
    startTime DATETIME NULL,
    endTime DATETIME NULL,
    status VARCHAR(20) DEFAULT 'Assigned',
    missionDetails TEXT,
    peopleRescued INT DEFAULT 0,
    casualtiesReported INT DEFAULT 0,
    FOREIGN KEY (teamID) REFERENCES RescueTeam(teamID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX IX_Mission_teamID ON Mission(teamID);
CREATE INDEX IX_Mission_disasterID ON Mission(disasterID);
CREATE INDEX IX_Mission_status ON Mission(status);
GO

-- ============================================================================
-- TABLE 13: DistributionPlan
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DistributionPlan' AND xtype='U')
CREATE TABLE DistributionPlan (
    planID VARCHAR(10) PRIMARY KEY,
    ngoID VARCHAR(10) NOT NULL,
    disasterID VARCHAR(10) NULL,
    planName VARCHAR(200) NOT NULL,
    targetAreas TEXT,
    schedule TEXT,
    status VARCHAR(20) DEFAULT 'Planned',
    createdDate DATETIME DEFAULT GETDATE(),
    beneficiariesReached INT DEFAULT 0,
    FOREIGN KEY (ngoID) REFERENCES NGO(ngoID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_DistributionPlan_ngoID ON DistributionPlan(ngoID);
CREATE INDEX IX_DistributionPlan_disasterID ON DistributionPlan(disasterID);
CREATE INDEX IX_DistributionPlan_status ON DistributionPlan(status);
GO

-- ============================================================================
-- TABLE 14: Feedback
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Feedback' AND xtype='U')
CREATE TABLE Feedback (
    feedbackID VARCHAR(10) PRIMARY KEY,
    actorType VARCHAR(20) NOT NULL,
    actorID VARCHAR(10) NOT NULL,
    feedbackType VARCHAR(20) NOT NULL,
    entityID VARCHAR(10) NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    subject VARCHAR(200) NOT NULL,
    details TEXT,
    isAnonymous BIT DEFAULT 0,
    contactName VARCHAR(100) NULL,
    contactEmail VARCHAR(100) NULL,
    contactPhone VARCHAR(20) NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    adminResponse TEXT NULL,
    submittedDate DATETIME DEFAULT GETDATE(),
    reviewDate DATETIME NULL,
    reviewedBy VARCHAR(10) NULL,
    FOREIGN KEY (reviewedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Feedback_actorID ON Feedback(actorID);
CREATE INDEX IX_Feedback_status ON Feedback(status);
CREATE INDEX IX_Feedback_feedbackType ON Feedback(feedbackType);
GO

-- ============================================================================
-- TABLE 15: Report
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Report' AND xtype='U')
CREATE TABLE Report (
    reportID VARCHAR(10) PRIMARY KEY,
    reportType VARCHAR(50) NOT NULL,
    reportName VARCHAR(200) NOT NULL,
    criteria TEXT,
    generatedDate DATETIME DEFAULT GETDATE(),
    generatedBy VARCHAR(10) NOT NULL,
    startDate DATE NULL,
    endDate DATE NULL,
    dataSnapshot TEXT,
    fileFormat VARCHAR(10),
    filePath VARCHAR(500),
    FOREIGN KEY (generatedBy) REFERENCES Admin(adminID) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Report_reportType ON Report(reportType);
CREATE INDEX IX_Report_generatedBy ON Report(generatedBy);
CREATE INDEX IX_Report_generatedDate ON Report(generatedDate);
GO

-- ============================================================================
-- TABLE 16: EmergencyContact
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyContact' AND xtype='U')
CREATE TABLE EmergencyContact (
    contactID VARCHAR(10) PRIMARY KEY,
    serviceName VARCHAR(100) NOT NULL,
    contactNumber VARCHAR(20) NOT NULL,
    city VARCHAR(50),
    isActive BIT DEFAULT 1,
    addedBy VARCHAR(10) NULL,
    createdDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (addedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_EmergencyContact_city ON EmergencyContact(city);
CREATE INDEX IX_EmergencyContact_isActive ON EmergencyContact(isActive);
CREATE INDEX IX_EmergencyContact_addedBy ON EmergencyContact(addedBy);
GO

-- ============================================================================
-- 23. AUDIT LOG TABLE
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLog' AND xtype='U')
CREATE TABLE AuditLog (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    userID          VARCHAR(20) NOT NULL,
    userRole        VARCHAR(30) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    entity          VARCHAR(50) NOT NULL,
    entityID        VARCHAR(20),
    details         NVARCHAR(MAX),
    timestamp       DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX IX_AuditLog_entity ON AuditLog(entity);
CREATE INDEX IX_AuditLog_userId ON AuditLog(userID);
CREATE INDEX IX_AuditLog_timestamp ON AuditLog(timestamp DESC);
GO

-- ============================================================================
-- SEED DATA: Insert default admin and sample data
-- ============================================================================

-- Default Admin (password: Admin@123 — bcrypt hash)
IF NOT EXISTS (SELECT 1 FROM Admin WHERE adminID = 'ADM001' OR username = 'admin')
INSERT INTO Admin (adminID, name, username, password, role, email, contactNumber)
VALUES ('ADM001', 'System Administrator', 'admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkE9gKBZmFLrp2Yzv2x0C1gHRmKDi', 'Admin', 'admin@disaster.gov.pk', '03001234567');
GO

-- Sample Emergency Contacts
IF NOT EXISTS (SELECT 1 FROM EmergencyContact WHERE contactID = 'EC001')
INSERT INTO EmergencyContact (contactID, serviceName, contactNumber, city) VALUES ('EC001', 'Police Emergency', '15', 'All Cities');
IF NOT EXISTS (SELECT 1 FROM EmergencyContact WHERE contactID = 'EC002')
INSERT INTO EmergencyContact (contactID, serviceName, contactNumber, city) VALUES ('EC002', 'Ambulance Service', '1122', 'All Cities');
IF NOT EXISTS (SELECT 1 FROM EmergencyContact WHERE contactID = 'EC003')
INSERT INTO EmergencyContact (contactID, serviceName, contactNumber, city) VALUES ('EC003', 'Fire Brigade', '16', 'All Cities');
IF NOT EXISTS (SELECT 1 FROM EmergencyContact WHERE contactID = 'EC004')
INSERT INTO EmergencyContact (contactID, serviceName, contactNumber, city) VALUES ('EC004', 'NDMA Helpline', '1166', 'All Cities');
IF NOT EXISTS (SELECT 1 FROM EmergencyContact WHERE contactID = 'EC005')
INSERT INTO EmergencyContact (contactID, serviceName, contactNumber, city) VALUES ('EC005', 'Edhi Foundation', '115', 'All Cities');
GO

PRINT 'Disaster Management System database schema created successfully!';
GO

-- ============================================================================
-- TABLE 17: BankAccount  (Admin-managed donation receiving accounts)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BankAccount' AND xtype='U')
CREATE TABLE BankAccount (
    accountID VARCHAR(10) PRIMARY KEY,
    bankName VARCHAR(100) NOT NULL,
    accountTitle VARCHAR(150) NOT NULL,
    accountNumber VARCHAR(30) NOT NULL,
    iban VARCHAR(34) NULL,
    branchCode VARCHAR(20) NULL,
    branchName VARCHAR(100) NULL,
    swiftCode VARCHAR(15) NULL,
    accountType VARCHAR(30) DEFAULT 'Current',
    currency VARCHAR(3) DEFAULT 'PKR',
    purpose VARCHAR(200) NULL,
    isActive BIT DEFAULT 1,
    addedBy VARCHAR(10) NOT NULL,
    addedDate DATETIME DEFAULT GETDATE(),
    lastUpdated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (addedBy) REFERENCES Admin(adminID) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_BankAccount_isActive ON BankAccount(isActive);
CREATE INDEX IX_BankAccount_addedBy ON BankAccount(addedBy);
GO

PRINT 'BankAccount table created successfully!';
GO

-- ============================================================================
-- TABLE 18: MapLocation  (Shelters, hospitals, relief camps markers on map)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MapLocation' AND xtype='U')
CREATE TABLE MapLocation (
    locationID INT IDENTITY(1,1) PRIMARY KEY,
    locationName VARCHAR(150) NOT NULL,
    locationType VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT NULL,
    disasterID VARCHAR(10) NULL,
    isActive BIT DEFAULT 1,
    createdDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_MapLocation_locationType ON MapLocation(locationType);
CREATE INDEX IX_MapLocation_disasterID ON MapLocation(disasterID);
CREATE INDEX IX_MapLocation_isActive ON MapLocation(isActive);
GO

PRINT 'MapLocation table created successfully!';
GO

-- ============================================================================
-- TABLE 19: DisasterTeamAssignment  (Many-to-many: Disaster ↔ RescueTeam)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DisasterTeamAssignment' AND xtype='U')
CREATE TABLE DisasterTeamAssignment (
    assignmentID VARCHAR(10) PRIMARY KEY,
    disasterID VARCHAR(10) NOT NULL,
    teamID VARCHAR(10) NOT NULL,
    role VARCHAR(50) DEFAULT 'Rescue',
    assignedDate DATETIME DEFAULT GETDATE(),
    status VARCHAR(20) DEFAULT 'Active',
    assignedBy VARCHAR(10) NULL,
    notes TEXT NULL,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (teamID) REFERENCES RescueTeam(teamID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT UQ_DisasterTeam UNIQUE (disasterID, teamID)
);
GO

CREATE INDEX IX_DTA_disasterID ON DisasterTeamAssignment(disasterID);
CREATE INDEX IX_DTA_teamID ON DisasterTeamAssignment(teamID);
CREATE INDEX IX_DTA_status ON DisasterTeamAssignment(status);
GO

PRINT 'DisasterTeamAssignment table created successfully!';
GO

-- ============================================================================
-- TABLE 20: DisasterNGOAssignment  (Many-to-many: Disaster ↔ NGO)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DisasterNGOAssignment' AND xtype='U')
CREATE TABLE DisasterNGOAssignment (
    assignmentID VARCHAR(10) PRIMARY KEY,
    disasterID VARCHAR(10) NOT NULL,
    ngoID VARCHAR(10) NOT NULL,
    role VARCHAR(50) DEFAULT 'Relief',
    assignedDate DATETIME DEFAULT GETDATE(),
    status VARCHAR(20) DEFAULT 'Active',
    assignedBy VARCHAR(10) NULL,
    notes TEXT NULL,
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ngoID) REFERENCES NGO(ngoID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT UQ_DisasterNGO UNIQUE (disasterID, ngoID)
);
GO

CREATE INDEX IX_DNA_disasterID ON DisasterNGOAssignment(disasterID);
CREATE INDEX IX_DNA_ngoID ON DisasterNGOAssignment(ngoID);
CREATE INDEX IX_DNA_status ON DisasterNGOAssignment(status);
GO

PRINT 'DisasterNGOAssignment table created successfully!';
GO

-- ============================================================================
-- RELATIONSHIP SUMMARY
-- ============================================================================
-- Admin       <-- RescueTeam.approvedBy        (SET NULL on delete)
-- Admin       <-- NGO.approvedBy               (SET NULL on delete)
-- Admin       <-- Alert.createdBy              (SET NULL on delete)
-- Admin       <-- Resource.managedBy           (SET NULL on delete)
-- Admin       <-- Feedback.reviewedBy          (SET NULL on delete)
-- Admin       <-- EmergencyContact.addedBy     (SET NULL on delete)
-- Admin       <-- Report.generatedBy           (NO ACTION - keep reports)
-- Admin       <-- BankAccount.addedBy          (NO ACTION - keep accounts)
-- Admin       <-- Donation.processedBy         (NO ACTION)
--
-- Citizen     <-- Donor.citizenID              (CASCADE - 1:1 extension)
-- Citizen     <-- Emergency.citizenID          (CASCADE - owns emergencies)
-- Citizen     <-- Donation.citizenID           (NO ACTION - preserve records)
--
-- RescueTeam  <-- Emergency.assignedTeamID     (SET NULL on delete)
-- RescueTeam  <-- Mission.teamID               (CASCADE - team owns missions)
-- RescueTeam  <-- Disaster.assignedTeamID      (NO ACTION)
-- RescueTeam  <-- Donation.rescueTeamID        (NO ACTION)
--
-- NGO         <-- DistributionPlan.ngoID       (CASCADE - NGO owns plans)
-- NGO         <-- Disaster.assignedNGOID       (NO ACTION)
-- NGO         <-- Donation.ngoID               (NO ACTION)
--
-- Disaster    <-- Alert.disasterID             (SET NULL on delete)
-- Disaster    <-- Mission.disasterID           (CASCADE)
-- Disaster    <-- DistributionPlan.disasterID  (SET NULL on delete)
-- Disaster    <-- Donation.disasterID          (SET NULL on delete)
-- Disaster    <-- MapLocation.disasterID       (SET NULL on delete)
-- Disaster    <-- DisasterTeamAssignment.disasterID (CASCADE)
-- Disaster    <-- DisasterNGOAssignment.disasterID  (CASCADE)
-- Disaster    <-- Emergency.disasterID         (SET NULL on delete)
--
-- Donor       <-- Donation.donorID             (NO ACTION - preserve records)
-- Resource    <-- ResourcePackage.resourceID   (CASCADE)
--
-- DisasterTeamAssignment: Disaster ↔ RescueTeam many-to-many (UNIQUE disasterID+teamID)
-- DisasterNGOAssignment:  Disaster ↔ NGO many-to-many (UNIQUE disasterID+ngoID)
-- ============================================================================

-- ============================================================================
-- TABLE 21: Notification  (Admin/role-targeted real-time notifications)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notification' AND xtype='U')
CREATE TABLE Notification (
    notificationID INT IDENTITY(1,1) PRIMARY KEY,
    targetRole VARCHAR(20) NOT NULL DEFAULT 'Admin',
    targetUserID VARCHAR(10) NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    relatedEntity VARCHAR(30) NULL,
    relatedID VARCHAR(10) NULL,
    redirectPath VARCHAR(200) NULL,
    isRead BIT DEFAULT 0,
    createdDate DATETIME DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Notification_targetRole ON Notification(targetRole);
CREATE INDEX IX_Notification_targetUserID ON Notification(targetUserID);
CREATE INDEX IX_Notification_isRead ON Notification(isRead);
CREATE INDEX IX_Notification_category ON Notification(category);
CREATE INDEX IX_Notification_createdDate ON Notification(createdDate);
GO

PRINT 'Notification table created successfully!';
GO

-- ============================================================================
-- TABLE 22: DisasterPhoto  (Uploaded photos linked to disasters)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DisasterPhoto' AND xtype='U')
CREATE TABLE DisasterPhoto (
    photoID VARCHAR(10) PRIMARY KEY,
    disasterID VARCHAR(10) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileName VARCHAR(200) NOT NULL,
    fileSize INT NULL,
    ocrText TEXT NULL,
    uploadedBy VARCHAR(10) NOT NULL,
    uploadedByType VARCHAR(20) NOT NULL,
    uploadedDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX IX_DisasterPhoto_disasterID ON DisasterPhoto(disasterID);
GO

PRINT 'DisasterPhoto table created successfully!';
GO

-- ============================================================================
-- MIGRATION: BankAccount — add bankType, minAmount, maxAmount columns
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BankAccount') AND name = 'bankType')
    ALTER TABLE BankAccount ADD bankType VARCHAR(30) NOT NULL DEFAULT 'Traditional';
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BankAccount') AND name = 'minAmount')
    ALTER TABLE BankAccount ADD minAmount DECIMAL(12,2) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BankAccount') AND name = 'maxAmount')
    ALTER TABLE BankAccount ADD maxAmount DECIMAL(12,2) NULL;
GO
PRINT 'BankAccount migration applied (bankType, minAmount, maxAmount).';
GO

-- ============================================================================
-- MIGRATION: Donation — add bankAccountID (target receiving account) and
--            senderAccountNumber (citizen sender account)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Donation') AND name = 'bankAccountID')
    ALTER TABLE Donation ADD bankAccountID VARCHAR(10) NULL
        CONSTRAINT FK_Donation_BankAccount FOREIGN KEY REFERENCES BankAccount(accountID) ON DELETE SET NULL ON UPDATE NO ACTION;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Donation') AND name = 'senderAccountNumber')
    ALTER TABLE Donation ADD senderAccountNumber VARCHAR(50) NULL;
GO
PRINT 'Donation migration applied (bankAccountID, senderAccountNumber).';
GO

-- ============================================================================
-- SCHEMA NORMALIZATION + DEDUP MIGRATION (safe, idempotent)
-- ============================================================================

-- 1) Ensure emergency assignment tables exist in schema (these are used by backend models)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyTeamAssignment' AND xtype='U')
CREATE TABLE EmergencyTeamAssignment (
    assignmentID VARCHAR(10) PRIMARY KEY,
    emergencyID VARCHAR(10) NOT NULL,
    teamID VARCHAR(10) NOT NULL,
    role VARCHAR(50) NULL,
    assignedBy VARCHAR(10) NULL,
    notes NVARCHAR(500) NULL,
    assignedDate DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_EmergencyTeam UNIQUE (emergencyID, teamID),
    FOREIGN KEY (emergencyID) REFERENCES Emergency(emergencyID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (teamID) REFERENCES RescueTeam(teamID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ETA_emergencyID' AND object_id = OBJECT_ID('EmergencyTeamAssignment'))
    CREATE INDEX IX_ETA_emergencyID ON EmergencyTeamAssignment(emergencyID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ETA_teamID' AND object_id = OBJECT_ID('EmergencyTeamAssignment'))
    CREATE INDEX IX_ETA_teamID ON EmergencyTeamAssignment(teamID);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyNGOAssignment' AND xtype='U')
CREATE TABLE EmergencyNGOAssignment (
    assignmentID VARCHAR(10) PRIMARY KEY,
    emergencyID VARCHAR(10) NOT NULL,
    ngoID VARCHAR(10) NOT NULL,
    role VARCHAR(50) NULL,
    assignedBy VARCHAR(10) NULL,
    notes NVARCHAR(500) NULL,
    assignedDate DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_EmergencyNGO UNIQUE (emergencyID, ngoID),
    FOREIGN KEY (emergencyID) REFERENCES Emergency(emergencyID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ngoID) REFERENCES NGO(ngoID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES Admin(adminID) ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ENA_emergencyID' AND object_id = OBJECT_ID('EmergencyNGOAssignment'))
    CREATE INDEX IX_ENA_emergencyID ON EmergencyNGOAssignment(emergencyID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ENA_ngoID' AND object_id = OBJECT_ID('EmergencyNGOAssignment'))
    CREATE INDEX IX_ENA_ngoID ON EmergencyNGOAssignment(ngoID);
GO

-- 2) Remove duplicate rows from key tables (keep oldest by key)
;WITH EC AS (
    SELECT contactID, ROW_NUMBER() OVER (
        PARTITION BY serviceName, contactNumber, ISNULL(city, '')
        ORDER BY createdDate ASC, contactID ASC
    ) AS rn
    FROM EmergencyContact
)
DELETE FROM EmergencyContact WHERE contactID IN (SELECT contactID FROM EC WHERE rn > 1);
GO

;WITH BA AS (
    SELECT accountID, ROW_NUMBER() OVER (
        PARTITION BY bankName, accountTitle, accountNumber
        ORDER BY addedDate ASC, accountID ASC
    ) AS rn
    FROM BankAccount
)
DELETE FROM BankAccount WHERE accountID IN (SELECT accountID FROM BA WHERE rn > 1);
GO

;WITH FB AS (
    SELECT feedbackID, ROW_NUMBER() OVER (
        PARTITION BY actorType, actorID, entityID
        ORDER BY submittedDate ASC, feedbackID ASC
    ) AS rn
    FROM Feedback
    WHERE entityID IS NOT NULL
)
DELETE FROM Feedback WHERE feedbackID IN (SELECT feedbackID FROM FB WHERE rn > 1);
GO

-- 3) Add uniqueness to prevent future duplicates
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_EmergencyContact_ServiceNumberCity' AND object_id = OBJECT_ID('EmergencyContact'))
    CREATE UNIQUE INDEX UQ_EmergencyContact_ServiceNumberCity ON EmergencyContact(serviceName, contactNumber, city);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_BankAccount_BankTitleNumber' AND object_id = OBJECT_ID('BankAccount'))
    CREATE UNIQUE INDEX UQ_BankAccount_BankTitleNumber ON BankAccount(bankName, accountTitle, accountNumber);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Feedback_ActorEntity' AND object_id = OBJECT_ID('Feedback'))
    CREATE UNIQUE INDEX UQ_Feedback_ActorEntity ON Feedback(actorType, actorID, entityID) WHERE entityID IS NOT NULL;
GO

-- 4) Normalize Alert.createdBy FK behavior (SET NULL requires nullable column)
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Alert')
      AND name = 'createdBy'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE Alert ALTER COLUMN createdBy VARCHAR(10) NULL;
END
GO

PRINT 'Schema normalization and dedup migration applied successfully.';
GO

-- ============================================================================
-- MIGRATION: Ensure runtime-created tables exist in schema script
--            (DisasterUpdate, EmergencyUpdate, Message, FundAccount, FundTransaction)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DisasterUpdate' AND xtype='U')
CREATE TABLE DisasterUpdate (
    updateID INT IDENTITY(1,1) PRIMARY KEY,
    disasterID VARCHAR(10) NOT NULL,
    senderID VARCHAR(10) NOT NULL,
    senderRole VARCHAR(20) NOT NULL,
    senderName VARCHAR(100) NULL,
    message NVARCHAR(MAX) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DisasterUpdate_disasterID' AND object_id = OBJECT_ID('DisasterUpdate'))
    CREATE INDEX IX_DisasterUpdate_disasterID ON DisasterUpdate(disasterID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DisasterUpdate_createdAt' AND object_id = OBJECT_ID('DisasterUpdate'))
    CREATE INDEX IX_DisasterUpdate_createdAt ON DisasterUpdate(createdAt DESC);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyUpdate' AND xtype='U')
CREATE TABLE EmergencyUpdate (
    updateID INT IDENTITY(1,1) PRIMARY KEY,
    emergencyID VARCHAR(10) NOT NULL,
    senderID VARCHAR(10) NOT NULL,
    senderRole VARCHAR(20) NOT NULL,
    senderName VARCHAR(100) NULL,
    message NVARCHAR(MAX) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (emergencyID) REFERENCES Emergency(emergencyID) ON DELETE CASCADE ON UPDATE CASCADE
);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmergencyUpdate_emergencyID' AND object_id = OBJECT_ID('EmergencyUpdate'))
    CREATE INDEX IX_EmergencyUpdate_emergencyID ON EmergencyUpdate(emergencyID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmergencyUpdate_createdAt' AND object_id = OBJECT_ID('EmergencyUpdate'))
    CREATE INDEX IX_EmergencyUpdate_createdAt ON EmergencyUpdate(createdAt DESC);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Message' AND xtype='U')
CREATE TABLE Message (
    messageID INT IDENTITY(1,1) PRIMARY KEY,
    senderID VARCHAR(10) NOT NULL,
    senderRole VARCHAR(20) NOT NULL,
    receiverID VARCHAR(10) NOT NULL,
    receiverRole VARCHAR(20) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    messageType VARCHAR(20) DEFAULT 'text',
    isRead BIT DEFAULT 0,
    sentDate DATETIME DEFAULT GETDATE()
);
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Message') AND name = 'messageType')
    ALTER TABLE Message ADD messageType VARCHAR(20) DEFAULT 'text';
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Message_senderID' AND object_id = OBJECT_ID('Message'))
    CREATE INDEX IX_Message_senderID ON Message(senderID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Message_receiverID' AND object_id = OBJECT_ID('Message'))
    CREATE INDEX IX_Message_receiverID ON Message(receiverID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Message_sentDate' AND object_id = OBJECT_ID('Message'))
    CREATE INDEX IX_Message_sentDate ON Message(sentDate DESC);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FundAccount' AND xtype='U')
CREATE TABLE FundAccount (
    accountID VARCHAR(10) PRIMARY KEY,
    ownerID VARCHAR(10) NOT NULL,
    ownerType VARCHAR(20) NOT NULL,
    bankName VARCHAR(100) NOT NULL,
    accountTitle VARCHAR(150) NOT NULL,
    accountNumber VARCHAR(30) NOT NULL,
    iban VARCHAR(34) NULL,
    branchCode VARCHAR(20) NULL,
    branchName VARCHAR(100) NULL,
    swiftCode VARCHAR(20) NULL,
    accountType VARCHAR(50) NULL,
    currency VARCHAR(10) NULL,
    purpose VARCHAR(255) NULL,
    bankType VARCHAR(30) NULL,
    minAmount DECIMAL(12,2) NULL,
    maxAmount DECIMAL(12,2) NULL,
    isActive BIT DEFAULT 1,
    addedDate DATETIME DEFAULT GETDATE(),
    lastUpdated DATETIME DEFAULT GETDATE()
);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundAccount_owner' AND object_id = OBJECT_ID('FundAccount'))
    CREATE INDEX IX_FundAccount_owner ON FundAccount(ownerID, ownerType);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundAccount_active' AND object_id = OBJECT_ID('FundAccount'))
    CREATE INDEX IX_FundAccount_active ON FundAccount(isActive);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FundTransaction' AND xtype='U')
CREATE TABLE FundTransaction (
    transactionID VARCHAR(10) PRIMARY KEY,
    fromType VARCHAR(20) NOT NULL,
    fromID VARCHAR(10) NOT NULL,
    toType VARCHAR(20) NOT NULL,
    toID VARCHAR(10) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    purpose VARCHAR(200) NULL,
    disasterID VARCHAR(10) NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    transactionDate DATETIME DEFAULT GETDATE(),
    processedDate DATETIME NULL,
    processedBy VARCHAR(10) NULL,
    notes TEXT NULL,
    fromBankAccountID VARCHAR(10) NULL,
    recipientAccountID VARCHAR(10) NULL,
    senderAccountNumber VARCHAR(50) NULL,
    transactionRef VARCHAR(100) NULL,
    receiptImagePath VARCHAR(500) NULL
);
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FundTransaction') AND name = 'fromBankAccountID')
    ALTER TABLE FundTransaction ADD fromBankAccountID VARCHAR(10) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FundTransaction') AND name = 'recipientAccountID')
    ALTER TABLE FundTransaction ADD recipientAccountID VARCHAR(10) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FundTransaction') AND name = 'senderAccountNumber')
    ALTER TABLE FundTransaction ADD senderAccountNumber VARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FundTransaction') AND name = 'transactionRef')
    ALTER TABLE FundTransaction ADD transactionRef VARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FundTransaction') AND name = 'receiptImagePath')
    ALTER TABLE FundTransaction ADD receiptImagePath VARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundTransaction_fromID' AND object_id = OBJECT_ID('FundTransaction'))
    CREATE INDEX IX_FundTransaction_fromID ON FundTransaction(fromID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundTransaction_toID' AND object_id = OBJECT_ID('FundTransaction'))
    CREATE INDEX IX_FundTransaction_toID ON FundTransaction(toID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundTransaction_status' AND object_id = OBJECT_ID('FundTransaction'))
    CREATE INDEX IX_FundTransaction_status ON FundTransaction(status);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FundTransaction_date' AND object_id = OBJECT_ID('FundTransaction'))
    CREATE INDEX IX_FundTransaction_date ON FundTransaction(transactionDate DESC);
GO

PRINT 'Runtime table sync migration applied (DisasterUpdate, EmergencyUpdate, Message, FundAccount, FundTransaction).';
GO

-- ============================================================================
-- MIGRATION: Referential integrity hardening for fund flow (non-breaking)
-- ============================================================================

-- Clean orphan references before adding FKs (keeps existing rows usable)
UPDATE ft
SET ft.disasterID = NULL
FROM FundTransaction ft
LEFT JOIN Disaster d ON ft.disasterID = d.disasterID
WHERE ft.disasterID IS NOT NULL AND d.disasterID IS NULL;
GO

UPDATE ft
SET ft.processedBy = NULL
FROM FundTransaction ft
LEFT JOIN Admin a ON ft.processedBy = a.adminID
WHERE ft.processedBy IS NOT NULL AND a.adminID IS NULL;
GO

UPDATE ft
SET ft.fromBankAccountID = NULL
FROM FundTransaction ft
LEFT JOIN BankAccount ba ON ft.fromBankAccountID = ba.accountID
WHERE ft.fromBankAccountID IS NOT NULL AND ba.accountID IS NULL;
GO

UPDATE ft
SET ft.recipientAccountID = NULL
FROM FundTransaction ft
LEFT JOIN FundAccount fa ON ft.recipientAccountID = fa.accountID
WHERE ft.recipientAccountID IS NOT NULL AND fa.accountID IS NULL;
GO

-- Add FK: FundTransaction.disasterID -> Disaster (delete disaster keeps tx history)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FundTransaction_Disaster')
BEGIN
    ALTER TABLE FundTransaction
    ADD CONSTRAINT FK_FundTransaction_Disaster
        FOREIGN KEY (disasterID) REFERENCES Disaster(disasterID)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
END
GO

-- Add FK: FundTransaction.processedBy -> Admin (delete admin keeps tx history)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FundTransaction_ProcessedBy_Admin')
BEGIN
    ALTER TABLE FundTransaction
    ADD CONSTRAINT FK_FundTransaction_ProcessedBy_Admin
        FOREIGN KEY (processedBy) REFERENCES Admin(adminID)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
END
GO

-- Add FK: FundTransaction.fromBankAccountID -> BankAccount (delete account keeps tx history)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FundTransaction_FromBankAccount')
BEGIN
    ALTER TABLE FundTransaction
    ADD CONSTRAINT FK_FundTransaction_FromBankAccount
        FOREIGN KEY (fromBankAccountID) REFERENCES BankAccount(accountID)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
END
GO

-- Add FK: FundTransaction.recipientAccountID -> FundAccount (delete account keeps tx history)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FundTransaction_RecipientFundAccount')
BEGIN
    ALTER TABLE FundTransaction
    ADD CONSTRAINT FK_FundTransaction_RecipientFundAccount
        FOREIGN KEY (recipientAccountID) REFERENCES FundAccount(accountID)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
END
GO

PRINT 'FundTransaction referential integrity migration applied safely.';
GO

-- ============================================================================
-- MIGRATION: Distribution plans with resource line-items and NGO deduction state
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DistributionPlan') AND name = 'emergencyID')
    ALTER TABLE DistributionPlan ADD emergencyID VARCHAR(10) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DistributionPlan') AND name = 'resourcesDeducted')
    ALTER TABLE DistributionPlan ADD resourcesDeducted BIT NOT NULL CONSTRAINT DF_DistributionPlan_resourcesDeducted DEFAULT 0;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DistributionPlanItem' AND xtype='U')
CREATE TABLE DistributionPlanItem (
    itemID INT IDENTITY(1,1) PRIMARY KEY,
    planID VARCHAR(10) NOT NULL,
    resourceID VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(20) NULL,
    createdDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (planID) REFERENCES DistributionPlan(planID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (resourceID) REFERENCES Resource(resourceID) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DistributionPlanItem_planID' AND object_id = OBJECT_ID('DistributionPlanItem'))
    CREATE INDEX IX_DistributionPlanItem_planID ON DistributionPlanItem(planID);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DistributionPlanItem_resourceID' AND object_id = OBJECT_ID('DistributionPlanItem'))
    CREATE INDEX IX_DistributionPlanItem_resourceID ON DistributionPlanItem(resourceID);
GO

PRINT 'Distribution plan resource-item migration applied.';
GO

-- ============================================================================
-- INCLUDED FROM: chatbot_intents_schema.sql
-- ============================================================================

USE DisasterManagement;
GO
-- CrisisConnect chatbot knowledge schema (SQL Server)
-- Use this schema if you want to host chatbot intents in the main DB.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatbotIntent')
BEGIN
    CREATE TABLE ChatbotIntent (
        Tag NVARCHAR(100) PRIMARY KEY,
        ActionType NVARCHAR(50) NULL,
        ActionPath NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatbotPattern')
BEGIN
    CREATE TABLE ChatbotPattern (
        PatternID INT IDENTITY(1,1) PRIMARY KEY,
        Tag NVARCHAR(100) NOT NULL,
        PatternText NVARCHAR(500) NOT NULL,
        CONSTRAINT FK_ChatbotPattern_Intent
            FOREIGN KEY (Tag) REFERENCES ChatbotIntent(Tag)
            ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatbotResponse')
BEGIN
    CREATE TABLE ChatbotResponse (
        ResponseID INT IDENTITY(1,1) PRIMARY KEY,
        Tag NVARCHAR(100) NOT NULL,
        ResponseText NVARCHAR(MAX) NOT NULL,
        CONSTRAINT FK_ChatbotResponse_Intent
            FOREIGN KEY (Tag) REFERENCES ChatbotIntent(Tag)
            ON DELETE CASCADE
    );
END;
GO

CREATE INDEX IX_ChatbotPattern_Tag ON ChatbotPattern(Tag);
CREATE INDEX IX_ChatbotResponse_Tag ON ChatbotResponse(Tag);
GO

-- ============================================================================
-- CONSOLIDATED ADDITIONS: Triggers and Stored Procedures
-- These are idempotent and safe to run multiple times.
-- ============================================================================

USE DisasterManagement;
GO

-- Keep BankAccount.lastUpdated in sync on updates
CREATE OR ALTER TRIGGER trg_BankAccount_LastUpdated
ON BankAccount
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    IF UPDATE(lastUpdated) RETURN;

    UPDATE ba
    SET lastUpdated = GETDATE()
    FROM BankAccount ba
    INNER JOIN inserted i ON i.accountID = ba.accountID;
END;
GO

-- Keep FundAccount.lastUpdated in sync on updates
CREATE OR ALTER TRIGGER trg_FundAccount_LastUpdated
ON FundAccount
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    IF UPDATE(lastUpdated) RETURN;

    UPDATE fa
    SET lastUpdated = GETDATE()
    FROM FundAccount fa
    INNER JOIN inserted i ON i.accountID = fa.accountID;
END;
GO

-- Keep ChatbotIntent.UpdatedAt in sync on updates
IF OBJECT_ID('ChatbotIntent', 'U') IS NOT NULL
BEGIN
    EXEC ('
        CREATE OR ALTER TRIGGER trg_ChatbotIntent_UpdatedAt
        ON ChatbotIntent
        AFTER UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;

            IF TRIGGER_NESTLEVEL() > 1 RETURN;
            IF UPDATE(UpdatedAt) RETURN;

            UPDATE ci
            SET UpdatedAt = SYSUTCDATETIME()
            FROM ChatbotIntent ci
            INNER JOIN inserted i ON i.Tag = ci.Tag;
        END;
    ');
END;
GO

-- Read-only system health summary
CREATE OR ALTER PROCEDURE sp_GetSystemHealthSummary
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM Admin WHERE isActive = 1) AS ActiveAdmins,
        (SELECT COUNT(*) FROM Citizen WHERE isActive = 1) AS ActiveCitizens,
        (SELECT COUNT(*) FROM NGO WHERE isActive = 1) AS ActiveNGOs,
        (SELECT COUNT(*) FROM RescueTeam WHERE isActive = 1) AS ActiveRescueTeams,
        (SELECT COUNT(*) FROM Disaster WHERE isDeleted = 0) AS TotalDisasters,
        (SELECT COUNT(*) FROM Emergency) AS TotalEmergencies,
        (SELECT COUNT(*) FROM Donation) AS TotalDonations,
        (SELECT COUNT(*) FROM Alert WHERE status = ''Active'') AS ActiveAlerts;
END;
GO

-- Donation summary by period (day|month|year)
CREATE OR ALTER PROCEDURE sp_GetDonationSummary
    @period NVARCHAR(10) = 'month'
AS
BEGIN
    SET NOCOUNT ON;

    IF LOWER(@period) = 'day'
    BEGIN
        SELECT
            CONVERT(DATE, donationDate) AS Bucket,
            COUNT(*) AS DonationCount,
            SUM(ISNULL(amount, 0)) AS TotalAmount
        FROM Donation
        GROUP BY CONVERT(DATE, donationDate)
        ORDER BY Bucket DESC;
        RETURN;
    END;

    IF LOWER(@period) = 'year'
    BEGIN
        SELECT
            DATEFROMPARTS(YEAR(donationDate), 1, 1) AS Bucket,
            COUNT(*) AS DonationCount,
            SUM(ISNULL(amount, 0)) AS TotalAmount
        FROM Donation
        GROUP BY YEAR(donationDate)
        ORDER BY Bucket DESC;
        RETURN;
    END;

    -- Default: month
    SELECT
        DATEFROMPARTS(YEAR(donationDate), MONTH(donationDate), 1) AS Bucket,
        COUNT(*) AS DonationCount,
        SUM(ISNULL(amount, 0)) AS TotalAmount
    FROM Donation
    GROUP BY YEAR(donationDate), MONTH(donationDate)
    ORDER BY Bucket DESC;
END;
GO

PRINT 'Consolidated triggers and procedures created successfully.';
GO
