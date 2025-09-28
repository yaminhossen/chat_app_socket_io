import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { CreateRoomModal } from "../components/CreateRoomModal";
import logo from "../assets/logo.png";
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
  const [currentTime, setCurrentTime] = useState(new Date());
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
    console.log("Room created:------------------", room);
    // Reload conversations to show the new room
    loadConversations();
  };

 
  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string | Date) => {
        const now = new Date();
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Dhaka',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const parts = formatter.formatToParts(now);
const isoDhaka = `${parts[0].value}-${parts[2].value}-${parts[4].value}T${parts[6].value}:${parts[8].value}:${parts[10].value}.000Z`;

console.log(isoDhaka);
    // const now = currentTime; // Use currentTime state instead of new Date()
    // const messageTime = new Date(timestamp);
    // const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    // const diffInMinutes = Math.floor((isoDhaka - timestamp) / (1000 * 60));
    const diffInMinutes = Math.floor((new Date(isoDhaka).getTime() - new Date(timestamp).getTime()) / (1000 * 60));
    console.log("Formatting time ago:", {timestamp, now });


    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    // return messageTime.toLocaleDateString();
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const loadingRef = useRef(false);

  // Update current time every minute to refresh "time ago" display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

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

    // Listen for new room/group creation
    socket.on("room_created", (data: { room: any; participant_id: string }) => {
      console.log("New room created:", data);
      
      // Refresh conversations to include the new room
      // The backend /rooms endpoint will only return rooms the user has access to
      loadConversations();
    });
    
    return () => {
      socket.off("conversation_updated");
      socket.off("room_created");
      // Optionally disconnect socket when component unmounts
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [loadConversations]); // Include loadConversations dependency

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
        <h3 className="m-0 text-blue-600 w-full text-base text-xl font-semibold">
          AddaZone
          {/* <img src={logo} style={{ width: "100px", height: "auto", color: "white" }} alt="AddaZone Logo" className="inline-block w-6 h-6 ml-1" /> */}
        </h3>
        <div className="flex gap-2 items-center">
          {/* Create Group Button */}
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="w-8 h-8 p-1 bg-gray-700 border-none rounded text-white cursor-pointer flex items-center justify-center hover:bg-gray-600 transition-colors"
            title="Create Group"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5"
            >
              <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              <circle cx="18" cy="8" r="2"/>
              <path d="M18 10c-1.1 0-2.17.35-3 .99.83.65 1.35 1.62 1.35 2.68V16h5v-2.33c0-1.06-1.79-2.67-3.35-2.67z"/>
              <circle cx="6" cy="8" r="2"/>
              <path d="M6 10c1.1 0 2.17.35 3 .99C8.17 11.64 7.65 12.61 7.65 13.67V16H2.65v-2.33C2.65 12.61 4.44 11 6 10z"/>
            </svg>
          </button>
          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="w-8 h-8 p-1 bg-gray-700 border-none rounded text-white 
             cursor-pointer flex items-center justify-center 
             hover:bg-gray-600 transition-colors"
            title="Create Room"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
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
              {/* {conv.type === "group" ? "📱" : conv.otherUser?.name.charAt(0).toUpperCase()} */}
              {conv.type === "group" ? <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5"
            >
              <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              <circle cx="18" cy="8" r="2"/>
              <path d="M18 10c-1.1 0-2.17.35-3 .99.83.65 1.35 1.62 1.35 2.68V16h5v-2.33c0-1.06-1.79-2.67-3.35-2.67z"/>
              <circle cx="6" cy="8" r="2"/>
              <path d="M6 10c1.1 0 2.17.35 3 .99C8.17 11.64 7.65 12.61 7.65 13.67V16H2.65v-2.33C2.65 12.61 4.44 11 6 10z"/>
            </svg> : conv.otherUser?.name.charAt(0).toUpperCase()}
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
