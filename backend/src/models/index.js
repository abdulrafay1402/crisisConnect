const Admin = require('./Admin');
const Citizen = require('./Citizen');
const RescueTeam = require('./RescueTeam');
const NGO = require('./NGO');
const Disaster = require('./Disaster');
const DisasterAssignment = require('./DisasterAssignment');
const Emergency = require('./Emergency');
const Alert = require('./Alert');
const Resource = require('./Resource');
const ResourcePackage = require('./ResourcePackage');
const Donor = require('./Donor');
const Donation = require('./Donation');
const DistributionPlan = require('./DistributionPlan');
const Feedback = require('./Feedback');
const Report = require('./Report');
const EmergencyContact = require('./EmergencyContact');
const MapLocation = require('./MapLocation');
const Notification = require('./Notification');
const DisasterUpdate = require('./DisasterUpdate');
const EmergencyUpdate = require('./EmergencyUpdate');
const Message = require('./Message');
const FundAccount = require('./FundAccount');
const EmergencyAssignment = require('./EmergencyAssignment');
const BankAccount = require('./BankAccount');

module.exports = {
  Admin, Citizen, RescueTeam, NGO,
  Disaster, DisasterAssignment, Emergency, Alert,
  Resource, ResourcePackage,
  Donor, Donation,
  DistributionPlan, Feedback, Report,
  EmergencyContact, MapLocation, Notification, DisasterUpdate, EmergencyUpdate, Message, FundAccount,
  EmergencyAssignment, BankAccount
};
