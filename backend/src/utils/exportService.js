const { asyncHandler } = require('../middleware/errorHandler');

const arrayToCSV = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] == null ? '' : String(row[h]);
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const exportCSV = asyncHandler(async (req, res) => {
  const { data, filename } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ success: false, message: 'Data array is required' });
  }
  const csv = arrayToCSV(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename || 'export'}.csv"`);
  res.send(csv);
});

module.exports = { arrayToCSV, exportCSV };
