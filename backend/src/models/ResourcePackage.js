const { query } = require('../config/database');

class ResourcePackage {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 packageID FROM ResourcePackage ORDER BY packageID DESC');
    if (r.recordset.length === 0) return 'PKG001';
    const num = parseInt(r.recordset[0].packageID.substring(3)) + 1;
    return `PKG${num.toString().padStart(3, '0')}`;
  }
  static async findById(packageID) {
    const r = await query(`
      SELECT rp.*, res.resourceName, res.unit, res.costPerUnit,
             CASE WHEN rp.requestedByType = 'NGO' THEN ngo.ngoName
                  WHEN rp.requestedByType = 'RescueTeam' THEN rt.teamName
                  ELSE rp.requestedBy END AS requesterName
      FROM ResourcePackage rp
      LEFT JOIN Resource res ON rp.resourceID = res.resourceID
      LEFT JOIN NGO ngo ON rp.requestedByType = 'NGO' AND rp.requestedBy = ngo.ngoID
      LEFT JOIN RescueTeam rt ON rp.requestedByType = 'RescueTeam' AND rp.requestedBy = rt.teamID
      WHERE rp.packageID = @packageID
    `, { packageID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query(`
      SELECT rp.*, res.resourceName, res.unit, res.costPerUnit,
             CASE WHEN rp.requestedByType = 'NGO' THEN ngo.ngoName
                  WHEN rp.requestedByType = 'RescueTeam' THEN rt.teamName
                  ELSE rp.requestedBy END AS requesterName
      FROM ResourcePackage rp
      LEFT JOIN Resource res ON rp.resourceID = res.resourceID
      LEFT JOIN NGO ngo ON rp.requestedByType = 'NGO' AND rp.requestedBy = ngo.ngoID
      LEFT JOIN RescueTeam rt ON rp.requestedByType = 'RescueTeam' AND rp.requestedBy = rt.teamID
      ORDER BY rp.requestedDate DESC
    `);
    return r.recordset;
  }
  static async findPending() {
    const r = await query(`
      SELECT rp.*, res.resourceName, res.unit,
             CASE WHEN rp.requestedByType = 'NGO' THEN ngo.ngoName
                  WHEN rp.requestedByType = 'RescueTeam' THEN rt.teamName
                  ELSE rp.requestedBy END AS requesterName
      FROM ResourcePackage rp
      LEFT JOIN Resource res ON rp.resourceID = res.resourceID
      LEFT JOIN NGO ngo ON rp.requestedByType = 'NGO' AND rp.requestedBy = ngo.ngoID
      LEFT JOIN RescueTeam rt ON rp.requestedByType = 'RescueTeam' AND rp.requestedBy = rt.teamID
      WHERE rp.status = 'Pending'
      ORDER BY CASE rp.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END, rp.requestedDate
    `);
    return r.recordset;
  }
  static async findByRequester(requestedBy, requestedByType) {
    const hasType = !!requestedByType;
    const r = await query(`
      SELECT rp.*, res.resourceName, res.unit, res.costPerUnit
      FROM ResourcePackage rp
      LEFT JOIN Resource res ON rp.resourceID = res.resourceID
      WHERE rp.requestedBy = @requestedBy
      ${hasType ? 'AND rp.requestedByType = @requestedByType' : ''}
      ORDER BY rp.requestedDate DESC
    `, { requestedBy, requestedByType: requestedByType || null });
    return r.recordset;
  }
  static async insert(p) {
    const packageID = p.packageID || await ResourcePackage.generateNextId();
    await query(`INSERT INTO ResourcePackage (packageID, resourceID, quantity, requestedBy, requestedByType, status, purpose, priority, requestedDate, totalCost, lastUpdated)
      VALUES (@packageID, @resourceID, @quantity, @requestedBy, @requestedByType, 'Pending', @purpose, @priority, GETDATE(), @totalCost, GETDATE())`,
      {
        packageID,
        resourceID: p.resourceID,
        quantity: p.quantity,
        requestedBy: p.requestedBy,
        requestedByType: p.requestedByType,
        purpose: p.purpose,
        priority: p.priority || 'Medium',
        totalCost: p.totalCost || 0
      });
    return packageID;
  }
  static async updateStatus(packageID, status) {
    const dateField = status === 'Approved' || status === 'Allocated' ? ', allocatedDate = GETDATE()' : status === 'Completed' ? ', completedDate = GETDATE()' : '';
    await query(`UPDATE ResourcePackage SET status = @status${dateField}, lastUpdated = GETDATE() WHERE packageID = @packageID`, { packageID, status });
  }
  static async approve(packageID, allocatedTo, allocatedToType) {
    await query("UPDATE ResourcePackage SET status = 'Approved', allocatedTo = @allocatedTo, allocatedToType = @allocatedToType, allocatedDate = GETDATE(), lastUpdated = GETDATE() WHERE packageID = @packageID",
      { packageID, allocatedTo, allocatedToType });
  }
  static async reject(packageID) {
    await query("UPDATE ResourcePackage SET status = 'Rejected', lastUpdated = GETDATE() WHERE packageID = @packageID", { packageID });
  }
  static async delete(packageID) {
    await query('DELETE FROM ResourcePackage WHERE packageID = @packageID', { packageID });
  }
}

module.exports = ResourcePackage;
