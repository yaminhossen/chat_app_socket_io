const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const Message = require('./models/Message');
const GroupUser = require('./models/Group_user');
const Room = require('./models/Room');
const User = require('./models/User');

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json());

const server = http.createServer(app);

// configure socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET','POST']
  }
});

// connect to mongo
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('Mongo err', err));

// REST endpoint to fetch history for a room
app.get('/messages/:room', async (req, res) => {
  const { room } = req.params;
  try {
    const messages = await Message.find({ room }).sort({ createdAt: 1 }).limit(200);
    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// REST endpoint to fetch all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// REST endpoint to fetch all rooms
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});
// create user
app.post('/create/user', async (req, res) => {
  console.log('req.body', req.body);
  const { name, email, password } = req.body;
  try {
    const user = new User({ name, email, password });
    await user.save();
    return res.status(201).json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});
// create room
app.post('/create/room', async (req, res) => {
  const { fr_id } = req.body;
  console.log('req.body', fr_id);
  try {
    // find the first user in Users collection
    // const firstUser = await User.findOne().sort({ _id: 1 });

    // if (!firstUser) {
    //   return res.status(404).json({ error: "No users found in the database" });
    // }
    const friend = await User.findOne({ _id: fr_id });


    console.log('friend', friend);
    if (!friend) {
      return res.status(404).json({ error: "Friend not found" });
    }

    const room = new Room({ name: friend.name, type: 'private', fr_id: friend._id, my_id: '68cdaf456654b2a6e948dfca' });
    await room.save();
    return res.status(201).json(room);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// socket.io logic
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  // join room
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`${socket.id} joined ${room}`);
  });

 
  
  // handle sending message
  socket.on('send_message', async (data) => {
    // expected data: { room, sender, text }
    console.log('send_message', data);
    try {
      const message = new Message({
        room: data.room,
        sender: data.sender,
        content: data.text
      });
      await message.save();

      // emit to everyone in the room
      io.to(data.room).emit('receive_message', message);
    } catch (err) {
      console.error('save msg error', err);
    }
  });

  // optional typing indicator
  socket.on('typing', ({ room, sender, isTyping }) => {
    socket.to(room).emit('typing', { sender, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
