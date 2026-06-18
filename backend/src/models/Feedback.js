const { query } = require('../config/database');

class Feedback {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 feedbackID FROM Feedback ORDER BY feedbackID DESC');
    if (r.recordset.length === 0) return 'FDB001';
    const num = parseInt(r.recordset[0].feedbackID.substring(3)) + 1;
    return `FDB${num.toString().padStart(3, '0')}`;
  }
  static async findById(feedbackID) {
    const r = await query('SELECT * FROM Feedback WHERE feedbackID = @feedbackID', { feedbackID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Feedback ORDER BY submittedDate DESC');
    return r.recordset;
  }
  static async findPending() {
    const r = await query("SELECT * FROM Feedback WHERE status = 'Pending' ORDER BY submittedDate DESC");
    return r.recordset;
  }
  static async findByActor(actorType, actorID) {
    const r = await query('SELECT * FROM Feedback WHERE actorType = @actorType AND actorID = @actorID ORDER BY submittedDate DESC', { actorType, actorID });
    return r.recordset;
  }
  static async findByActorAndEntity(actorType, actorID, entityID) {
    const r = await query('SELECT TOP 1 feedbackID FROM Feedback WHERE actorType = @actorType AND actorID = @actorID AND entityID = @entityID', { actorType, actorID, entityID });
    return r.recordset[0] || null;
  }
  static async insert(f) {
    const feedbackID = f.feedbackID || await Feedback.generateNextId();
    await query(`INSERT INTO Feedback (feedbackID,actorType,actorID,feedbackType,entityID,rating,subject,details,isAnonymous,contactName,contactEmail,contactPhone,status,submittedDate)
      VALUES (@feedbackID,@actorType,@actorID,@feedbackType,@entityID,@rating,@subject,@details,@isAnonymous,@contactName,@contactEmail,@contactPhone,'Pending',GETDATE())`,
      { feedbackID, actorType: f.actorType, actorID: f.actorID, feedbackType: f.feedbackType || 'General', entityID: f.entityID || null, rating: f.rating || null, subject: f.subject, details: f.details, isAnonymous: f.isAnonymous || false, contactName: f.contactName || null, contactEmail: f.contactEmail || null, contactPhone: f.contactPhone || null });
    return feedbackID;
  }
  static async respond(feedbackID, adminResponse, reviewedBy) {
    await query("UPDATE Feedback SET adminResponse = @adminResponse, reviewedBy = @reviewedBy, reviewDate = GETDATE(), status = 'Resolved' WHERE feedbackID = @feedbackID",
      { feedbackID, adminResponse, reviewedBy });
  }
  static async updateStatus(feedbackID, status) {
    await query('UPDATE Feedback SET status = @status WHERE feedbackID = @feedbackID', { feedbackID, status });
  }
  static async delete(feedbackID) {
    await query('DELETE FROM Feedback WHERE feedbackID = @feedbackID', { feedbackID });
  }
  static async getStats() {
    const r = await query('SELECT status, rating FROM Feedback');
    const rows = r.recordset || [];
    let pending = 0;
    let resolved = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const row of rows) {
      if (row.status === 'Pending') pending += 1;
      if (row.status === 'Resolved') resolved += 1;
      if (row.rating !== null && row.rating !== undefined) {
        ratingSum += Number(row.rating);
        ratingCount += 1;
      }
    }

    return {
      total: rows.length,
      pending,
      resolved,
      avgRating: ratingCount ? ratingSum / ratingCount : 0
    };
  }
}

module.exports = Feedback;
