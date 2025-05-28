import mongoose from 'mongoose';

const indicatorsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['alarm', 'power'],
    required: true
  },
  status: {
    type: Boolean,
    required: true,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trigger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Triggers',
    required: true
  }
});

indicatorsSchema.index({ user: 1, type: 1 }, { unique: true });
indicatorsSchema.index({ trigger: 1, type: 1 }, { unique: true });

export default mongoose.model('Indicators', indicatorsSchema);
