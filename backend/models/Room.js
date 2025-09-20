const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },     // room name
  type: { type: String, required: true },     // room name
  user_a: { type: mongoose.Schema.Types.ObjectId, ref: "Users", default: null },
  user_b: { type: mongoose.Schema.Types.ObjectId, ref: "Users", default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rooms', roomSchema);
