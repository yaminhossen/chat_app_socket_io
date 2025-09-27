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
  otherUser: any[];
  type: "single" | "group";
  isOnline: boolean;
}

// Full conversation data from API
interface ConversationFromAPI {
  _id: string;
  name?: string;
  otherUser?: string;
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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
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
        console.log('Message received:', msg);
        
      }
    };

    const handleTyping = ({ sender, isTyping, room_id }: { sender: string; isTyping: boolean; room_id: string }) => {
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

    const handleUserStatusChange = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUsers((prev) => {
        if (isOnline) {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter((u) => u !== userId);
        }
      });
    };

    // Load initial online users
    const loadOnlineUsers = async () => {
      try {
        const res = await axios.get(`${BACKEND}/users/online`, {
          withCredentials: true
        });
        setOnlineUsers(res.data.onlineUsers || []);
      } catch (err) {
        console.error("Error loading online users:", err);
      }
    };

    loadOnlineUsers();

    // Announce user is online when socket connects
    if (authUser) {
      socket.emit("user_online", authUser);
    }

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("user_status_change", handleUserStatusChange);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("user_status_change", handleUserStatusChange);
    };
  }, [conversationId, authUser]); // re-run when room or user changes

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
      console.log('conv found for conversationId', conv);
      
      if (conv) {
        setConversationData({
          _id: conv._id,
          name: conv.name || 'Unknown',
          otherUser: conv.otherUser || 'Unknown',
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

      // Stop typing indicator
      handleTypingStop();

      setMessage("");
    }
  };

  const handleTypingStart = () => {
    if (socketRef.current && conversationId && authUser) {
      socketRef.current.emit("typing", {
        room: conversationId,
        sender: authUser,
        isTyping: true
      });
    }
  };

  const handleTypingStop = () => {
    if (socketRef.current && conversationId && authUser) {
      socketRef.current.emit("typing", {
        room: conversationId,
        sender: authUser,
        isTyping: false
      });
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Start typing indicator
    handleTypingStart();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      handleTypingStop();
    }, 2000);
  };

  // Get date string for grouping messages (YYYY-MM-DD format)
  const getDateString = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "invalid";
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  };

  // Format date header for display
  const formatDateHeader = (dateString: string): string => {
    if (dateString === "invalid") return "Invalid Date";
    
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = getDateString(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    // Convert to array and sort by date
    return Object.keys(groups)
      .sort() // Sorts in YYYY-MM-DD format naturally
      .map(dateKey => ({
        date: dateKey,
        dateHeader: formatDateHeader(dateKey),
        messages: groups[dateKey]
      }));
  };

  // Format timestamp for message time (only time, since date is shown in header)
  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) {
      return "Invalid time";
    }
    
    const messageDate = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(messageDate.getTime())) {
      console.error("Invalid timestamp:", timestamp);
      return "Invalid time";
    }
    
    try {
      // Always show just the time since date is shown in the header
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid time";
    }
  };

  // Check if other user is online
  const isOtherUserOnline = () => {
    if (!conversationData || conversationData.type === "group") {
      return false; // For groups, we'll show "group" status for now
    }
    
    // For single conversations, find the other user ID
    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation && conversation.participants) {
      const otherUserId = conversation.participants.find((p: any) => p._id !== authUser)?._id;
      return otherUserId && onlineUsers.includes(otherUserId);
    }
    
    return false;
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
console.log('conversationData:', conversationData);

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
              {conversationData.otherUser?.name}
            </div>
            <div className="text-gray-400 text-xs">
              {conversationData.type === "group" 
                ? "Group chat" 
                : isOtherUserOnline() 
                  ? "🟢 Online" 
                  : "🔴 Offline"
              }
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
          groupMessagesByDate(messages).map((dateGroup) => (
            <div key={dateGroup.date}>
              {/* Date Header */}
              <div className="flex justify-center my-4">
                <div className="bg-gray-700 px-3 py-1 rounded-lg text-xs text-gray-300">
                  {dateGroup.dateHeader}
                </div>
              </div>
              
              {/* Messages for this date */}
              {dateGroup.messages.map((msg) => (
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
                    {formatMessageTime(msg.timestamp)}
                  </div>
                </div>
              ))}
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
        <div className="bg-gray-700 rounded-lg flex items-center px-4 h-14 gap-3">
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 h-full bg-transparent border-none outline-none text-gray-200 text-sm placeholder-gray-400"
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
