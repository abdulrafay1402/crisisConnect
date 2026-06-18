const { query } = require('../config/database');

class Alert {
  static _optionalColumns = null;

  static async generateNextId() {
    const r = await query('SELECT TOP 1 alertID FROM Alert ORDER BY alertID DESC');
    if (r.recordset.length === 0) return 'ALT001';
    const num = parseInt(r.recordset[0].alertID.substring(3)) + 1;
    return `ALT${num.toString().padStart(3, '0')}`;
  }
  static async findById(alertID) {
    const r = await query('SELECT * FROM Alert WHERE alertID = @alertID', { alertID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Alert ORDER BY createdDate DESC');
    return r.recordset;
  }
  static async findActive() {
    const optional = await Alert.getOptionalColumns();
    const expiryFilter = optional.expiryDate ? ' AND (expiryDate IS NULL OR expiryDate > GETDATE())' : '';
    const r = await query(`SELECT * FROM Alert WHERE status = 'Active'${expiryFilter}
      ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'Urgent' THEN 2 WHEN 'High' THEN 3 WHEN 'Normal' THEN 4 WHEN 'Low' THEN 5 END, createdDate DESC`);
    return r.recordset;
  }
  static async findCritical() {
    const optional = await Alert.getOptionalColumns();
    const expiryFilter = optional.expiryDate ? ' AND (expiryDate IS NULL OR expiryDate > GETDATE())' : '';
    const r = await query(`SELECT * FROM Alert WHERE status = 'Active' AND priority IN ('Critical','Urgent')${expiryFilter} ORDER BY createdDate DESC`);
    return r.recordset;
  }
  static async findByDisaster(disasterID) {
    const r = await query('SELECT * FROM Alert WHERE disasterID = @disasterID ORDER BY createdDate DESC', { disasterID });
    return r.recordset;
  }

  static async getOptionalColumns() {
    if (Alert._optionalColumns) return Alert._optionalColumns;
    const r = await query(`SELECT name
      FROM sys.columns
      WHERE object_id = OBJECT_ID('Alert')
        AND name IN ('targetAudience', 'affectedAreas', 'expiryDate')`);
    const found = new Set((r.recordset || []).map((row) => row.name));
    Alert._optionalColumns = {
      targetAudience: found.has('targetAudience'),
      affectedAreas: found.has('affectedAreas'),
      expiryDate: found.has('expiryDate')
    };
    return Alert._optionalColumns;
  }

  static async insert(a) {
    const alertID = a.alertID || await Alert.generateNextId();
    const optional = await Alert.getOptionalColumns();

    const columns = ['alertID', 'disasterID', 'title', 'message', 'priority', 'alertType', 'createdBy', 'createdDate', 'status'];
    const values = ['@alertID', '@disasterID', '@title', '@message', '@priority', '@alertType', '@createdBy', 'GETDATE()', "'Active'"];
    const params = {
      alertID,
      disasterID: a.disasterID || null,
      title: a.title,
      message: a.message,
      priority: a.priority || 'Normal',
      alertType: a.alertType || 'General',
      createdBy: a.createdBy
    };

    if (optional.targetAudience) {
      columns.push('targetAudience');
      values.push('@targetAudience');
      params.targetAudience = a.targetAudience || 'All';
    }
    if (optional.affectedAreas) {
      columns.push('affectedAreas');
      values.push('@affectedAreas');
      params.affectedAreas = a.affectedAreas || null;
    }
    if (optional.expiryDate) {
      columns.push('expiryDate');
      values.push('@expiryDate');
      params.expiryDate = a.expiryDate || null;
    }

    await query(`INSERT INTO Alert (${columns.join(',')}) VALUES (${values.join(',')})`, params);
    return alertID;
  }
  static async update(a) {
    await query(`UPDATE Alert SET title=@title,message=@message,priority=@priority,alertType=@alertType,targetAudience=@targetAudience,affectedAreas=@affectedAreas,status=@status,expiryDate=@expiryDate WHERE alertID=@alertID`,
      { alertID: a.alertID, title: a.title, message: a.message, priority: a.priority, alertType: a.alertType, targetAudience: a.targetAudience, affectedAreas: a.affectedAreas, status: a.status, expiryDate: a.expiryDate });
  }
  static async cancel(alertID) {
    await query("UPDATE Alert SET status = 'Cancelled' WHERE alertID = @alertID", { alertID });
  }
  static async cancelByDisaster(disasterID) {
    await query("UPDATE Alert SET status = 'Cancelled' WHERE disasterID = @disasterID AND status = 'Active'", { disasterID });
  }
  static async cancelForEndedDisasters() {
    await query(`UPDATE a
      SET a.status = 'Cancelled'
      FROM Alert a
      INNER JOIN Disaster d ON d.disasterID = a.disasterID
      WHERE a.status = 'Active'
        AND d.status IN ('Resolved', 'Cancelled', 'Closed', 'Ended')`);
  }
  static async delete(alertID) {
    await query('DELETE FROM Alert WHERE alertID = @alertID', { alertID });
  }
}

module.exports = Alert;
