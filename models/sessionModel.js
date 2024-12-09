const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  session: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // Автоматичне видалення через 30 днів
});

module.exports = mongoose.model('Session', sessionSchema);
