const { query } = require('../config/database');
const { asyncHandler, BadRequestError } = require('../middleware/errorHandler');

const ACTIVE_DISASTER_STATUSES = "'Reported','Active','Under Control'";

const suggestionsByRole = {
  Admin: [
    'How many disasters are active now?',
    'How many emergencies are pending?',
    'How many NGOs are active?'
  ],
  NGO: [
    'How many disasters are active now?',
    'How many emergencies are pending?',
    'How many rescue teams are active?'
  ],
  Citizen: [
    'How many disasters are active now?',
    'How many emergencies are pending?',
    'How many citizens are registered?'
  ],
  RescueTeam: [
    'How many disasters are active now?',
    'How many emergencies are pending?',
    'How many rescue teams are active?'
  ]
};

const normalize = (value) => String(value || '').toLowerCase().trim();

const runCount = async (sql) => {
  const r = await query(sql);
  return r.recordset?.[0]?.count || 0;
};

const respond = (res, reply, role, intent = 'general_stats', confidence = 0.9) => {
  res.json({
    success: true,
    data: {
      reply,
      suggestions: suggestionsByRole[role] || suggestionsByRole.Citizen,
      path: null,
      confidence,
      intent
    }
  });
};

const ask = asyncHandler(async (req, res) => {
  const message = req.body?.message;
  const role = req.user?.role || req.body?.role || 'Citizen';

  if (!message || !String(message).trim()) {
    throw new BadRequestError('Message is required');
  }

  const text = normalize(message);

  if (text.includes('active') && text.includes('disaster')) {
    const count = await runCount(`SELECT COUNT(*) as count FROM Disaster WHERE status IN (${ACTIVE_DISASTER_STATUSES})`);
    return respond(res, `There are currently ${count} active disasters.`, role, 'active_disasters');
  }

  if (text.includes('total') && text.includes('disaster')) {
    const count = await runCount('SELECT COUNT(*) as count FROM Disaster');
    return respond(res, `Total disasters recorded: ${count}.`, role, 'total_disasters');
  }

  if ((text.includes('pending') || text.includes('active')) && text.includes('emerg')) {
    const count = await runCount("SELECT COUNT(*) as count FROM Emergency WHERE status IN ('Pending','Assigned','Dispatched')");
    return respond(res, `There are currently ${count} active emergencies.`, role, 'active_emergencies');
  }

  if (text.includes('pending') && text.includes('emerg')) {
    const count = await runCount("SELECT COUNT(*) as count FROM Emergency WHERE status = 'Pending'");
    return respond(res, `There are currently ${count} pending emergencies.`, role, 'pending_emergencies');
  }

  if (text.includes('ngo')) {
    const count = await runCount('SELECT COUNT(*) as count FROM NGO WHERE isActive = 1');
    return respond(res, `There are currently ${count} active NGOs.`, role, 'active_ngos');
  }

  if (text.includes('citizen')) {
    const count = await runCount('SELECT COUNT(*) as count FROM Citizen WHERE isActive = 1');
    return respond(res, `There are currently ${count} active citizens.`, role, 'active_citizens');
  }

  if (text.includes('team') || text.includes('rescue')) {
    const count = await runCount('SELECT COUNT(*) as count FROM RescueTeam WHERE isActive = 1');
    return respond(res, `There are currently ${count} active rescue teams.`, role, 'active_teams');
  }

  if (text.includes('admin')) {
    const count = await runCount('SELECT COUNT(*) as count FROM Admin');
    return respond(res, `There are currently ${count} admin accounts.`, role, 'admin_count');
  }

  return respond(
    res,
    'I can help with quick stats like active disasters, emergencies, NGOs, citizens, and rescue teams. Ask me one of the suggested questions.',
    role,
    'help',
    0.7
  );
});

const health = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'crisisconnect-chat',
      mode: 'simple-stats',
      status: 'ok'
    }
  });
});

module.exports = { ask, health };
