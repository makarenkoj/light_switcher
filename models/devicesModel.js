import mongoose from 'mongoose';

const devicesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  deviceId: { type: String, required: true, unique: true },
  accessId: { type: String, required: true },
  secretKey: { type: String, required: true },
  status: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Devices', devicesSchema);
