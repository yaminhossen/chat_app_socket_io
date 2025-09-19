import React from "react";

export const ConversationPlaceholder: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-800">
      <div className="text-center">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-2xl text-white font-semibold mb-2">
          Select a conversation
        </h2>
        <p className="text-gray-400">
          Choose a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};
