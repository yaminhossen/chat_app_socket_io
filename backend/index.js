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
const authenticateToken = (req, res, next) => {
  // Check for token in cookies or Authorization header
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
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
app.get("/messages/:room", async (req, res) => {
  const { room } = req.params;
  try {
    const messages = await Message.find({ room_id: room })
      .sort({ createdAt: 1 })
      .limit(200);
    return res.json(messages);
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
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find();
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
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
app.post("/create/room", async (req, res) => {
  const { user_b, user_id, members, type } = req.body;
  // `user_id` = who is creating room
  // `user_b` = friend id (for single chat)
  // `members` = array of user_ids (for group chat)
  // `type` = "single" or "group"

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      message: "Login successful",
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

// socket.io logic
io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);

  // join room
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined ${room}`);
  });

  // handle sending message
  socket.on("send_message", async (data) => {
    // expected data: { room, sender, text }
    console.log("send_message", data);
    try {
      const message = new Message({
        room_id: data.room,
        sender_id: data.sender,
        content: data.content,
      });
      await message.save();

      // emit to everyone in the room
      io.to(data.room).emit("receive_message", message);
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
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
