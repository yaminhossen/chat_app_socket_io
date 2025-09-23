import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Message structure
interface Message {
  _id: string;
  sender_id?: string;
  content: string;
  timestamp: string;
  room_id: string;
}

// User (from your JWT / DB)
interface AuthUser {
  userId: string;
  email: string;
  name?: string;
}

// Full API response
interface MessagesResponse {
  user: AuthUser;
  messages: Message[];
}


interface Conversation {
  _id: string;
  name: string;
  type: "single" | "group";
  isOnline: boolean;
}

// Full conversation data from API
interface ConversationFromAPI {
  _id: string;
  name?: string;
  type: "single" | "group";
  participants?: any[];
  members?: any[];
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
}



export const ConversationDetail: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [message, setMessage] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationData, setConversationData] = useState<Conversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const [conversations, setConversations] = useState<ConversationFromAPI[]>([]);

  // Load conversation list
  const loadConversations = React.useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND}/rooms`, {
        withCredentials: true
      });
      setConversations(res.data);
    } catch (err) {
      console.log(err);
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Setup socket connection ONCE
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(BACKEND);
    }

    const socket = socketRef.current;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.room_id === conversationId) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
      }
    };

    const handleTyping = ({ sender, isTyping, room_id }) => {
      if (room_id === conversationId) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(sender) ? prev : [...prev, sender];
          } else {
            return prev.filter((u) => u !== sender);
          }
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
    };
  }, [conversationId]); // re-run only if room changes

  // Handle conversation + load history
  useEffect(() => {
    const loadConversationAndMessages = async () => {
      if (!conversationId) return;
      
      try {
        // Always refresh conversations list when switching to a new conversation
        // This ensures we have the latest data including newly created rooms
        await loadConversations();
        
        // Load messages for this conversation
        const res = await axios.get<MessagesResponse>(`${BACKEND}/messages/${conversationId}`, {
          withCredentials: true
        });
        setMessages(res.data.messages);
        setAuthUser(res.data.user.userId);
        
      } catch (err) {
        console.error("Error loading conversation data:", err);
        setConversationData(null);
      }
    };

    loadConversationAndMessages();

    if (conversationId) {
      socketRef.current?.emit("join_room", conversationId);
    }

    return () => {
      if (conversationId) {
        socketRef.current?.emit("leave_room", conversationId);
      }
    };
  }, [conversationId, loadConversations]);

  // Update conversation data when conversations list changes
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === conversationId);
      if (conv) {
        setConversationData({
          _id: conv._id,
          name: conv.name || 'Unknown',
          type: conv.type,
          isOnline: false // You can add online status logic later
        });
      } else {
        setConversationData(null);
      }
    }
  }, [conversations, conversationId]);

  const sendMessage = () => {
    if (message.trim() && socketRef.current && conversationId) {
      const newMessage: Message = {
        _id: Date.now().toString(),
        sender_id: authUser,
        content: message,
        timestamp: new Date().toISOString(),
        room_id: conversationId,
      };

      // Send to server
      socketRef.current.emit("send_message", newMessage);

      // Optimistic update (prevent duplicate on server echo)
      // setMessages((prev) =>
      //   prev.some((m) => m._id === newMessage._id) ? prev : [...prev, newMessage]
      // );

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
                msg.sender_id === authUser ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm max-w-xs ${
                  msg.sender_id === authUser
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
