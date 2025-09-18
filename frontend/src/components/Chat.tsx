import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";

type Message = {
  _id?: string;
  room: string;
  sender: string;
  content: string;
  createdAt: string;
};

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const Chat: React.FC = () => {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("global");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);


  useEffect(() => {
    // create socket once
    socketRef.current = io(BACKEND);

    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnected(true);
      console.log("connected socket", socket);
      console.log("connected", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("receive_message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("typing", ({ sender, isTyping }) => {
  setTypingUsers((prev) => {
    if (isTyping) {
      // add sender if not already in the list
      if (!prev.includes(sender)) {
        return [...prev, sender];
      }
      return prev;
    } else {
      // remove sender when they stop typing
      return prev.filter((u) => u !== sender);
    }
  });
});


    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = async () => {
    if (!username || !room) return alert("enter username and room");
    const socket = socketRef.current!;
    socket.emit("join_room", room);

    // load history
    try {
      const res = await axios.get<Message[]>(`${BACKEND}/messages/${room}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = () => {
  if (message.trim()) {
    socketRef.current?.emit("chatMessage", {
      room,
      sender: username,
      text: message,
    });

    // stop typing indicator after send
    socketRef.current?.emit("typing", {
      room,
      sender: username,
      isTyping: false,
    });

    setMessage("");
  }
};


  return (
    <div style={{ maxWidth: 700, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h2>Simple Chat</h2>
      <div>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your name" />
        <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="Room (e.g. global)" />
        <button onClick={joinRoom}>Join Room</button>
        <span style={{ marginLeft: 10 }}>{connected ? "● online" : "● offline"}</span>
      </div>

      <div style={{ border: "1px solid #ddd", height: 350, overflowY: "auto", padding: 10, marginTop: 10 }}>
        {messages.map((m) => (
          <div key={m._id ?? Math.random()} style={{ marginBottom: 8 }}>
            <strong>{m.sender}</strong>: <span>{m.content}</span>
            <div style={{ fontSize: 11, color: "#666" }}>{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <input
  type="text"
  value={message}
  onChange={(e) => {
    setMessage(e.target.value);

    socketRef.current?.emit("typing", {
      room,
      sender: username,
      isTyping: e.target.value.length > 0, // only true when not empty
    });
  }}
  onBlur={() => {
    // when focus out
    socketRef.current?.emit("typing", {
      room,
      sender: username,
      isTyping: false,
    });
  }}
/>

        <button onClick={sendMessage}>Send</button>
      </div>
      <div style={{ height: 20, color: "gray", fontStyle: "italic", marginTop: 4 }}>
  {typingUsers.length > 0 && (
    <span>
      {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
    </span>
  )}
</div>

    </div>
  );
};
