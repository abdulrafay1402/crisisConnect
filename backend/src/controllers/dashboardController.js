const { getPool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
  const pool = getPool();

  const [disastersByMonth, emergenciesByStatus, disastersBySeverity, resourceAllocation, disastersRecent, emergenciesRecent] = await Promise.all([
    // Disasters by month (last 6 months)
    pool.request().query(`
      SELECT FORMAT(reportedDate, 'yyyy-MM') AS month, COUNT(*) AS count
      FROM Disaster
      WHERE reportedDate >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY FORMAT(reportedDate, 'yyyy-MM')
      ORDER BY month
    `),
    // Emergencies by status
    pool.request().query(`
      SELECT status, COUNT(*) AS count
      FROM Emergency
      GROUP BY status
    `),
    // Disasters by severity
    pool.request().query(`
      SELECT severity, COUNT(*) AS count
      FROM Disaster
      GROUP BY severity
    `),
    // Resource allocation overview
    pool.request().query(`
      SELECT type,
             SUM(totalQuantity) AS total,
             SUM(allocatedQuantity) AS allocated,
             SUM(totalQuantity - allocatedQuantity) AS available
      FROM Resource
      GROUP BY type
    `),
    // Recent activity sources (fetched separately and merged in app code)
    pool.request().query(`
      SELECT disasterID, type, location, reportedDate
      FROM Disaster
      ORDER BY reportedDate DESC
    `),
    pool.request().query(`
      SELECT emergencyID, emergencyType, location, timestamp
      FROM Emergency
      ORDER BY timestamp DESC
    `),
  ]);

  const activity = [];

  for (const d of disastersRecent.recordset || []) {
    activity.push({
      entity: 'Disaster',
      id: d.disasterID,
      detail: `${d.type} at ${d.location || ''}`.trim(),
      eventDate: d.reportedDate
    });
  }

  for (const e of emergenciesRecent.recordset || []) {
    activity.push({
      entity: 'Emergency',
      id: e.emergencyID,
      detail: `${e.emergencyType} at ${e.location || 'Unknown'}`,
      eventDate: e.timestamp
    });
  }

  activity.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  const recentActivity = activity.slice(0, 10);

  res.json({
    success: true,
    data: {
      disastersByMonth: disastersByMonth.recordset,
      emergenciesByStatus: emergenciesByStatus.recordset,
      disastersBySeverity: disastersBySeverity.recordset,
      resourceAllocation: resourceAllocation.recordset,
      recentActivity
    }
  });
});

module.exports = { getDashboardStats };
