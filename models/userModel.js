import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { t } from '../i18n.js';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true
  },
  password: { 
    type: String, 
    required: [true, t('user.errors.password_required')],
  },
  phoneNumber: {
    type: String,
    required: [true, t('user.errors.phone_required')],
    unique: true,
    validate: {
      validator: function(v) {
        return /\+?[0-9]{7,15}/.test(v);
      },
      message: props => t('user.errors.phone_validation', {number: props.value})
    }
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();

  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }

  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
