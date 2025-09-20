import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Message {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
  room: string;
}

interface Conversation {
  _id: string;
  name: string;
  type: "user" | "group";
  isOnline: boolean;
}

// Mock data for conversations - in real app, this would come from your backend
const conversations: Conversation[] = [
  {
    _id: "68cdb2ac6ab38aaf6d8789fd",
    name: "Group_1",
    type: "group",
    isOnline: true,
  },
  {
    _id: "68cdb2c96ab38aaf6d878a01",
    name: "Md Sahjalal",
    type: "user",
    isOnline: true,
  },
  {
    _id: "68cdb2d06ab38aaf6d878a05",
    name: "Md Mahfuz",
    type: "user",
    isOnline: false,
  },
  {
    _id: "68cdb2d56ab38aaf6d878a09",
    name: "Md Zawad",
    type: "user",
    isOnline: true,
  },
];

export const ConversationDetail: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationData, setConversationData] = useState<Conversation | null>(
    null
  );
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Find conversation data
    const conv = conversations.find((c) => c._id === conversationId);
    setConversationData(conv || null);

    // Initialize socket connection
    if (!socketRef.current) {
      socketRef.current = io(BACKEND);
    }

    const socket = socketRef.current;

    // Join the conversation room
    if (conversationId) {
      socket.emit("join_room", conversationId);
    }

    // Listen for messages
    socket.on("receive_message", (msg: Message) => {
      if (msg.room === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Listen for typing events
    socket.on("typing", ({ sender, isTyping, room }) => {
      if (room === conversationId) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(sender) ? prev : [...prev, sender];
          } else {
            return prev.filter((u) => u !== sender);
          }
        });
      }
    });

    // Load message history
    const loadMessages = async () => {
      try {
        const res = await axios.get<Message[]>(
          `${BACKEND}/messages/${conversationId}`
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    };

    if (conversationId) {
      loadMessages();
    }

    return () => {
      if (conversationId && socket) {
        socket.emit("leave_room", conversationId);
      }
    };
  }, [conversationId]);

  const sendMessage = () => {
    if (message.trim() && socketRef.current && conversationId) {
      const newMessage: Message = {
        _id: Date.now().toString(),
        sender: "68cdaf456654b2a6e948dfca", // In real app, get from auth context
        content: message,
        timestamp: new Date().toISOString(),
        room: conversationId,
      };

      socketRef.current.emit("send_message", newMessage);

      // optimistically add to UI
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!conversationData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-white">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      {/* Chat Header */}
      <div className="px-5 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 flex items-center justify-center text-white text-sm font-semibold ${
              conversationData.type === "group"
                ? "rounded-lg bg-indigo-600"
                : "rounded-full bg-gray-600"
            }`}
          >
            {conversationData.type === "group"
              ? "📱"
              : conversationData.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white text-base font-semibold">
              {conversationData.name}
            </div>
            <div className="text-gray-400 text-xs">
              {conversationData.isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </div>
        <button className="bg-transparent border-none text-gray-400 cursor-pointer text-lg hover:text-white transition-colors">
          ⚙️
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-5 bg-gray-800 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`mb-4 ${
                msg.sender === "current_user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm max-w-xs ${
                  msg.sender === "current_user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                {msg.content}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-gray-400 text-sm italic">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
            typing...
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-5 bg-gray-800 border-t border-gray-700">
        <div className="bg-gray-700 rounded-lg flex items-center px-4 py-3 gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none outline-none text-gray-200 text-sm placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 border-none rounded-full w-8 h-8 text-white cursor-pointer text-sm flex items-center justify-center hover:bg-blue-500 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};
