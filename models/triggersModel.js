import mongoose from 'mongoose';

const triggersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  triggerOn: { type: String, required: true },
  triggerOff: { type: String, required: true },
  chanelName: { type: String, required: true },
  chanelId: { type: String, required: true },
  status: { type: Boolean, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

triggersSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  const triggerId = this._id;
  await mongoose.model('DevicesTriggers').deleteMany({ triggerId });
  next();
});

export default mongoose.model('Triggers', triggersSchema);
