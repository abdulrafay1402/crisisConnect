const { Report } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllReports = asyncHandler(async (req, res) => {
  const { reportType } = req.query;
  const reports = reportType ? await Report.findByType(reportType) : await Report.findAll();
  res.json({ success: true, data: reports });
});

const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new NotFoundError('Report not found');
  res.json({ success: true, data: report });
});

const createReport = asyncHandler(async (req, res) => {
  const { reportType, reportName, startDate, endDate } = req.body;
  if (!reportType) throw new BadRequestError('Report type is required');

  const dataSnapshot = await Report.generateData(reportType, startDate || null, endDate || null);

  const reportID = await Report.insert({
    reportType,
    reportName: reportName || reportType,
    generatedBy: req.user.id,
    startDate: startDate || null,
    endDate: endDate || null,
    dataSnapshot: JSON.stringify(dataSnapshot)
  });
  const report = await Report.findById(reportID);
  if (report && report.dataSnapshot) {
    try { report.dataSnapshot = JSON.parse(report.dataSnapshot); } catch { /* keep as string */ }
  }
  res.status(201).json({ success: true, message: 'Report generated', data: report });
});

const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new NotFoundError('Report not found');
  await Report.delete(req.params.id);
  res.json({ success: true, message: 'Report deleted' });
});

module.exports = { getAllReports, getReportById, createReport, deleteReport };
