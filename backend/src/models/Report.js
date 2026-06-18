const { query } = require('../config/database');

class Report {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 reportID FROM Report ORDER BY reportID DESC');
    if (r.recordset.length === 0) return 'RPT001';
    const num = parseInt(r.recordset[0].reportID.substring(3)) + 1;
    return `RPT${num.toString().padStart(3, '0')}`;
  }
  static async findById(reportID) {
    const r = await query('SELECT * FROM Report WHERE reportID = @reportID', { reportID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Report ORDER BY generatedDate DESC');
    return r.recordset;
  }
  static async findByType(reportType) {
    const r = await query('SELECT * FROM Report WHERE reportType = @reportType ORDER BY generatedDate DESC', { reportType });
    return r.recordset;
  }
  static async findByGenerator(generatedBy) {
    const r = await query('SELECT * FROM Report WHERE generatedBy = @generatedBy ORDER BY generatedDate DESC', { generatedBy });
    return r.recordset;
  }

  /* ---- Real data aggregation for each report type ---- */
  static async generateData(reportType, startDate, endDate) {
    const dateFilter = (col) => {
      const parts = [];
      if (startDate) parts.push(`${col} >= @startDate`);
      if (endDate) parts.push(`${col} <= @endDate`);
      return parts.length ? ' AND ' + parts.join(' AND ') : '';
    };
    const dateParams = {};
    if (startDate) dateParams.startDate = startDate;
    if (endDate) dateParams.endDate = endDate;

    switch (reportType) {
      case 'Disaster Summary': {
        const total = await query(
          `SELECT COUNT(*) as total FROM Disaster WHERE isDeleted=0${dateFilter('reportedDate')}`, dateParams);
        const byType = await query(
          `SELECT type, COUNT(*) as count FROM Disaster WHERE isDeleted=0${dateFilter('reportedDate')} GROUP BY type ORDER BY count DESC`, dateParams);
        const bySeverity = await query(
          `SELECT severity, COUNT(*) as count FROM Disaster WHERE isDeleted=0${dateFilter('reportedDate')} GROUP BY severity ORDER BY count DESC`, dateParams);
        const byStatus = await query(
          `SELECT status, COUNT(*) as count FROM Disaster WHERE isDeleted=0${dateFilter('reportedDate')} GROUP BY status ORDER BY count DESC`, dateParams);
        const totalCasualties = await query(
          `SELECT ISNULL(SUM(estimatedCasualties),0) as total FROM Disaster WHERE isDeleted=0${dateFilter('reportedDate')}`, dateParams);
        return {
          totalDisasters: total.recordset[0].total,
          byType: byType.recordset,
          bySeverity: bySeverity.recordset,
          byStatus: byStatus.recordset,
          totalCasualties: totalCasualties.recordset[0].total
        };
      }
      case 'Resource Utilization': {
        const summary = await query(
          `SELECT COUNT(*) as totalResources,
            ISNULL(SUM(totalQuantity),0) as totalStock,
            ISNULL(SUM(allocatedQuantity),0) as totalAllocated,
            ISNULL(SUM(totalQuantity - allocatedQuantity),0) as totalAvailable
          FROM Resource`);
        const byType = await query(
          `SELECT type, COUNT(*) as count,
            SUM(totalQuantity) as totalQty,
            SUM(allocatedQuantity) as allocatedQty,
            SUM(totalQuantity - allocatedQuantity) as availableQty
          FROM Resource GROUP BY type ORDER BY allocatedQty DESC`);
        const byStatus = await query(
          `SELECT status, COUNT(*) as count FROM Resource GROUP BY status`);
        const lowStock = await query(
          `SELECT resourceID, resourceName, type, totalQuantity, allocatedQuantity, status
          FROM Resource WHERE status = 'Low Stock' OR status = 'Out of Stock'`);
        return {
          summary: summary.recordset[0],
          byType: byType.recordset,
          byStatus: byStatus.recordset,
          lowStockItems: lowStock.recordset
        };
      }
      case 'Donation Analysis': {
        const totals = await query(
          `SELECT COUNT(*) as totalDonations,
            ISNULL(SUM(amount),0) as totalAmount,
            ISNULL(AVG(amount),0) as avgAmount
          FROM Donation WHERE 1=1${dateFilter('donationDate')}`, dateParams);
        const byType = await query(
          `SELECT donationType, COUNT(*) as count, ISNULL(SUM(amount),0) as totalAmount
          FROM Donation WHERE 1=1${dateFilter('donationDate')} GROUP BY donationType ORDER BY totalAmount DESC`, dateParams);
        const byStatus = await query(
          `SELECT status, COUNT(*) as count, ISNULL(SUM(amount),0) as totalAmount
          FROM Donation WHERE 1=1${dateFilter('donationDate')} GROUP BY status`, dateParams);
        const byTarget = await query(
          `SELECT allocationTarget, COUNT(*) as count, ISNULL(SUM(amount),0) as totalAmount
          FROM Donation WHERE 1=1${dateFilter('donationDate')} GROUP BY allocationTarget ORDER BY totalAmount DESC`, dateParams);
        return {
          totals: totals.recordset[0],
          byType: byType.recordset,
          byStatus: byStatus.recordset,
          byTarget: byTarget.recordset
        };
      }
      case 'Response Time': {
        const emergencyStats = await query(
          `SELECT COUNT(*) as total,
            SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status='Assigned' THEN 1 ELSE 0 END) as assigned
          FROM Emergency WHERE 1=1${dateFilter('timestamp')}`, dateParams);
        const byStatus = await query(
          `SELECT status, COUNT(*) as count
          FROM Emergency
          WHERE 1=1${dateFilter('timestamp')}
          GROUP BY status
          ORDER BY count DESC`, dateParams);
        return {
          emergencies: emergencyStats.recordset[0],
          byStatus: byStatus.recordset
        };
      }
      default:
        return { message: 'Unknown report type' };
    }
  }

  static async insert(rpt) {
    const reportID = rpt.reportID || await Report.generateNextId();
    await query(`INSERT INTO Report (reportID,reportType,reportName,generatedBy,criteria,generatedDate,startDate,endDate,dataSnapshot)
      VALUES (@reportID,@reportType,@reportName,@generatedBy,@criteria,GETDATE(),@startDate,@endDate,@dataSnapshot)`,
      { reportID, reportType: rpt.reportType, reportName: rpt.reportName || rpt.reportType, generatedBy: rpt.generatedBy, criteria: rpt.criteria || rpt.summary || null, startDate: rpt.startDate || null, endDate: rpt.endDate || null, dataSnapshot: rpt.dataSnapshot || null });
    return reportID;
  }
  static async delete(reportID) {
    await query('DELETE FROM Report WHERE reportID = @reportID', { reportID });
  }
}

module.exports = Report;
