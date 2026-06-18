const { query } = require('../config/database');

class Resource {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 resourceID FROM Resource ORDER BY resourceID DESC');
    if (r.recordset.length === 0) return 'RES001';
    const num = parseInt(r.recordset[0].resourceID.substring(3)) + 1;
    return `RES${num.toString().padStart(3, '0')}`;
  }
  static async findById(resourceID) {
    const r = await query('SELECT * FROM Resource WHERE resourceID = @resourceID', { resourceID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT *, (totalQuantity - allocatedQuantity) as availableQuantity FROM Resource ORDER BY lastUpdated DESC');
    return r.recordset;
  }
  static async findAvailable() {
    const r = await query("SELECT *, (totalQuantity - allocatedQuantity) as availableQuantity FROM Resource WHERE status != 'Out of Stock' ORDER BY resourceName");
    return r.recordset;
  }
  static async findLowStock() {
    const r = await query("SELECT *, (totalQuantity - allocatedQuantity) as availableQuantity FROM Resource WHERE (totalQuantity - allocatedQuantity) <= (totalQuantity * 0.2) AND totalQuantity > 0 ORDER BY resourceName");
    return r.recordset;
  }
  static async insert(res) {
    const resourceID = res.resourceID || await Resource.generateNextId();
    await query(`INSERT INTO Resource (resourceID,resourceName,type,totalQuantity,allocatedQuantity,unit,location,status,costPerUnit,addedDate,lastUpdated)
      VALUES (@resourceID,@resourceName,@type,@totalQuantity,0,@unit,@location,'Available',@costPerUnit,GETDATE(),GETDATE())`,
      { resourceID, resourceName: res.resourceName, type: res.type, totalQuantity: res.totalQuantity || 0, unit: res.unit, location: res.location, costPerUnit: res.costPerUnit || 0 });
    return resourceID;
  }
  static async update(res) {
    let status = 'Available';
    const avail = (res.totalQuantity || 0) - (res.allocatedQuantity || 0);
    if (avail <= 0) status = 'Out of Stock';
    else if (avail <= (res.totalQuantity || 0) * 0.2) status = 'Low Stock';
    await query(`UPDATE Resource SET resourceName=@resourceName,type=@type,totalQuantity=@totalQuantity,allocatedQuantity=@allocatedQuantity,unit=@unit,location=@location,status=@status,costPerUnit=@costPerUnit,lastUpdated=GETDATE() WHERE resourceID=@resourceID`,
      { resourceID: res.resourceID, resourceName: res.resourceName, type: res.type, totalQuantity: res.totalQuantity, allocatedQuantity: res.allocatedQuantity, unit: res.unit, location: res.location, status, costPerUnit: res.costPerUnit });
  }
  static async allocate(resourceID, quantity) {
    const resource = await Resource.findById(resourceID);
    if (!resource) return;

    const allocatedQuantity = (resource.allocatedQuantity || 0) + (quantity || 0);
    const totalQuantity = resource.totalQuantity || 0;
    const available = totalQuantity - allocatedQuantity;

    let status = 'Available';
    if (available <= 0) status = 'Out of Stock';
    else if (available <= totalQuantity * 0.2) status = 'Low Stock';

    await query(
      'UPDATE Resource SET allocatedQuantity = @allocatedQuantity, status = @status, lastUpdated = GETDATE() WHERE resourceID = @resourceID',
      { resourceID, allocatedQuantity, status }
    );
  }
  static async deallocate(resourceID, quantity) {
    const resource = await Resource.findById(resourceID);
    if (!resource) return;

    let allocatedQuantity = (resource.allocatedQuantity || 0) - (quantity || 0);
    if (allocatedQuantity < 0) allocatedQuantity = 0;

    const totalQuantity = resource.totalQuantity || 0;
    const available = totalQuantity - allocatedQuantity;

    let status = 'Available';
    if (available <= 0) status = 'Out of Stock';
    else if (available <= totalQuantity * 0.2) status = 'Low Stock';

    await query(
      'UPDATE Resource SET allocatedQuantity = @allocatedQuantity, status = @status, lastUpdated = GETDATE() WHERE resourceID = @resourceID',
      { resourceID, allocatedQuantity, status }
    );
  }
  static async delete(resourceID) {
    await query('DELETE FROM Resource WHERE resourceID = @resourceID', { resourceID });
  }
  static async getStats() {
    const r = await query('SELECT totalQuantity, allocatedQuantity, status, costPerUnit FROM Resource');
    const rows = r.recordset || [];
    const stats = {
      total: rows.length,
      totalItems: 0,
      totalAllocated: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0
    };

    for (const row of rows) {
      const totalQuantity = row.totalQuantity || 0;
      const allocatedQuantity = row.allocatedQuantity || 0;
      const costPerUnit = row.costPerUnit || 0;

      stats.totalItems += totalQuantity;
      stats.totalAllocated += allocatedQuantity;
      stats.totalValue += totalQuantity * costPerUnit;
      if (row.status === 'Low Stock') stats.lowStock += 1;
      if (row.status === 'Out of Stock') stats.outOfStock += 1;
    }

    return stats;
  }
}

module.exports = Resource;
