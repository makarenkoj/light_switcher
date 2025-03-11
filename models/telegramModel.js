import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'mysecretkey123456';
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
}

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
};

const decrypt = (text) => {
  const iv = Buffer.from(text.substring(0, IV_LENGTH * 2), 'hex');
  const encryptedText = text.substring(IV_LENGTH * 2);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const telegramSchema = new mongoose.Schema({
  channel: { 
    type: String, 
    required: true
  },
  apiId: { 
    type: String, 
    required: true, 
    unique: true
  },
  apiHash: { 
    type: String, 
    required: true,
    unique: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
}, { timestamps: true });

telegramSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingTelegram = await mongoose.model('Telegram').findOne({ userId: this.userId });
    if (existingTelegram) {
      return next(new Error('Telegram already exists'));
    }
  }

  if (this.isModified('apiId')) {
    this.apiId = encrypt(this.apiId);
  }
  if (this.isModified('apiHash')) {
    this.apiHash = encrypt(this.apiHash);
  }
  
  next();
});

telegramSchema.methods.getDecryptedApiId = function () {
  return decrypt(this.apiId);
};

telegramSchema.methods.getDecryptedApiHash = function () {
  return decrypt(this.apiHash);
};

export default mongoose.model('Telegram', telegramSchema);
