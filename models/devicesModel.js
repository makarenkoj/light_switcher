import mongoose from 'mongoose';

const devicesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  deviceId: { type: String, required: true, unique: true },
  accessId: { type: String, required: true },
  secretKey: { type: String, required: true },
  status: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceTrigerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeviceTriger' }
}, { timestamps: true });

devicesSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  const deviceId = this._id;
  await mongoose.model('DevicesTriggers').deleteMany({ deviceId });
  next();
});

export default mongoose.model('Devices', devicesSchema);
