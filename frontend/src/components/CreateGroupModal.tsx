import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Group {
  _id: string;
  name: string;
  participants: string[];
  type: string;
  createdAt: string;
}


interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadUsers = React.useCallback(async () => {
    try {
      // For now, using mock data. Replace with actual API call:
      const res = await axios.get(`${BACKEND}/users`);
      setUsers(res.data);
    //   setUsers(mockUsers);
    } catch (err) {
      console.error("Error loading users:", err);
    //   setUsers(mockUsers); // Fallback to mock data
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Load users from API
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedUserIds.length === 0 || selectedUserIds.length < 2) {
      alert("Please select at least two users for the group");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND}/groups`, {
        name: groupName,
        participants: selectedUserIds, // Current user will be added by backend
        type: "group",
      });

      onGroupCreated(response.data);
      onClose();
      setGroupName("");
      setSelectedUserIds([]);
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setGroupName("");
    setSelectedUserIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Create New Group</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Group Name:
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Users ({selectedUserIds.length} selected):
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-md">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center p-3 hover:bg-gray-700 border-b border-gray-600 last:border-b-0"
              >
                <input
                  type="checkbox"
                  id={`user-${user._id}`}
                  checked={selectedUserIds.includes(user._id)}
                  onChange={() => handleUserToggle(user._id)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`user-${user._id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="text-white text-sm font-medium">
                    {user.name}
                  </div>
                  <div className="text-gray-400 text-xs">{user.email}</div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUserIds.length === 0 || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};
