const { query } = require('../config/database');

class Donation {
  static _optionalColumns = null;
  static _bankAccountOptionalColumns = null;
  static _statusOptionalColumns = null;

  static async getOptionalColumns() {
    if (Donation._optionalColumns) return Donation._optionalColumns;
    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('Donation')
        AND name IN ('receiptImagePath')`);
    const found = new Set((r.recordset || []).map((row) => row.name));
    Donation._optionalColumns = {
      receiptImagePath: found.has('receiptImagePath')
    };
    return Donation._optionalColumns;
  }

  static async getBankAccountOptionalColumns() {
    if (Donation._bankAccountOptionalColumns) return Donation._bankAccountOptionalColumns;
    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('BankAccount')
        AND name IN ('bankType')`);
    const found = new Set((r.recordset || []).map((row) => row.name));
    Donation._bankAccountOptionalColumns = {
      bankType: found.has('bankType')
    };
    return Donation._bankAccountOptionalColumns;
  }

  static async getStatusOptionalColumns() {
    if (Donation._statusOptionalColumns) return Donation._statusOptionalColumns;
    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('Donation')
        AND name IN ('processedBy', 'processedDate', 'updatedDate')`);
    const found = new Set((r.recordset || []).map((row) => row.name));
    Donation._statusOptionalColumns = {
      processedBy: found.has('processedBy'),
      processedDate: found.has('processedDate'),
      updatedDate: found.has('updatedDate')
    };
    return Donation._statusOptionalColumns;
  }

  static async generateNextId() {
    const r = await query('SELECT TOP 1 donationID FROM Donation ORDER BY donationID DESC');
    if (r.recordset.length === 0) return 'DON001';
    const num = parseInt(r.recordset[0].donationID.substring(3)) + 1;
    return `DON${num.toString().padStart(3, '0')}`;
  }
  static async findById(donationID) {
    const optional = await Donation.getBankAccountOptionalColumns();
    const bankTypeSelect = optional.bankType ? ', ba.bankType' : '';
    const r = await query(`SELECT d.*, c.name as donorName,
      ba.bankName as targetBankName, ba.accountTitle as targetAccountTitle${bankTypeSelect}
      FROM Donation d
      LEFT JOIN Citizen c ON d.citizenID = c.citizenID
      LEFT JOIN BankAccount ba ON d.bankAccountID = ba.accountID
      WHERE d.donationID = @donationID`, { donationID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const optional = await Donation.getBankAccountOptionalColumns();
    const bankTypeSelect = optional.bankType ? ', ba.bankType' : '';
    const r = await query(`SELECT d.*, c.name as donorName,
      ba.bankName as targetBankName${bankTypeSelect}
      FROM Donation d
      LEFT JOIN Citizen c ON d.citizenID = c.citizenID
      LEFT JOIN BankAccount ba ON d.bankAccountID = ba.accountID
      ORDER BY d.donationDate DESC`);
    return r.recordset;
  }
  static async findRecent(limit = 10) {
    const r = await query(`SELECT TOP (@limit) d.*, c.name as donorName
      FROM Donation d LEFT JOIN Citizen c ON d.citizenID = c.citizenID ORDER BY d.donationDate DESC`, { limit });
    return r.recordset;
  }
  static async findByCitizen(citizenID) {
    const optional = await Donation.getBankAccountOptionalColumns();
    const bankTypeSelect = optional.bankType ? ', ba.bankType' : '';
    const r = await query(`SELECT d.*, ba.bankName as targetBankName, ba.accountTitle as targetAccountTitle, ba.bankType
      `.replace(', ba.bankType', bankTypeSelect) + `
      FROM Donation d
      LEFT JOIN BankAccount ba ON d.bankAccountID = ba.accountID
      WHERE d.citizenID = @citizenID ORDER BY d.donationDate DESC`, { citizenID });
    return r.recordset;
  }
  static async findByDisaster(disasterID) {
    const r = await query('SELECT d.*, c.name as donorName FROM Donation d LEFT JOIN Citizen c ON d.citizenID = c.citizenID WHERE d.disasterID = @disasterID ORDER BY d.donationDate DESC', { disasterID });
    return r.recordset;
  }
  static async findByDonor(donorID) {
    const r = await query('SELECT * FROM Donation WHERE donorID = @donorID ORDER BY donationDate DESC', { donorID });
    return r.recordset;
  }
  static async insert(d) {
    const donationID = d.donationID || await Donation.generateNextId();
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const optional = await Donation.getOptionalColumns();
    const columns = [
      'donationID', 'donorID', 'citizenID', 'amount', 'currency', 'donationType',
      'itemDescription', 'itemQuantity', 'itemUnit', 'estimatedValue', 'allocationTarget',
      'disasterID', 'ngoID', 'rescueTeamID', 'paymentMethod', 'transactionID', 'bankAccountID',
      'senderAccountNumber', 'status', 'donationDate', 'receiptNumber', 'isAnonymous', 'message', 'isTaxDeductible'
    ];
    const values = [
      '@donationID', '@donorID', '@citizenID', '@amount', '@currency', '@donationType',
      '@itemDescription', '@itemQuantity', '@itemUnit', '@estimatedValue', '@allocationTarget',
      '@disasterID', '@ngoID', '@rescueTeamID', '@paymentMethod', '@transactionID', '@bankAccountID',
      '@senderAccountNumber', "'Pending'", 'GETDATE()', '@receiptNumber', '@isAnonymous', '@message', '@isTaxDeductible'
    ];
    const params = {
      donationID,
      donorID: d.donorID || null,
      citizenID: d.citizenID,
      amount: d.amount || 0,
      currency: d.currency || 'PKR',
      donationType: d.donationType || 'Money',
      itemDescription: d.itemDescription || null,
      itemQuantity: d.itemQuantity || null,
      itemUnit: d.itemUnit || null,
      estimatedValue: d.estimatedValue || null,
      allocationTarget: d.allocationTarget || 'General',
      disasterID: d.disasterID || null,
      ngoID: d.ngoID || null,
      rescueTeamID: d.rescueTeamID || null,
      paymentMethod: d.paymentMethod || null,
      transactionID: d.transactionID || null,
      bankAccountID: d.bankAccountID || null,
      senderAccountNumber: d.senderAccountNumber || null,
      receiptNumber,
      isAnonymous: d.isAnonymous || false,
      message: d.message || null,
      isTaxDeductible: d.isTaxDeductible !== false
    };

    if (optional.receiptImagePath) {
      columns.push('receiptImagePath');
      values.push('@receiptImagePath');
      params.receiptImagePath = d.receiptImagePath || null;
    }

    await query(`INSERT INTO Donation (${columns.join(',')}) VALUES (${values.join(',')})`, params);
    return { donationID, receiptNumber };
  }
  static async updateStatus(donationID, status, processedBy) {
    const optional = await Donation.getStatusOptionalColumns();
    const setParts = ['status = @status'];
    const params = { donationID, status };

    if (optional.processedBy) {
      setParts.push('processedBy = @processedBy');
      params.processedBy = processedBy || null;
    }

    if (optional.processedDate && ['Completed', 'Distributed'].includes(status)) {
      setParts.push('processedDate = @processedDate');
      params.processedDate = new Date();
    }

    if (optional.updatedDate) {
      setParts.push('updatedDate = GETDATE()');
    }

    await query(
      `UPDATE Donation SET ${setParts.join(', ')} WHERE donationID = @donationID`,
      params
    );
  }
  static async delete(donationID) {
    await query('DELETE FROM Donation WHERE donationID = @donationID', { donationID });
  }
  static async getStats() {
    const r = await query('SELECT amount, donorID, status, donationType FROM Donation');
    const rows = r.recordset || [];
    const donorSet = new Set();
    let totalAmount = 0;
    let completed = 0;
    let pending = 0;
    const byTypeMap = new Map();

    for (const row of rows) {
      totalAmount += Number(row.amount || 0);
      if (row.donorID) donorSet.add(row.donorID);
      const normalizedStatus = String(row.status || '').trim().toUpperCase();
      if (normalizedStatus === 'COMPLETED') completed += 1;
      if (normalizedStatus === 'PENDING') pending += 1;

      const typeKey = row.donationType || 'Other';
      if (!byTypeMap.has(typeKey)) {
        byTypeMap.set(typeKey, { donationType: typeKey, count: 0, totalAmount: 0 });
      }
      const bucket = byTypeMap.get(typeKey);
      bucket.count += 1;
      bucket.totalAmount += Number(row.amount || 0);
    }

    const totalDonations = rows.length;
    const byType = Array.from(byTypeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      total: totalDonations,
      totalAmount,
      uniqueDonors: donorSet.size,
      avgAmount: totalDonations ? totalAmount / totalDonations : 0,
      completed,
      pending,
      totalDonations,
      totalReceived: totalAmount,
      byType
    };
  }
  static async getMonthlySummary() {
    const r = await query('SELECT donationDate, amount FROM Donation ORDER BY donationDate DESC');
    const monthly = {};

    for (const row of r.recordset || []) {
      if (!row.donationDate) continue;
      const d = new Date(row.donationDate);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[month]) monthly[month] = { month, count: 0, total: 0 };
      monthly[month].count += 1;
      monthly[month].total += Number(row.amount || 0);
    }

    return Object.values(monthly).sort((a, b) => b.month.localeCompare(a.month));
  }
}

module.exports = Donation;
