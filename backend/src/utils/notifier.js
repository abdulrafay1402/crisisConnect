const { Notification } = require('../models');

const notify = async (targetRole, category, title, message, opts = {}) => {
  try {
    await Notification.insert({
      targetRole,
      targetUserID: opts.targetUserID || null,
      category,
      title,
      message,
      relatedEntity: opts.relatedEntity || null,
      relatedID: opts.relatedID || null,
      redirectPath: opts.redirectPath || null
    });
  } catch (err) {
    console.error('Notification insert failed:', err.message);
  }
};

module.exports = { notify };
