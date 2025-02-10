import mongoose from 'mongoose';

const devicesTriggersSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  triggerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trigger', required: true },
}, { timestamps: true });

export default mongoose.model('DevicesTriggers', devicesTriggersSchema);
