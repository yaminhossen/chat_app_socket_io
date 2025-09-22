const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Rooms", required: true },    // room id or name
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },   // username
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users"},   // username
  content: { type: String, required: true },
  type: { type: String, required: true }, // group type (group or single)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
