import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { CreateRoomModal } from "../components/CreateRoomModal";
import axios from "axios";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const Sidebar: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  
  const [conversations, setConversations] = useState([]);

  const loadConversations = React.useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND}/rooms`);
      setConversations(res.data);
    } catch (err) {
      window.location.href = "/login";
    }
  }, []);

  const handleGroupCreated = (group: {
    _id: string;
    name: string;
    participants: string[];
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

 

  useEffect(() => {
    loadConversations();
  }, []);

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
              {conv.type === "group" ? "📱" : conv.name.charAt(0).toUpperCase()}
            </div>

            {/* Conversation Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <div className="text-white text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                  {conv.name}
                </div>
                <div className="text-gray-400 text-xs">{conv.time}</div>
              </div>
              <div className="text-gray-400 text-xs overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                {conv.lastMessage}
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
