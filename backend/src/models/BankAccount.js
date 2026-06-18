const { query } = require('../config/database');

class BankAccount {
  static _optionalColumns = null;

  static async getOptionalColumns() {
    if (BankAccount._optionalColumns) return BankAccount._optionalColumns;
    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('BankAccount')
        AND name IN ('bankType', 'minAmount', 'maxAmount')`);
    const found = new Set((r.recordset || []).map((row) => row.name));
    BankAccount._optionalColumns = {
      bankType: found.has('bankType'),
      minAmount: found.has('minAmount'),
      maxAmount: found.has('maxAmount')
    };
    return BankAccount._optionalColumns;
  }

  static async generateNextId() {
    const r = await query('SELECT TOP 1 accountID FROM BankAccount ORDER BY accountID DESC');
    if (r.recordset.length === 0) return 'BA001';
    const num = parseInt(r.recordset[0].accountID.substring(2)) + 1;
    return `BA${num.toString().padStart(3, '0')}`;
  }

  static async findAll() {
    const r = await query(`SELECT ba.*, a.name as addedByName
      FROM BankAccount ba LEFT JOIN Admin a ON ba.addedBy = a.adminID
      ORDER BY ba.addedDate DESC`);
    return r.recordset;
  }

  static async findActive() {
    const optional = await BankAccount.getOptionalColumns();
    const extra = [];
    if (optional.bankType) extra.push('bankType');
    if (optional.minAmount) extra.push('minAmount');
    if (optional.maxAmount) extra.push('maxAmount');
    const extraSelect = extra.length ? `, ${extra.join(', ')}` : '';
    const r = await query(`SELECT accountID, bankName, accountTitle, accountNumber, iban,
      branchCode, branchName, swiftCode, accountType, currency, purpose${extraSelect}
      FROM BankAccount WHERE isActive = 1 ORDER BY bankName`);
    return r.recordset;
  }

  static async findById(accountID) {
    const r = await query('SELECT * FROM BankAccount WHERE accountID = @accountID', { accountID });
    return r.recordset[0] || null;
  }

  static async insert(data) {
    const accountID = await BankAccount.generateNextId();
    const optional = await BankAccount.getOptionalColumns();
    const columns = [
      'accountID', 'bankName', 'accountTitle', 'accountNumber', 'iban',
      'branchCode', 'branchName', 'swiftCode', 'accountType', 'currency', 'purpose', 'isActive', 'addedBy'
    ];
    const values = [
      '@accountID', '@bankName', '@accountTitle', '@accountNumber', '@iban',
      '@branchCode', '@branchName', '@swiftCode', '@accountType', '@currency', '@purpose', '1', '@addedBy'
    ];
    const minAmount = data.minAmount === null || data.minAmount === undefined || data.minAmount === '' ? null : Number(data.minAmount);
    const maxAmount = data.maxAmount === null || data.maxAmount === undefined || data.maxAmount === '' ? null : Number(data.maxAmount);
    const params = {
      accountID,
      bankName: data.bankName,
      accountTitle: data.accountTitle,
      accountNumber: data.accountNumber,
      iban: data.iban || null,
      branchCode: data.branchCode || null,
      branchName: data.branchName || null,
      swiftCode: data.swiftCode || null,
      accountType: data.accountType || 'Current',
      currency: data.currency || 'PKR',
      purpose: data.purpose || null,
      addedBy: data.addedBy
    };
    if (optional.bankType) {
      columns.push('bankType');
      values.push('@bankType');
      params.bankType = data.bankType || 'Traditional';
    }
    if (optional.minAmount) {
      columns.push('minAmount');
      values.push('@minAmount');
      params.minAmount = Number.isFinite(minAmount) ? minAmount : null;
    }
    if (optional.maxAmount) {
      columns.push('maxAmount');
      values.push('@maxAmount');
      params.maxAmount = Number.isFinite(maxAmount) ? maxAmount : null;
    }

    await query(`INSERT INTO BankAccount (${columns.join(', ')}) VALUES (${values.join(', ')})`, params);
    return accountID;
  }

  static async update(accountID, data) {
    const optional = await BankAccount.getOptionalColumns();
    const setParts = [
      'bankName = @bankName',
      'accountTitle = @accountTitle',
      'accountNumber = @accountNumber',
      'iban = @iban',
      'branchCode = @branchCode',
      'branchName = @branchName',
      'swiftCode = @swiftCode',
      'accountType = @accountType',
      'currency = @currency',
      'purpose = @purpose',
      'lastUpdated = GETDATE()'
    ];
    const minAmount = data.minAmount === null || data.minAmount === undefined || data.minAmount === '' ? null : Number(data.minAmount);
    const maxAmount = data.maxAmount === null || data.maxAmount === undefined || data.maxAmount === '' ? null : Number(data.maxAmount);
    const params = {
      accountID,
      bankName: data.bankName,
      accountTitle: data.accountTitle,
      accountNumber: data.accountNumber,
      iban: data.iban || null,
      branchCode: data.branchCode || null,
      branchName: data.branchName || null,
      swiftCode: data.swiftCode || null,
      accountType: data.accountType || 'Current',
      currency: data.currency || 'PKR',
      purpose: data.purpose || null
    };

    if (optional.bankType) {
      setParts.push('bankType = @bankType');
      params.bankType = data.bankType || 'Traditional';
    }
    if (optional.minAmount) {
      setParts.push('minAmount = @minAmount');
      params.minAmount = Number.isFinite(minAmount) ? minAmount : null;
    }
    if (optional.maxAmount) {
      setParts.push('maxAmount = @maxAmount');
      params.maxAmount = Number.isFinite(maxAmount) ? maxAmount : null;
    }

    await query(`UPDATE BankAccount SET ${setParts.join(', ')} WHERE accountID = @accountID`, params);
  }

  static async toggleActive(accountID, isActive) {
    await query('UPDATE BankAccount SET isActive = @isActive, lastUpdated = GETDATE() WHERE accountID = @accountID',
      { accountID, isActive });
  }

  static async delete(accountID) {
    await query('DELETE FROM BankAccount WHERE accountID = @accountID', { accountID });
  }
}

module.exports = BankAccount;
