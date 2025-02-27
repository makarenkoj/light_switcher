import mongoose from 'mongoose';

const devicesTriggersSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Devices', required: true },
  triggerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Triggers', required: true },
}, { timestamps: true });

devicesTriggersSchema.index({ deviceId: 1, triggerId: 1 }, { unique: true });

export default mongoose.model('DevicesTriggers', devicesTriggersSchema);
