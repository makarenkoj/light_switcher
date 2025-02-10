import mongoose from 'mongoose';

const triggerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  triggerOn: { type: String, required: true },
  triggerOff: { type: String, required: true },
  chanelName: { type: String, required: true },
  status: { type: Boolean, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Trigger', triggerSchema);
