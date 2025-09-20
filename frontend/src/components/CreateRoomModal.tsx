import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Room {
  _id: string;
  participants: string[];
  type: string;
  createdAt: string;
}

// Mock users data - replace with actual API call
const mockUsers: User[] = [
  { _id: "user_1", name: "Md Sahjalal", email: "sahjalal@example.com" },
  { _id: "user_2", name: "Md Mahfuz", email: "mahfuz@example.com" },
  { _id: "user_3", name: "Md Zawad", email: "zawad@example.com" },
  { _id: "user_4", name: "John Doe", email: "john@example.com" },
  { _id: "user_5", name: "Jane Smith", email: "jane@example.com" },
];

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (room: Room) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadUsers = React.useCallback(async () => {
    try {
      // For now, using mock data. Replace with actual API call:
      const res = await axios.get(`${BACKEND}/users`);
      setUsers(res.data);
    //   setUsers(mockUsers);
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers(mockUsers); // Fallback to mock data
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Load users from API
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  const handleCreateRoom = async () => {
    if (!selectedUserId) {
      alert("Please select a user to create a room with");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND}/create/room`, {
        user_id: '68cdaf456654b2a6e948dfca', // Current user will be added by backend
        user_b: selectedUserId, // Current user will be added by backend
        type: "single", // Single chat room
      });

      onRoomCreated(response.data);
      onClose();
      setSelectedUserId("");
    } catch (err) {
      console.log('error-----', err);

      console.error("Error creating room:", err);
      alert(`Failed to create room. Please try again. ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUserId("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Create New Room</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select User to Chat With:
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a user...</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={!selectedUserId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Ok"}
          </button>
        </div>
      </div>
    </div>
  );
};
