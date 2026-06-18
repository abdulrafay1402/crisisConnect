const { query } = require('../config/database');

class MapLocation {
  static async findAll() {
    const r = await query('SELECT * FROM MapLocation ORDER BY locationType, locationName');
    return r.recordset;
  }
  static async findByType(locationType) {
    const r = await query('SELECT * FROM MapLocation WHERE locationType = @locationType', { locationType });
    return r.recordset;
  }
  static async findById(locationID) {
    const r = await query('SELECT * FROM MapLocation WHERE locationID = @locationID', { locationID });
    return r.recordset[0] || null;
  }
  static async insert(loc) {
    const r = await query(`INSERT INTO MapLocation (locationName,locationType,latitude,longitude,description,isActive)
      VALUES (@locationName,@locationType,@latitude,@longitude,@description,1); SELECT SCOPE_IDENTITY() as id`,
      { locationName: loc.locationName, locationType: loc.locationType, latitude: loc.latitude, longitude: loc.longitude, description: loc.description || null });
    return r.recordset[0]?.id;
  }
  static async update(locationID, loc) {
    await query(`UPDATE MapLocation SET locationName=@locationName, locationType=@locationType, latitude=@latitude, longitude=@longitude, description=@description, isActive=@isActive WHERE locationID = @locationID`,
      { locationID, locationName: loc.locationName, locationType: loc.locationType, latitude: loc.latitude, longitude: loc.longitude, description: loc.description || null, isActive: loc.isActive !== undefined ? loc.isActive : true });
  }
  static async delete(locationID) {
    await query('DELETE FROM MapLocation WHERE locationID = @locationID', { locationID });
  }
}

module.exports = MapLocation;
