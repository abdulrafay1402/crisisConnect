const { DistributionPlan } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');

const getAllDistributionPlans = asyncHandler(async (req, res) => {
  const plans = await DistributionPlan.findAll();
  res.json({ success: true, data: plans });
});

const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await DistributionPlan.findActive();
  res.json({ success: true, data: plans });
});

const getDistributionPlanById = asyncHandler(async (req, res) => {
  const plan = await DistributionPlan.findById(req.params.id);
  if (!plan) throw new NotFoundError('Distribution plan not found');
  res.json({ success: true, data: plan });
});

const getPlansByNGO = asyncHandler(async (req, res) => {
  const plans = await DistributionPlan.findByNGO(req.params.ngoId || req.user.id);
  res.json({ success: true, data: plans });
});

const getPlansByDisaster = asyncHandler(async (req, res) => {
  const plans = await DistributionPlan.findByDisaster(req.params.disasterId);
  res.json({ success: true, data: plans });
});

const getNGOAvailableResources = asyncHandler(async (req, res) => {
  const ngoID = req.params.ngoId || req.user.id;
  const resources = await DistributionPlan.getNGOResourceAvailability(ngoID);
  res.json({ success: true, data: resources });
});

const createDistributionPlan = asyncHandler(async (req, res) => {
  const { disasterID, emergencyID, planName, targetAreas, schedule, items } = req.body;
  if (!planName) throw new BadRequestError('Plan name is required');

  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      resourceID: item?.resourceID,
      quantity: Number(item?.quantity || 0)
    }))
    .filter((item) => item.resourceID && item.quantity > 0);

  if (!normalizedItems.length) {
    throw new BadRequestError('At least one resource item is required for a distribution plan');
  }

  const ngoID = (req.user.userType === 'NGO' || req.user.role === 'NGO') ? req.user.id : req.body.ngoID;

  const availability = await DistributionPlan.getNGOResourceAvailability(ngoID || req.user.id);
  const availMap = new Map(availability.map((row) => [row.resourceID, Number(row.availableQty || 0)]));
  for (const item of normalizedItems) {
    const availableQty = Number(availMap.get(item.resourceID) || 0);
    if (item.quantity > availableQty) {
      throw new BadRequestError(`Insufficient NGO stock for resource ${item.resourceID}. Available: ${availableQty}, requested: ${item.quantity}`);
    }
  }

  const planID = await DistributionPlan.insert({
    disasterID,
    emergencyID,
    ngoID: ngoID || req.user.id,
    planName,
    targetAreas,
    schedule,
    items: normalizedItems
  });
  const plan = await DistributionPlan.findById(planID);
  res.status(201).json({ success: true, message: 'Distribution plan created', data: plan });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const plan = await DistributionPlan.findById(req.params.id);
  if (!plan) throw new NotFoundError('Distribution plan not found');

  const nextStatus = String(status || '').trim();
  if ((nextStatus === 'Active' || nextStatus === 'In Progress') && !plan.resourcesDeducted) {
    const items = await DistributionPlan.getItems(req.params.id);
    if (!items.length) throw new BadRequestError('Plan has no resource items to execute');

    const availability = await DistributionPlan.getNGOResourceAvailability(plan.ngoID);
    const availMap = new Map(availability.map((row) => [row.resourceID, Number(row.availableQty || 0)]));

    for (const item of items) {
      const availableQty = Number(availMap.get(item.resourceID) || 0);
      const requiredQty = Number(item.quantity || 0);
      if (requiredQty > availableQty) {
        throw new BadRequestError(`Insufficient NGO stock for ${item.resourceName || item.resourceID}. Available: ${availableQty}, required: ${requiredQty}`);
      }
    }

    // Logical deduction: marks plan resources as consumed in NGO availability calculations.
    await DistributionPlan.setResourcesDeducted(req.params.id, true);
  }

  if ((nextStatus === 'Planned' || nextStatus === 'Approved') && plan.resourcesDeducted) {
    // Rollback logical deduction if execution is reverted before completion.
    await DistributionPlan.setResourcesDeducted(req.params.id, false);
  }

  await DistributionPlan.updateStatus(req.params.id, status);
  const updated = await DistributionPlan.findById(req.params.id);
  if (nextStatus === 'Completed') {
    await DistributionPlan.setResourcesDeducted(req.params.id, true);
    await notify('Admin', 'ngo_update', 'NGO Distribution Completed',
      `Distribution plan "${plan.planName}" has been completed`,
      { relatedEntity: 'DistributionPlan', relatedID: req.params.id, redirectPath: '/admin' });
  }
  res.json({ success: true, message: 'Plan status updated', data: updated });
});

const updateBeneficiaries = asyncHandler(async (req, res) => {
  const count = req.body.count !== undefined ? req.body.count : req.body.beneficiariesReached;
  if (count === undefined) throw new BadRequestError('Count is required');
  const plan = await DistributionPlan.findById(req.params.id);
  if (!plan) throw new NotFoundError('Distribution plan not found');
  await DistributionPlan.updateBeneficiaries(req.params.id, count);
  const updated = await DistributionPlan.findById(req.params.id);
  res.json({ success: true, message: 'Beneficiaries updated', data: updated });
});

const deleteDistributionPlan = asyncHandler(async (req, res) => {
  const plan = await DistributionPlan.findById(req.params.id);
  if (!plan) throw new NotFoundError('Distribution plan not found');

  const role = req.user.userType || req.user.role;
  if (role === 'NGO') {
    if (String(plan.ngoID) !== String(req.user.id)) {
      throw new BadRequestError('You can only delete your own distribution plans');
    }
    if (['Active', 'In Progress', 'Completed'].includes(String(plan.status || ''))) {
      throw new BadRequestError('Active or completed plans cannot be deleted');
    }
  }

  await DistributionPlan.delete(req.params.id);
  res.json({ success: true, message: 'Distribution plan deleted' });
});

module.exports = {
  getAllDistributionPlans, getActivePlans, getDistributionPlanById, getPlansByNGO, getPlansByDisaster,
  getNGOAvailableResources,
  createDistributionPlan, updateStatus, updateBeneficiaries, deleteDistributionPlan
};
