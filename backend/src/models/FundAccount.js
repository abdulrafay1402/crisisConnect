const { query } = require('../config/database');

class FundAccount {
  static _optionalColumns = null;
  static _transactionOptionalColumns = null;
  static _bankAccountOptionalColumns = null;

  static async getOptionalColumns() {
    if (FundAccount._optionalColumns) return FundAccount._optionalColumns;

    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('FundAccount')
        AND name IN ('swiftCode', 'accountType', 'currency', 'purpose', 'bankType', 'minAmount', 'maxAmount')`);

    const available = new Set((r.recordset || []).map((row) => row.name));
    FundAccount._optionalColumns = {
      swiftCode: available.has('swiftCode'),
      accountType: available.has('accountType'),
      currency: available.has('currency'),
      purpose: available.has('purpose'),
      bankType: available.has('bankType'),
      minAmount: available.has('minAmount'),
      maxAmount: available.has('maxAmount')
    };

    return FundAccount._optionalColumns;
  }

  static async createTable() {
    await query(`
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
      )
    `);
    await query(`IF COL_LENGTH('FundAccount', 'swiftCode') IS NULL ALTER TABLE FundAccount ADD swiftCode VARCHAR(20) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'accountType') IS NULL ALTER TABLE FundAccount ADD accountType VARCHAR(50) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'currency') IS NULL ALTER TABLE FundAccount ADD currency VARCHAR(10) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'purpose') IS NULL ALTER TABLE FundAccount ADD purpose VARCHAR(255) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'bankType') IS NULL ALTER TABLE FundAccount ADD bankType VARCHAR(30) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'minAmount') IS NULL ALTER TABLE FundAccount ADD minAmount DECIMAL(12,2) NULL`);
    await query(`IF COL_LENGTH('FundAccount', 'maxAmount') IS NULL ALTER TABLE FundAccount ADD maxAmount DECIMAL(12,2) NULL`);
    FundAccount._optionalColumns = null;

    await query(`
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
        notes TEXT NULL
      )
    `);
    await query(`IF COL_LENGTH('FundTransaction', 'processedDate') IS NULL ALTER TABLE FundTransaction ADD processedDate DATETIME NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'processedBy') IS NULL ALTER TABLE FundTransaction ADD processedBy VARCHAR(10) NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'fromBankAccountID') IS NULL ALTER TABLE FundTransaction ADD fromBankAccountID VARCHAR(10) NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'recipientAccountID') IS NULL ALTER TABLE FundTransaction ADD recipientAccountID VARCHAR(10) NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'senderAccountNumber') IS NULL ALTER TABLE FundTransaction ADD senderAccountNumber VARCHAR(50) NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'transactionRef') IS NULL ALTER TABLE FundTransaction ADD transactionRef VARCHAR(100) NULL`);
    await query(`IF COL_LENGTH('FundTransaction', 'receiptImagePath') IS NULL ALTER TABLE FundTransaction ADD receiptImagePath VARCHAR(500) NULL`);
    FundAccount._transactionOptionalColumns = null;
  }

  static async getTransactionOptionalColumns() {
    if (FundAccount._transactionOptionalColumns) return FundAccount._transactionOptionalColumns;

    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('FundTransaction')
        AND name IN ('processedBy', 'processedDate', 'notes', 'fromBankAccountID', 'recipientAccountID', 'senderAccountNumber', 'transactionRef', 'receiptImagePath')`);

    const available = new Set((r.recordset || []).map((row) => row.name));
    FundAccount._transactionOptionalColumns = {
      processedBy: available.has('processedBy'),
      processedDate: available.has('processedDate'),
      notes: available.has('notes'),
      fromBankAccountID: available.has('fromBankAccountID'),
      recipientAccountID: available.has('recipientAccountID'),
      senderAccountNumber: available.has('senderAccountNumber'),
      transactionRef: available.has('transactionRef'),
      receiptImagePath: available.has('receiptImagePath')
    };

    return FundAccount._transactionOptionalColumns;
  }

  static async getBankAccountOptionalColumns() {
    if (FundAccount._bankAccountOptionalColumns) return FundAccount._bankAccountOptionalColumns;

    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('BankAccount')
        AND name IN ('bankType', 'currency')`);

    const available = new Set((r.recordset || []).map((row) => row.name));
    FundAccount._bankAccountOptionalColumns = {
      bankType: available.has('bankType'),
      currency: available.has('currency')
    };

    return FundAccount._bankAccountOptionalColumns;
  }

  // --- Fund Accounts ---
  static async generateAccountId() {
    const r = await query('SELECT TOP 1 accountID FROM FundAccount ORDER BY accountID DESC');
    if (r.recordset.length === 0) return 'FA001';
    const num = parseInt(r.recordset[0].accountID.substring(2)) + 1;
    return `FA${num.toString().padStart(3, '0')}`;
  }

  static async findAll() {
    const r = await query('SELECT * FROM FundAccount ORDER BY addedDate DESC');
    return r.recordset;
  }

  static async findByOwner(ownerID, ownerType) {
    const r = await query(
      'SELECT * FROM FundAccount WHERE ownerID = @ownerID AND ownerType = @ownerType ORDER BY addedDate DESC',
      { ownerID, ownerType }
    );
    return r.recordset;
  }

  static async findById(accountID) {
    const r = await query('SELECT * FROM FundAccount WHERE accountID = @accountID', { accountID });
    return r.recordset[0] || null;
  }

  static async insert(data) {
    const accountID = await this.generateAccountId();
    const optional = await FundAccount.getOptionalColumns();
    const columns = [
      'accountID', 'ownerID', 'ownerType', 'bankName', 'accountTitle', 'accountNumber', 'iban', 'branchCode', 'branchName'
    ];
    const values = [
      '@accountID', '@ownerID', '@ownerType', '@bankName', '@accountTitle', '@accountNumber', '@iban', '@branchCode', '@branchName'
    ];
    const params = {
      accountID,
      ownerID: data.ownerID,
      ownerType: data.ownerType,
      bankName: data.bankName,
      accountTitle: data.accountTitle,
      accountNumber: data.accountNumber,
      iban: data.iban || null,
      branchCode: data.branchCode || null,
      branchName: data.branchName || null
    };

    if (optional.swiftCode) { columns.push('swiftCode'); values.push('@swiftCode'); params.swiftCode = data.swiftCode || null; }
    if (optional.accountType) { columns.push('accountType'); values.push('@accountType'); params.accountType = data.accountType || 'Current'; }
    if (optional.currency) { columns.push('currency'); values.push('@currency'); params.currency = data.currency || 'PKR'; }
    if (optional.purpose) { columns.push('purpose'); values.push('@purpose'); params.purpose = data.purpose || null; }
    if (optional.bankType) { columns.push('bankType'); values.push('@bankType'); params.bankType = data.bankType || 'Traditional'; }
    if (optional.minAmount) { columns.push('minAmount'); values.push('@minAmount'); params.minAmount = data.minAmount != null ? data.minAmount : null; }
    if (optional.maxAmount) { columns.push('maxAmount'); values.push('@maxAmount'); params.maxAmount = data.maxAmount != null ? data.maxAmount : null; }

    await query(`INSERT INTO FundAccount (${columns.join(', ')}) VALUES (${values.join(', ')})`, params);
    return accountID;
  }

  static async update(accountID, data) {
    const optional = await FundAccount.getOptionalColumns();
    const setParts = [
      'bankName=@bankName',
      'accountTitle=@accountTitle',
      'accountNumber=@accountNumber',
      'iban=@iban',
      'branchCode=@branchCode',
      'branchName=@branchName'
    ];
    const params = {
      accountID,
      bankName: data.bankName,
      accountTitle: data.accountTitle,
      accountNumber: data.accountNumber,
      iban: data.iban || null,
      branchCode: data.branchCode || null,
      branchName: data.branchName || null
    };

    if (optional.swiftCode) { setParts.push('swiftCode=@swiftCode'); params.swiftCode = data.swiftCode || null; }
    if (optional.accountType) { setParts.push('accountType=@accountType'); params.accountType = data.accountType || 'Current'; }
    if (optional.currency) { setParts.push('currency=@currency'); params.currency = data.currency || 'PKR'; }
    if (optional.purpose) { setParts.push('purpose=@purpose'); params.purpose = data.purpose || null; }
    if (optional.bankType) { setParts.push('bankType=@bankType'); params.bankType = data.bankType || 'Traditional'; }
    if (optional.minAmount) { setParts.push('minAmount=@minAmount'); params.minAmount = data.minAmount != null ? data.minAmount : null; }
    if (optional.maxAmount) { setParts.push('maxAmount=@maxAmount'); params.maxAmount = data.maxAmount != null ? data.maxAmount : null; }

    setParts.push('lastUpdated=GETDATE()');
    await query(`UPDATE FundAccount SET ${setParts.join(', ')} WHERE accountID=@accountID`, params);
  }

  static async toggleActive(accountID) {
    await query('UPDATE FundAccount SET isActive = CASE WHEN isActive=1 THEN 0 ELSE 1 END, lastUpdated=GETDATE() WHERE accountID=@accountID', { accountID });
  }

  static async delete(accountID) {
    await query('DELETE FROM FundAccount WHERE accountID = @accountID', { accountID });
  }

  // --- Fund Transactions ---
  static async generateTransactionId() {
    const r = await query('SELECT TOP 1 transactionID FROM FundTransaction ORDER BY transactionID DESC');
    if (r.recordset.length === 0) return 'FT001';
    const num = parseInt(r.recordset[0].transactionID.substring(2)) + 1;
    return `FT${num.toString().padStart(3, '0')}`;
  }

  static async getTransactions(ownerID) {
    const optional = await FundAccount.getTransactionOptionalColumns();
    const fromAccountSelect = optional.fromBankAccountID
      ? `,
        t.fromBankAccountID,
        CASE
          WHEN t.fromBankAccountID IS NOT NULL THEN CONCAT(ISNULL(sa.bankName,''), ' • ', ISNULL(sa.accountNumber,''))
          ELSE NULL
        END as fromAccountLabel`
      : '';
    const accountSelect = optional.recipientAccountID
      ? `,
        t.recipientAccountID,
        CASE
          WHEN t.recipientAccountID IS NOT NULL THEN CONCAT(ISNULL(ra.bankName,''), ' • ', ISNULL(ra.accountNumber,''))
          ELSE NULL
        END as recipientAccountLabel`
      : '';
    const senderSelect = optional.senderAccountNumber ? ', t.senderAccountNumber' : '';
    const refSelect = optional.transactionRef ? ', t.transactionRef' : '';
    const receiptSelect = optional.receiptImagePath ? ', t.receiptImagePath' : '';

    const r = await query(
      `SELECT t.*, 
        CASE WHEN t.fromType='Admin' THEN 'Admin' 
             WHEN t.fromType='Citizen' THEN (SELECT name FROM Citizen WHERE citizenID=t.fromID)
             WHEN t.fromType='NGO' THEN (SELECT ngoName FROM NGO WHERE ngoID=t.fromID)
             WHEN t.fromType='RescueTeam' THEN (SELECT teamName FROM RescueTeam WHERE teamID=t.fromID)
        END as fromName,
        CASE WHEN t.toType='Admin' THEN 'Admin'
             WHEN t.toType='NGO' THEN (SELECT ngoName FROM NGO WHERE ngoID=t.toID)
             WHEN t.toType='RescueTeam' THEN (SELECT teamName FROM RescueTeam WHERE teamID=t.toID)
           END as toName${fromAccountSelect}${accountSelect}${senderSelect}${refSelect}${receiptSelect}
       FROM FundTransaction t
          LEFT JOIN BankAccount sa ON t.fromBankAccountID = sa.accountID
       LEFT JOIN FundAccount ra ON t.recipientAccountID = ra.accountID
       WHERE t.fromID = @ownerID OR t.toID = @ownerID
       ORDER BY t.transactionDate DESC`,
      { ownerID }
    );
    return r.recordset;
  }

  static async getAllTransactions() {
    const optional = await FundAccount.getTransactionOptionalColumns();
    const fromAccountSelect = optional.fromBankAccountID
      ? `,
        t.fromBankAccountID,
        CASE
          WHEN t.fromBankAccountID IS NOT NULL THEN CONCAT(ISNULL(sa.bankName,''), ' • ', ISNULL(sa.accountNumber,''))
          ELSE NULL
        END as fromAccountLabel`
      : '';
    const accountSelect = optional.recipientAccountID
      ? `,
        t.recipientAccountID,
        CASE
          WHEN t.recipientAccountID IS NOT NULL THEN CONCAT(ISNULL(ra.bankName,''), ' • ', ISNULL(ra.accountNumber,''))
          ELSE NULL
        END as recipientAccountLabel`
      : '';
    const senderSelect = optional.senderAccountNumber ? ', t.senderAccountNumber' : '';
    const refSelect = optional.transactionRef ? ', t.transactionRef' : '';
    const receiptSelect = optional.receiptImagePath ? ', t.receiptImagePath' : '';

    const r = await query(
      `SELECT t.*, 
        CASE WHEN t.fromType='Admin' THEN 'Admin' 
             WHEN t.fromType='Citizen' THEN (SELECT name FROM Citizen WHERE citizenID=t.fromID)
             WHEN t.fromType='NGO' THEN (SELECT ngoName FROM NGO WHERE ngoID=t.fromID)
             WHEN t.fromType='RescueTeam' THEN (SELECT teamName FROM RescueTeam WHERE teamID=t.fromID)
        END as fromName,
        CASE WHEN t.toType='Admin' THEN 'Admin'
             WHEN t.toType='NGO' THEN (SELECT ngoName FROM NGO WHERE ngoID=t.toID)
             WHEN t.toType='RescueTeam' THEN (SELECT teamName FROM RescueTeam WHERE teamID=t.toID)
           END as toName${fromAccountSelect}${accountSelect}${senderSelect}${refSelect}${receiptSelect}
       FROM FundTransaction t
          LEFT JOIN BankAccount sa ON t.fromBankAccountID = sa.accountID
       LEFT JOIN FundAccount ra ON t.recipientAccountID = ra.accountID
       ORDER BY t.transactionDate DESC`
    );
    return r.recordset;
  }

  static async findTransactionById(transactionID) {
    const r = await query('SELECT * FROM FundTransaction WHERE transactionID = @transactionID', { transactionID });
    return r.recordset[0] || null;
  }

  static async insertTransaction({ fromType, fromID, toType, toID, amount, purpose, disasterID, notes, fromBankAccountID, recipientAccountID, senderAccountNumber, transactionRef, receiptImagePath }) {
    const transactionID = await this.generateTransactionId();
    const optional = await FundAccount.getTransactionOptionalColumns();

    const columns = ['transactionID', 'fromType', 'fromID', 'toType', 'toID', 'amount', 'purpose', 'disasterID', 'status'];
    const values = ['@transactionID', '@fromType', '@fromID', '@toType', '@toID', '@amount', '@purpose', '@disasterID', "'InProcess'"];
    const params = { transactionID, fromType, fromID, toType, toID, amount, purpose: purpose || null, disasterID: disasterID || null };

    if (optional.notes) {
      columns.push('notes');
      values.push('@notes');
      params.notes = notes || null;
    }
    if (optional.fromBankAccountID) {
      columns.push('fromBankAccountID');
      values.push('@fromBankAccountID');
      params.fromBankAccountID = fromBankAccountID || null;
    }
    if (optional.recipientAccountID) {
      columns.push('recipientAccountID');
      values.push('@recipientAccountID');
      params.recipientAccountID = recipientAccountID || null;
    }
    if (optional.senderAccountNumber) {
      columns.push('senderAccountNumber');
      values.push('@senderAccountNumber');
      params.senderAccountNumber = senderAccountNumber || null;
    }
    if (optional.transactionRef) {
      columns.push('transactionRef');
      values.push('@transactionRef');
      params.transactionRef = transactionRef || null;
    }
    if (optional.receiptImagePath) {
      columns.push('receiptImagePath');
      values.push('@receiptImagePath');
      params.receiptImagePath = receiptImagePath || null;
    }

    await query(
      `INSERT INTO FundTransaction (${columns.join(', ')}) VALUES (${values.join(', ')})`,
      params
    );
    return transactionID;
  }

  static async updateTransactionStatus(transactionID, status, processedBy) {
    const optional = await FundAccount.getTransactionOptionalColumns();
    const setParts = ['status=@status'];
    const params = { transactionID, status };

    if (optional.processedBy) {
      setParts.push('processedBy=@processedBy');
      params.processedBy = processedBy || null;
    }

    if (optional.processedDate && ['Completed', 'Rejected', 'Cancelled'].includes(status)) {
      setParts.push('processedDate=GETDATE()');
    }

    await query(
      `UPDATE FundTransaction SET ${setParts.join(', ')} WHERE transactionID=@transactionID`,
      params
    );
  }

  static async confirmTransactionReceived(transactionID, receiverID, receiverRole, note) {
    const transaction = await FundAccount.findTransactionById(transactionID);
    if (!transaction) return null;

    const normalizedRole = String(receiverRole || '').trim();
    if (String(transaction.toID).trim() !== String(receiverID).trim() || String(transaction.toType).trim() !== normalizedRole) {
      return false;
    }

    if (String(transaction.status).trim() === 'Completed') {
      return transaction;
    }

    const optional = await FundAccount.getTransactionOptionalColumns();
    const setParts = ['status=@status'];
    const params = { transactionID, status: 'Completed' };

    if (optional.processedDate) {
      setParts.push('processedDate=GETDATE()');
    }

    if (optional.processedBy) {
      setParts.push('processedBy=@processedBy');
      params.processedBy = receiverID;
    }

    if (optional.notes && note && String(note).trim()) {
      setParts.push(`notes = CASE
        WHEN notes IS NULL OR LTRIM(RTRIM(CAST(notes AS VARCHAR(MAX)))) = '' THEN @note
        ELSE CONCAT(CAST(notes AS VARCHAR(MAX)), CHAR(10), @note)
      END`);
      params.note = String(note).trim();
    }

    await query(`UPDATE FundTransaction SET ${setParts.join(', ')} WHERE transactionID=@transactionID`, params);
    return FundAccount.findTransactionById(transactionID);
  }

  static async getAdminFundSummary() {
    const donationResult = await query(`
      SELECT
        ISNULL(SUM(CASE
          WHEN UPPER(LTRIM(RTRIM(ISNULL(status, '')))) IN ('RECEIVED', 'DISTRIBUTED', 'COMPLETED') THEN amount
          WHEN UPPER(LTRIM(RTRIM(ISNULL(status, '')))) NOT IN ('', 'PENDING', 'REJECTED', 'CANCELLED') THEN amount
          ELSE 0
        END), 0) AS totalCollected,
        ISNULL(SUM(CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(status, '')))) = 'PENDING' THEN amount ELSE 0 END), 0) AS pendingVerification,
        COUNT(*) AS totalDonations
      FROM Donation
    `);

    const txResult = await query(`
      SELECT
        ISNULL(SUM(CASE WHEN fromType='Admin' THEN amount ELSE 0 END), 0) AS totalAllocated,
        ISNULL(SUM(CASE WHEN fromType='Admin' AND UPPER(LTRIM(RTRIM(ISNULL(status, '')))) IN ('PENDING','INPROCESS') THEN amount ELSE 0 END), 0) AS inProcessAmount,
        ISNULL(SUM(CASE WHEN fromType='Admin' AND UPPER(LTRIM(RTRIM(ISNULL(status, ''))))='COMPLETED' THEN amount ELSE 0 END), 0) AS completedAmount,
        ISNULL(SUM(CASE WHEN fromType='Admin' AND UPPER(LTRIM(RTRIM(ISNULL(status, ''))))='REJECTED' THEN amount ELSE 0 END), 0) AS rejectedAmount,
        COUNT(CASE WHEN fromType='Admin' THEN 1 END) AS allocationCount
      FROM FundTransaction
    `);

    const donation = donationResult.recordset?.[0] || {};
    const tx = txResult.recordset?.[0] || {};
    const totalCollected = Number(donation.totalCollected || 0);
    const inProcessAmount = Number(tx.inProcessAmount || 0);
    const completedAmount = Number(tx.completedAmount || 0);
    const availableAmount = Math.max(0, totalCollected - inProcessAmount - completedAmount);

    return {
      totalCollected,
      pendingVerification: Number(donation.pendingVerification || 0),
      totalDonations: Number(donation.totalDonations || 0),
      totalAllocated: Number(tx.totalAllocated || 0),
      inProcessAmount,
      completedAmount,
      rejectedAmount: Number(tx.rejectedAmount || 0),
      availableAmount,
      allocationCount: Number(tx.allocationCount || 0)
    };
  }

  static async getAdminSourceAccountsWithBalances() {
    const bankOptional = await FundAccount.getBankAccountOptionalColumns();
    const bankTypeSelect = bankOptional.bankType ? 'ba.bankType,' : "NULL AS bankType,";
    const currencySelect = bankOptional.currency ? 'ba.currency,' : "'PKR' AS currency,";

    const r = await query(`
      WITH Received AS (
        SELECT
          d.bankAccountID AS accountID,
          ISNULL(SUM(CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(d.status, '')))) IN ('RECEIVED', 'DISTRIBUTED', 'COMPLETED') THEN d.amount
            WHEN UPPER(LTRIM(RTRIM(ISNULL(d.status, '')))) NOT IN ('', 'PENDING', 'REJECTED', 'CANCELLED') THEN d.amount
            ELSE 0
          END), 0) AS receivedAmount
        FROM Donation d
        WHERE d.bankAccountID IS NOT NULL
        GROUP BY d.bankAccountID
      ),
      Allocated AS (
        SELECT
          t.fromBankAccountID AS accountID,
          ISNULL(SUM(CASE
            WHEN t.fromType = 'Admin'
              AND UPPER(LTRIM(RTRIM(ISNULL(t.status, '')))) IN ('PENDING', 'INPROCESS', 'COMPLETED')
            THEN t.amount
            ELSE 0
          END), 0) AS allocatedAmount
        FROM FundTransaction t
        WHERE t.fromBankAccountID IS NOT NULL
        GROUP BY t.fromBankAccountID
      )
      SELECT
        ba.accountID,
        ba.bankName,
        ba.accountTitle,
        ba.accountNumber,
        ${bankTypeSelect}
        ${currencySelect}
        ba.isActive,
        ISNULL(r.receivedAmount, 0) AS receivedAmount,
        ISNULL(a.allocatedAmount, 0) AS allocatedAmount,
        CASE
          WHEN ISNULL(r.receivedAmount, 0) - ISNULL(a.allocatedAmount, 0) < 0 THEN 0
          ELSE ISNULL(r.receivedAmount, 0) - ISNULL(a.allocatedAmount, 0)
        END AS availableAmount
      FROM BankAccount ba
      LEFT JOIN Received r ON r.accountID = ba.accountID
      LEFT JOIN Allocated a ON a.accountID = ba.accountID
      WHERE ba.isActive = 1
      ORDER BY ba.bankName, ba.accountTitle
    `);

    return r.recordset || [];
  }
}

module.exports = FundAccount;
