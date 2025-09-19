const mongoose = require('mongoose');

const groupUserSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },   // username
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Rooms", required: true },     // room id or name
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupUsers', groupUserSchema);
