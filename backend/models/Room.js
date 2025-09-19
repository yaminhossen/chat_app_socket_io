const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },     // room name
  my_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rooms', roomSchema);
