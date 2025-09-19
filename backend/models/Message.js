const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Rooms", required: true },    // room id or name
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },   // username
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
