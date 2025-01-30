import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  deviceId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  accessId: { 
    type: String, 
    required: true 
  },
  accessSecret: {
    type: String, 
    required: true 
  },
    userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { timestamps: true });

export default mongoose.model('Device', deviceSchema);
