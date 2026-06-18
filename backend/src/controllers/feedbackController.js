const { Feedback } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findAll();
  res.json({ success: true, data: feedback });
});

const getPendingFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findPending();
  res.json({ success: true, data: feedback });
});

const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new NotFoundError('Feedback not found');
  res.json({ success: true, data: feedback });
});

const getMyFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByActor(req.user.userType || req.user.role, req.user.id);
  res.json({ success: true, data: feedback });
});

const createFeedback = asyncHandler(async (req, res) => {
  const { feedbackType, entityID, rating, subject, details, isAnonymous, contactName, contactEmail, contactPhone } = req.body;
  if (!subject || !details) throw new BadRequestError('Subject and details are required');

  if (entityID) {
    const existing = await Feedback.findByActorAndEntity(req.user.userType || req.user.role, req.user.id, entityID);
    if (existing) throw new BadRequestError('You have already submitted feedback for this item');
  }

  const feedbackID = await Feedback.insert({
    actorType: req.user.userType || req.user.role,
    actorID: req.user.id,
    feedbackType: feedbackType || 'General', entityID, rating, subject, details,
    isAnonymous: isAnonymous || false, contactName, contactEmail, contactPhone
  });
  const feedback = await Feedback.findById(feedbackID);
  res.status(201).json({ success: true, message: 'Feedback submitted', data: feedback });
});

const respondToFeedback = asyncHandler(async (req, res) => {
  const adminResponse = req.body.adminResponse || req.body.response;
  if (!adminResponse) throw new BadRequestError('Response is required');
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new NotFoundError('Feedback not found');
  await Feedback.respond(req.params.id, adminResponse, req.user.id);
  const updated = await Feedback.findById(req.params.id);
  res.json({ success: true, message: 'Feedback responded', data: updated });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new NotFoundError('Feedback not found');
  await Feedback.updateStatus(req.params.id, status);
  const updated = await Feedback.findById(req.params.id);
  res.json({ success: true, message: 'Feedback status updated', data: updated });
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new NotFoundError('Feedback not found');
  await Feedback.delete(req.params.id);
  res.json({ success: true, message: 'Feedback deleted' });
});

const getFeedbackStats = asyncHandler(async (req, res) => {
  const stats = await Feedback.getStats();
  res.json({ success: true, data: stats });
});

module.exports = {
  getAllFeedback, getPendingFeedback, getFeedbackById, getMyFeedback,
  createFeedback, respondToFeedback, updateStatus, deleteFeedback, getFeedbackStats
};
