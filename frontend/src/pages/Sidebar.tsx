import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { CreateRoomModal } from "../components/CreateRoomModal";
import axios from "axios";
import { io, Socket } from "socket.io-client";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Conversation {
  _id: string;
  name: string;
  type: "single" | "group";
  otherUser?: {
    _id: string;
    name: string;
    email: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender: string | null;
}

interface ConversationUpdateData {
  roomId: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender: string;
}

export const Sidebar: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const handleGroupCreated = (group: {
    _id: string;
    name: string;
    members: string[];
    type: string;
    createdAt: string;
  }) => {
    console.log("Group created:", group);
    // Reload conversations to show the new group
    loadConversations();
  };

  const handleRoomCreated = (room: {
    _id: string;
    participants: string[];
    type: string;
    createdAt: string;
  }) => {
    console.log("Room created:", room);
    // Reload conversations to show the new room
    loadConversations();
  };

 
  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return messageTime.toLocaleDateString();
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const loadingRef = useRef(false);

  const loadConversations = React.useCallback(async () => {
    if (loadingRef.current) return; // Prevent multiple simultaneous calls
    
    loadingRef.current = true;
    try {
      const res = await axios.get(`${BACKEND}/rooms`, {
        withCredentials: true
      });
      console.log('Rooms loaded:', res.data);
      
      setConversations(res.data);
    } catch (err) {
      console.error("Error loading conversations:", err);
      window.location.href = "/login";
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Separate useEffect for socket connection
  useEffect(() => {
    // Initialize socket connection for real-time updates
    if (!socketRef.current) {
      socketRef.current = io(BACKEND);
    }
    
    const socket = socketRef.current;
    
    // Listen for conversation updates when new messages arrive
    socket.on("conversation_updated", (data: ConversationUpdateData) => {
      console.log("Conversation updated:", data);
      
      // Optimize: Update specific conversation instead of reloading all
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => {
          if (conv._id === data.roomId) {
            return {
              ...conv,
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime,
              lastMessageSender: data.lastMessageSender
            };
          }
          return conv;
        });
        
        // Sort by most recent message time
        return updatedConversations.sort((a, b) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
      });
    });
    
    return () => {
      socket.off("conversation_updated");
      // Optionally disconnect socket when component unmounts
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - runs only once

  // Separate useEffect to join rooms when conversations change
  useEffect(() => {
    if (socketRef.current && conversations.length > 0) {
      const socket = socketRef.current;
      
      // Join all user's rooms for real-time updates
      conversations.forEach(conv => {
        socket.emit("join_room", conv._id);
      });
    }
  }, [conversations]);

  return (
    <div className="w-64 bg-gray-900 flex flex-col border border-gray-400">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="m-0 text-white text-base font-semibold">
          Conversations
        </h3>
        <div className="flex gap-2 items-center">
          {/* Create Group Button */}
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="w-8 h-8 p-4 bg-gray-700 border-none rounded text-white cursor-pointer  flex items-center justify-center hover:bg-gray-600 transition-colors font-bold"
            title="Create Group"
          >
            ++
          </button>
          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="w-8 h-8 p-4 bg-gray-700 border-none rounded text-white 
             cursor-pointer flex items-center justify-center 
             hover:bg-gray-600 transition-colors"
            title="Create Room"
          >
            +
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <Link
            key={conv._id}
            to={`/chat/conversation/${conv._id}`}
            className={`p-3 cursor-pointer border-b border-gray-700 flex items-center gap-3 transition-colors hover:bg-gray-800 block no-underline ${
              conversationId === conv._id ? "bg-gray-800" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold ${
                conv.type === "group"
                  ? "rounded-lg bg-indigo-600"
                  : "rounded-full bg-gray-600"
              }`}
            >
              {conv.type === "group" ? "📱" : conv.otherUser?.name.charAt(0).toUpperCase()}
            </div>

            {/* Conversation Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <div className="text-white text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                  {conv.otherUser?.name || conv.name}
                </div>
                <div className="text-gray-400 text-xs">
                  {formatTimeAgo(conv.lastMessageTime)}
                </div>
              </div>
              <div className="text-gray-400 text-xs overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                {conv.type === "group" && conv.lastMessageSender
                  ? `${conv.lastMessageSender}: ${conv.lastMessage}`
                  : conv.lastMessage || "No messages yet"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      <CreateRoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
};
