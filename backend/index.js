const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
require("dotenv").config();

const Message = require("./models/Message");
const GroupUser = require("./models/Group_user");
const Room = require("./models/Room");
const User = require("./models/User");

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // Enable credentials for cookies
  })
);
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

// JWT Middleware for authentication
const authenticateToken = async(req, res, next) => {
  // Check for token in cookies or Authorization header
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
console.log("Authenticating token-------:", token);

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const finduser = await User.findOne({email: decoded.email});

    if(finduser.token === decoded.name){
      req.user = decoded;
    } else {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

const server = http.createServer(app);

// configure socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true, // 👈 allow cookies
  },
});

// connect to mongo
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/chat", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo err", err));

// REST endpoint to fetch history for a room
app.get("/messages/:room", authenticateToken, async (req, res) => {
  const { room } = req.params;
  let user = req.user;
  try {
    const messages = await Message.find({ room_id: room })
      .sort({ createdAt: 1 })
      .limit(200);
    
    // Transform messages to match frontend expectations
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      timestamp: msg.createdAt, // Map createdAt to timestamp
      room_id: msg.room_id,
      type: msg.type
    }));
    
    return res.json({ user: user, messages: transformedMessages });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// REST endpoint to fetch all users (protected route example)
app.get("/users", async (req, res) => {
  try {
    // const users = await User.find().select("-password"); // Exclude passwords
    const users = await User.find(); // Exclude passwords
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// REST endpoint to fetch all rooms
app.get("/rooms", authenticateToken, async (req, res) => {
  console.log("User in /rooms:", req.user);
  let user_id = req.user.userId;
  console.log("user_id", user_id);
  try {
    const userRooms = await GroupUser.find({ user_id: user_id }).select("room_id -_id");
    const roomIds = userRooms.map((gr) => gr.room_id);

    let rooms = await Room.find({ _id: { $in: roomIds } })
      .populate("user_a", "name email") // populate only required fields
      .populate("user_b", "name email");

    // Get last messages for each room
    const roomsWithMessages = await Promise.all(
      rooms.map(async (room) => {
        // Get the last message for this room
        const lastMessage = await Message.findOne({ room_id: room._id })
          .sort({ createdAt: -1 })
          .populate("sender_id", "name");

        let transformedRoom;
        if (room.type === "single") {
          let otherUser;
          if (room.user_a && room.user_a._id.toString() === user_id.toString()) {
            otherUser = room.user_b;
          } else if (room.user_b && room.user_b._id.toString() === user_id.toString()) {
            otherUser = room.user_a;
          }

          transformedRoom = {
            _id: room._id,
            name: room.name,
            type: room.type,
            otherUser, // 👈 this will contain the other user object
            lastMessage: lastMessage ? lastMessage.content : "No messages yet",
            lastMessageTime: lastMessage ? lastMessage.createdAt : room.createdAt,
            lastMessageSender: lastMessage ? lastMessage.sender_id?.name : null,
          };
        } else {
          // group room
          transformedRoom = {
            _id: room._id,
            name: room.name,
            type: room.type,
            lastMessage: lastMessage ? lastMessage.content : "No messages yet",
            lastMessageTime: lastMessage ? lastMessage.createdAt : room.createdAt,
            lastMessageSender: lastMessage ? lastMessage.sender_id?.name : null,
          };
        }

        return transformedRoom;
      })
    );

    // Sort rooms by last message time (most recent first)
    const sortedRooms = roomsWithMessages.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return res.json(sortedRooms);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});
// just sent the authenticate user data in frontend
app.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user }); // decoded user from JWT
});
// create user
app.post("/create/user", async (req, res) => {
  console.log("req.body", req.body);
  const { name, email, password } = req.body;
  try {
    const user = new User({ name, email, password });
    await user.save();
    return res.status(201).json(user);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});
// create room
// app.post("/create/room", async (req, res) => {
//   const { user_b } = req.body;
//   console.log("req.body", user_b);
//   try {
//     const existingRoom = await Room.findOne({ user_b: user_b });
//     if (existingRoom) {
//       return res.status(404).json({ error: "Room already exists" });
//     }
//     const friend = await User.findOne({ _id: user_b });
//     if (!friend) {
//       return res.status(404).json({ error: "Friend not found" });
//     }

//     const room = new Room({
//       name: friend.name,
//       type: "single",
//       user_a: '68cdaf456654b2a6e948dfca',
//       // user_a: req.user._id,
//       user_b: friend._id,
//     });
//     await room.save();
//     return res.status(201).json(room);
//   } catch (err) {
//     return res.status(500).json({ error: "Server error" });
//   }
// });

// create room
app.post("/create/room", authenticateToken, async (req, res) => {
  const { user_b, members, type } = req.body;
  // `user_id` = who is creating room
  // `user_b` = friend id (for single chat)
  // `members` = array of user_ids (for group chat)
  // `type` = "single" or "group"
  let user_id = req.user.userId;

  try {
    let room;

    if (type === "single") {
      // Check if room already exists between these two users
      const existingRoom = await Room.findOne({
        type: "single",
        $or: [
          { user_a: user_id, user_b: user_b },
          { user_a: user_b, user_b: user_id },
        ],
      });

      if (existingRoom) {
        return res.status(400).json({ error: "single room already exists" });
      }

      // Create new single room
      const friend = await User.findById(user_b);
      if (!friend) {
        return res.status(404).json({ error: "Friend not found" });
      }

      room = new Room({
        name: friend.name,
        type: "single",
        user_a: user_id,
        user_b: user_b,
      });
      await room.save();

      // Create GroupUser for creator and friend
      const groupUsers = [
        { user_id: user_id, room_id: room._id },
        { user_id: user_b, room_id: room._id },
      ];
      await GroupUser.insertMany(groupUsers);
    } else if (type === "group") {
      // Create group room
      room = new Room({
        name: req.body.name || "Unnamed Group",
        type: "group",
      });
      await room.save();

      // Ensure creator is in the members list
      const allMembers = [...new Set([user_id, ...(members || [])])];
      // Create GroupUser for all members
      const groupUsers = allMembers.map(
        (m) => (
          console.log(m),
          {
            user_id: m,
            room_id: room._id,
          }
        )
      );
      await GroupUser.insertMany(groupUsers);
    }

    // Emit socket event to notify all participants about the new room
    const roomData = await Room.findById(room._id)
      .populate("user_a", "name email")
      .populate("user_b", "name email");
    
    // Get all participants for this room
    const participants = await GroupUser.find({ room_id: room._id }).populate("user_id", "_id");
    
    // Emit to each participant
    participants.forEach(participant => {
      if (participant.user_id && participant.user_id._id) {
        io.emit("room_created", {
          room: roomData,
          participant_id: participant.user_id._id.toString()
        });
      }
    });

    return res.status(201).json(room);
  } catch (err) {
    console.error("Error creating room:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Authentication Routes

// Login route
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt", email);

  try {
    // Find user by email
    const user = await User.findOne({ email: email });
    console.log("user", user);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // In a real app, you should hash passwords and compare them
    // For now, direct comparison (you should implement password hashing)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // create secret
    let secret = Math.random().toString(36).substring(2, 10);
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: secret },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log("Generated token", token);

    user.token = secret;
    await user.save();
    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ❌ don't use HTTPS in localhost
      sameSite: "lax", // ✅ allows cross-site localhost requests
      maxAge: 24 * 60 * 60 * 1000,
    });
    
    console.log("Cookie set with token:", token);
    console.log("Response headers before sending:", res.getHeaders());
    
    // res.header('Set-Cookie', `token=${token}; HttpOnly; Max-Age=86400; Path=/; SameSite=Strict`);
    res.json({
      message: "Login successful",
      token: token, // Also send token in response for debugging
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register route
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user (in real app, hash the password)
    const user = new User({ name, email, password });
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout route
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});

// Test route to check cookies
app.get("/test/cookies", (req, res) => {
  console.log("All cookies received:", req.cookies);
  console.log("Token cookie:", req.cookies.token);
  res.json({
    message: "Cookie test",
    cookies: req.cookies,
    hasToken: !!req.cookies.token,
  });
});

// Protected route example
app.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get online users
app.get("/users/online", authenticateToken, (req, res) => {
  const onlineUserIds = Array.from(onlineUsers.keys());
  res.json({ onlineUsers: onlineUserIds });
});

// Store online users
const onlineUsers = new Map(); // userId -> socketId mapping

// socket.io logic
io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);

  // User comes online
  socket.on("user_online", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} is now online`);
    
    // Broadcast to all users that this user is online
    socket.broadcast.emit("user_status_change", {
      userId: userId,
      isOnline: true
    });
  });

  // join room
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined ${room}`);
  });

  // handle sending message
  socket.on("send_message", async (data) => {
    let user_id = data.sender_id;
    console.log("send_message", user_id, data);
    console.log("Frontend timestamp:", data.timestamp);
    // console.log("Server Date.now():", new Date().toISOString());
    // console.log("Parsed frontend timestamp:", new Date(data.timestamp).toISOString());
    
    const findroom = await Room.findOne({ _id: data.room_id });
    let receiver_id;
    if(user_id === findroom.user_a){
      receiver_id = findroom.user_b;
    } else {
      receiver_id = findroom.user_a;
    }
    try {
      const message = new Message({
        room_id: data.room_id,
        sender_id: user_id,
        receiver_id: receiver_id,
        content: data.content,
        type: findroom.type,
        createdAt: data.timestamp, // Use timestamp from frontend
      });
      await message.save();
      
      // console.log("Saved message createdAt:", message.createdAt.toISOString());

      // Get sender's name for conversation update
      const sender = await User.findById(user_id).select("name");
      const senderName = sender ? sender.name : "Unknown";

      // Transform message to match frontend expectations before emitting
      const transformedMessage = {
        _id: message._id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        timestamp: message.createdAt, // Map createdAt to timestamp
        room_id: message.room_id,
        type: message.type
      };

      // emit to everyone in the room
      io.to(data.room_id).emit("receive_message", transformedMessage);
      
      // Emit conversation update to all users in this room to update sidebar
      io.to(data.room_id).emit("conversation_updated", {
        roomId: data.room_id,
        lastMessage: data.content,
        lastMessageTime: message.createdAt,
        lastMessageSender: senderName // Use the looked-up name
      });
    } catch (err) {
      console.error("save msg error", err);
    }
  });

  // optional typing indicator
  socket.on("typing", ({ room, sender, isTyping }) => {
    socket.to(room).emit("typing", { sender, isTyping });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", socket.id);
    
    // Find which user went offline
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} went offline`);
        
        // Broadcast to all users that this user is offline
        socket.broadcast.emit("user_status_change", {
          userId: userId,
          isOnline: false
        });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
