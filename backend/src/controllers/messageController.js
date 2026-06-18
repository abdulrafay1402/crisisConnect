const { Message } = require('../models');
const { asyncHandler, BadRequestError } = require('../middleware/errorHandler');
const { emitToUser } = require('../utils/socketManager');

const sendMessage = asyncHandler(async (req, res) => {
  const { receiverID, receiverRole, content, messageType } = req.body;
  if (!receiverID || !receiverRole || !content?.trim()) {
    throw new BadRequestError('Receiver ID, role, and message content are required');
  }
  const allowedTypes = ['text', 'disaster_share'];
  const type = allowedTypes.includes(messageType) ? messageType : 'text';
  const senderRole = req.user.role || req.user.userType;
  // Allowed chat pairs: Team↔NGO, Team↔Team, Team↔Citizen, NGO↔Citizen
  const validPairs = [
    ['RescueTeam', 'NGO'],
    ['NGO', 'RescueTeam'],
    ['RescueTeam', 'RescueTeam'],
    ['RescueTeam', 'Citizen'],
    ['Citizen', 'RescueTeam'],
    ['NGO', 'Citizen'],
    ['Citizen', 'NGO']
  ];
  if (!validPairs.some(([s, r]) => s === senderRole && r === receiverRole)) {
    throw new BadRequestError('This chat combination is not supported');
  }

  if (senderRole === 'Citizen' && receiverRole === 'RescueTeam') {
    const approved = await Message.isApprovedTeam(receiverID);
    if (!approved) {
      throw new BadRequestError('Citizens can only chat with approved rescue teams');
    }
  }

  if (senderRole === 'Citizen' && receiverRole === 'NGO') {
    const approved = await Message.isApprovedNGO(receiverID);
    if (!approved) {
      throw new BadRequestError('Citizens can only chat with approved NGOs');
    }
  }

  const msg = await Message.insert({
    senderID: req.user.id,
    senderRole,
    receiverID,
    receiverRole,
    content: content.trim(),
    messageType: type
  });
  const fullMsg = {
    messageID: msg.messageID,
    senderID: req.user.id,
    senderRole,
    receiverID,
    receiverRole,
    content: content.trim(),
    messageType: type,
    isRead: false,
    sentDate: msg.sentDate
  };
  // Real-time push to receiver
  emitToUser(receiverID, 'message:new', fullMsg);
  res.status(201).json({ success: true, data: fullMsg });
});

const getConversation = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  if (!contactId) throw new BadRequestError('Contact ID is required');
  const messages = await Message.getConversation(req.user.id, contactId);
  // Mark messages as read
  await Message.markRead(req.user.id, contactId);
  res.json({ success: true, data: messages });
});

const getContacts = asyncHandler(async (req, res) => {
  const contacts = await Message.getContacts(req.user.id, req.user.role || req.user.userType);
  // Enrich with names
  const enriched = [];
  for (const c of contacts) {
    let name = c.contactID;
    if (c.contactRole === 'RescueTeam') {
      const teams = await Message.getAvailableTeams();
      const team = teams.find(t => t.teamID === c.contactID);
      if (team) name = team.teamName;
    } else if (c.contactRole === 'NGO') {
      const ngos = await Message.getAvailableNGOs();
      const ngo = ngos.find(n => n.ngoID === c.contactID);
      if (ngo) name = ngo.ngoName;
    } else if (c.contactRole === 'Citizen') {
      const citizens = await Message.getAvailableCitizens();
      const cit = citizens.find(ci => ci.citizenID === c.contactID);
      if (cit) name = cit.name;
    }
    enriched.push({ ...c, contactName: name });
  }
  res.json({ success: true, data: enriched });
});

const getAvailableContacts = asyncHandler(async (req, res) => {
  const role = req.user.role || req.user.userType;
  let contacts = [];
  if (role === 'RescueTeam') {
    const [ngos, teams, citizens] = await Promise.all([
      Message.getAvailableNGOs(),
      Message.getAvailableTeams(),
      Message.getAvailableCitizens()
    ]);
    contacts = [
      ...ngos.map(n => ({ id: n.ngoID, name: n.ngoName, role: 'NGO', detail: n.focusArea, contactNumber: n.contactNumber })),
      ...teams.filter(t => t.teamID !== req.user.id).map(t => ({ id: t.teamID, name: t.teamName, role: 'RescueTeam', detail: t.specialization, contactNumber: t.contactNumber })),
      ...citizens.map(c => ({ id: c.citizenID, name: c.name, role: 'Citizen', detail: c.city || 'Citizen', contactNumber: c.contactNumber }))
    ];
  } else if (role === 'NGO') {
    const [teams, citizens] = await Promise.all([
      Message.getAvailableTeams(),
      Message.getAvailableCitizens()
    ]);
    contacts = [
      ...teams.map(t => ({ id: t.teamID, name: t.teamName, role: 'RescueTeam', detail: t.specialization, contactNumber: t.contactNumber })),
      ...citizens.map(c => ({ id: c.citizenID, name: c.name, role: 'Citizen', detail: c.city || 'Citizen', contactNumber: c.contactNumber }))
    ];
  } else if (role === 'Citizen') {
    const [teams, ngos] = await Promise.all([
      Message.getAvailableTeams(),
      Message.getAvailableNGOs()
    ]);
    contacts = [
      ...teams.map(t => ({ id: t.teamID, name: t.teamName, role: 'RescueTeam', detail: t.specialization, contactNumber: t.contactNumber })),
      ...ngos.map(n => ({ id: n.ngoID, name: n.ngoName, role: 'NGO', detail: n.focusArea, contactNumber: n.contactNumber }))
    ];
  }
  res.json({ success: true, data: contacts });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.getUnreadCount(req.user.id);
  res.json({ success: true, data: { count } });
});

module.exports = { sendMessage, getConversation, getContacts, getAvailableContacts, getUnreadCount };
