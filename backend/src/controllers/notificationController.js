const { Notification } = require('../models');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');

const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.findForUser(req.user.role, req.user.id, 50);
  res.json({ success: true, data: notifications });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user.role, req.user.id);
  res.json({ success: true, data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.markRead(req.params.id);
  res.json({ success: true, message: 'Notification marked as read' });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.markAllRead(req.user.role, req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.delete(req.params.id);
  res.json({ success: true, message: 'Notification deleted' });
});

module.exports = { getMyNotifications, getUnreadCount, markRead, markAllRead, deleteNotification };
