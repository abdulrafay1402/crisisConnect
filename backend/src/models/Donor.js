const { query } = require('../config/database');

class Donor {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 donorID FROM Donor ORDER BY donorID DESC');
    if (r.recordset.length === 0) return 'DNR001';
    const num = parseInt(r.recordset[0].donorID.substring(3)) + 1;
    return `DNR${num.toString().padStart(3, '0')}`;
  }
  static async findById(donorID) {
    const r = await query('SELECT * FROM Donor WHERE donorID = @donorID', { donorID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Donor ORDER BY createdDate DESC');
    return r.recordset;
  }
  static async findByCitizen(citizenID) {
    const r = await query('SELECT * FROM Donor WHERE citizenID = @citizenID', { citizenID });
    return r.recordset[0] || null;
  }
  static async findTop(limit = 10) {
    const r = await query(`SELECT TOP (@limit) * FROM Donor WHERE isAnonymous = 0 AND totalDonated > 0 ORDER BY totalDonated DESC`, { limit });
    return r.recordset;
  }
  static async insert(d) {
    const donorID = d.donorID || await Donor.generateNextId();
    await query(`INSERT INTO Donor (donorID,citizenID,donorType,organizationName,taxID,totalDonated,donationCount,isVerified,isActive,createdDate,updatedDate,isAnonymous)
      VALUES (@donorID,@citizenID,@donorType,@organizationName,@taxID,0,0,0,1,GETDATE(),GETDATE(),@isAnonymous)`,
      { donorID, citizenID: d.citizenID || null, donorType: d.donorType || 'Individual', organizationName: d.organizationName || null, taxID: d.taxId || d.taxID || null, isAnonymous: d.isAnonymous || false });
    return donorID;
  }
  static async updateStats(donorID, amount) {
    const current = await query('SELECT firstDonationDate FROM Donor WHERE donorID = @donorID', { donorID });
    const hasFirst = current.recordset[0]?.firstDonationDate;

    if (hasFirst) {
      await query(
        'UPDATE Donor SET totalDonated = totalDonated + @amount, donationCount = donationCount + 1, lastDonationDate = GETDATE(), updatedDate = GETDATE() WHERE donorID = @donorID',
        { donorID, amount }
      );
    } else {
      await query(
        'UPDATE Donor SET totalDonated = totalDonated + @amount, donationCount = donationCount + 1, firstDonationDate = GETDATE(), lastDonationDate = GETDATE(), updatedDate = GETDATE() WHERE donorID = @donorID',
        { donorID, amount }
      );
    }
  }
  static async verify(donorID) {
    await query('UPDATE Donor SET isVerified = 1, updatedDate = GETDATE() WHERE donorID = @donorID', { donorID });
  }
  static async delete(donorID) {
    await query('DELETE FROM Donor WHERE donorID = @donorID', { donorID });
  }
  static async getStats() {
    const r = await query('SELECT totalDonated, donationCount, isVerified FROM Donor');
    const rows = r.recordset || [];
    let totalAmount = 0;
    let totalDonations = 0;
    let verified = 0;

    for (const row of rows) {
      totalAmount += Number(row.totalDonated || 0);
      totalDonations += Number(row.donationCount || 0);
      if (row.isVerified) verified += 1;
    }

    return {
      total: rows.length,
      totalAmount,
      totalDonations,
      verified
    };
  }
}

module.exports = Donor;
