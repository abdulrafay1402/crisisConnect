const { query } = require('../config/database');

class DistributionPlan {
  static async ensureResourceTables() {
    await query(`
      IF COL_LENGTH('DistributionPlan', 'emergencyID') IS NULL
      ALTER TABLE DistributionPlan ADD emergencyID VARCHAR(10) NULL
    `);
    await query(`
      IF COL_LENGTH('DistributionPlan', 'resourcesDeducted') IS NULL
      ALTER TABLE DistributionPlan ADD resourcesDeducted BIT NOT NULL CONSTRAINT DF_DistributionPlan_resourcesDeducted DEFAULT 0
    `);

    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DistributionPlanItem' AND xtype='U')
      CREATE TABLE DistributionPlanItem (
        itemID INT IDENTITY(1,1) PRIMARY KEY,
        planID VARCHAR(10) NOT NULL,
        resourceID VARCHAR(10) NOT NULL,
        quantity INT NOT NULL,
        unit VARCHAR(20) NULL,
        createdDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (planID) REFERENCES DistributionPlan(planID) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (resourceID) REFERENCES Resource(resourceID) ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await query(`IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_DistributionPlanItem_planID' AND object_id = OBJECT_ID('DistributionPlanItem')) CREATE INDEX IX_DistributionPlanItem_planID ON DistributionPlanItem(planID)`);
    await query(`IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_DistributionPlanItem_resourceID' AND object_id = OBJECT_ID('DistributionPlanItem')) CREATE INDEX IX_DistributionPlanItem_resourceID ON DistributionPlanItem(resourceID)`);
  }

  static async generateNextId() {
    const r = await query('SELECT TOP 1 planID FROM DistributionPlan ORDER BY planID DESC');
    if (r.recordset.length === 0) return 'DPL001';
    const num = parseInt(r.recordset[0].planID.substring(3)) + 1;
    return `DPL${num.toString().padStart(3, '0')}`;
  }
  static async findById(planID) {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`SELECT dp.*, d.type as disasterType, d.location as disasterLocation,
        e.emergencyType, e.location as emergencyLocation
      FROM DistributionPlan dp
      LEFT JOIN Disaster d ON dp.disasterID = d.disasterID
      LEFT JOIN Emergency e ON dp.emergencyID = e.emergencyID
      WHERE dp.planID = @planID`, { planID });
    const plan = r.recordset[0] || null;
    if (!plan) return null;
    plan.items = await DistributionPlan.getItems(planID);
    return plan;
  }
  static async findAll() {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`SELECT dp.*, n.ngoName, d.type as disasterType, d.location as disasterLocation,
        e.emergencyType, e.location as emergencyLocation
      FROM DistributionPlan dp
      LEFT JOIN NGO n ON dp.ngoID = n.ngoID
      LEFT JOIN Disaster d ON dp.disasterID = d.disasterID
      LEFT JOIN Emergency e ON dp.emergencyID = e.emergencyID
      ORDER BY dp.createdDate DESC`);
    return r.recordset;
  }
  static async findActive() {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`SELECT dp.*, d.type as disasterType, d.location as disasterLocation,
        e.emergencyType, e.location as emergencyLocation
      FROM DistributionPlan dp
      LEFT JOIN Disaster d ON dp.disasterID = d.disasterID
      LEFT JOIN Emergency e ON dp.emergencyID = e.emergencyID
      WHERE dp.status = 'Active' ORDER BY dp.createdDate DESC`);
    return r.recordset;
  }
  static async findByNGO(ngoID) {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`SELECT dp.*, d.type as disasterType, d.location as disasterLocation,
        e.emergencyType, e.location as emergencyLocation
      FROM DistributionPlan dp
      LEFT JOIN Disaster d ON dp.disasterID = d.disasterID
      LEFT JOIN Emergency e ON dp.emergencyID = e.emergencyID
      WHERE dp.ngoID = @ngoID ORDER BY dp.createdDate DESC`, { ngoID });
    return r.recordset;
  }
  static async findByDisaster(disasterID) {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`SELECT dp.*, n.ngoName, e.emergencyType, e.location as emergencyLocation
      FROM DistributionPlan dp LEFT JOIN NGO n ON dp.ngoID = n.ngoID
      LEFT JOIN Emergency e ON dp.emergencyID = e.emergencyID
      WHERE dp.disasterID = @disasterID ORDER BY dp.createdDate DESC`, { disasterID });
    return r.recordset;
  }
  static async getItems(planID) {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`
      SELECT i.*, r.resourceName, r.type, r.costPerUnit
      FROM DistributionPlanItem i
      LEFT JOIN Resource r ON i.resourceID = r.resourceID
      WHERE i.planID = @planID
      ORDER BY i.itemID ASC
    `, { planID });
    return r.recordset || [];
  }

  static async getNGOResourceAvailability(ngoID) {
    await DistributionPlan.ensureResourceTables();
    const r = await query(`
      WITH received AS (
        SELECT rp.resourceID, SUM(CAST(rp.quantity AS DECIMAL(18,2))) AS receivedQty
        FROM ResourcePackage rp
        WHERE (
            (
              rp.allocatedTo = @ngoID
              AND UPPER(LTRIM(RTRIM(ISNULL(rp.allocatedToType, '')))) = 'NGO'
            )
            OR
            (
              rp.requestedBy = @ngoID
              AND UPPER(LTRIM(RTRIM(ISNULL(rp.requestedByType, '')))) = 'NGO'
            )
          )
          AND UPPER(LTRIM(RTRIM(ISNULL(rp.status, '')))) IN ('APPROVED','ALLOCATED','COMPLETED')
        GROUP BY rp.resourceID
      ),
      consumed AS (
        SELECT i.resourceID, SUM(CAST(i.quantity AS DECIMAL(18,2))) AS consumedQty
        FROM DistributionPlanItem i
        INNER JOIN DistributionPlan dp ON dp.planID = i.planID
        WHERE dp.ngoID = @ngoID
          AND dp.resourcesDeducted = 1
        GROUP BY i.resourceID
      )
      SELECT
        r.resourceID,
        r.resourceName,
        r.type,
        r.unit,
        r.costPerUnit,
        CAST(ISNULL(rcv.receivedQty, 0) AS INT) AS receivedQty,
        CAST(ISNULL(csm.consumedQty, 0) AS INT) AS consumedQty,
        CAST(CASE WHEN ISNULL(rcv.receivedQty, 0) - ISNULL(csm.consumedQty, 0) < 0 THEN 0 ELSE ISNULL(rcv.receivedQty, 0) - ISNULL(csm.consumedQty, 0) END AS INT) AS availableQty
      FROM Resource r
      INNER JOIN received rcv ON r.resourceID = rcv.resourceID
      LEFT JOIN consumed csm ON r.resourceID = csm.resourceID
      WHERE CASE WHEN ISNULL(rcv.receivedQty, 0) - ISNULL(csm.consumedQty, 0) < 0 THEN 0 ELSE ISNULL(rcv.receivedQty, 0) - ISNULL(csm.consumedQty, 0) END > 0
      ORDER BY r.resourceName
    `, { ngoID });

    return r.recordset || [];
  }

  static async insert(p) {
    await DistributionPlan.ensureResourceTables();
    const planID = p.planID || await DistributionPlan.generateNextId();
    await query(`INSERT INTO DistributionPlan (planID, ngoID, disasterID, emergencyID, planName, targetAreas, schedule, status, createdDate, beneficiariesReached, resourcesDeducted)
      VALUES (@planID, @ngoID, @disasterID, @emergencyID, @planName, @targetAreas, @schedule, 'Planned', GETDATE(), 0, 0)`,
      {
        planID,
        ngoID: p.ngoID,
        disasterID: p.disasterID || null,
        emergencyID: p.emergencyID || null,
        planName: p.planName,
        targetAreas: p.targetAreas || null,
        schedule: p.schedule || null
      });

    const items = Array.isArray(p.items) ? p.items : [];
    for (const item of items) {
      await query(
        `INSERT INTO DistributionPlanItem (planID, resourceID, quantity, unit)
         VALUES (@planID, @resourceID, @quantity, @unit)`,
        {
          planID,
          resourceID: item.resourceID,
          quantity: Number(item.quantity || 0),
          unit: item.unit || null
        }
      );
    }
    return planID;
  }

  static async setResourcesDeducted(planID, deducted) {
    await query('UPDATE DistributionPlan SET resourcesDeducted = @deducted WHERE planID = @planID', { planID, deducted: deducted ? 1 : 0 });
  }

  static async updateStatus(planID, status) {
    await query('UPDATE DistributionPlan SET status = @status WHERE planID = @planID', { planID, status });
  }
  static async updateBeneficiaries(planID, count) {
    await query('UPDATE DistributionPlan SET beneficiariesReached = @count WHERE planID = @planID', { planID, count });
  }
  static async delete(planID) {
    await query('DELETE FROM DistributionPlan WHERE planID = @planID', { planID });
  }
}

module.exports = DistributionPlan;
