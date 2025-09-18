import React, { useState } from "react";

export const Chat: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<string>("user_1");

  // Mock data for display
  const conversations = [
    { id: "group_1", name: "Group_1", lastMessage: "dfgdf", time: "2 hours ago", type: "group" },
    { id: "user_1", name: "Md Sahjalal", lastMessage: "hey jalal", time: "3 hours ago", type: "user" }
  ];

  return (
    <div className="flex h-screen  w-screen font-sans bg-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 flex flex-col border border-gray-400">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="m-0 text-white text-base font-semibold">
            Conversations
          </h3>
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <button className="w-6 h-6 bg-gray-700 border-none rounded text-gray-300 cursor-pointer text-base flex items-center justify-center hover:bg-gray-600 transition-colors">
              +
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedChat(conv.id)}
              className={`p-3 cursor-pointer border-b border-gray-700 flex items-center gap-3 transition-colors hover:bg-gray-800 ${
                selectedChat === conv.id ? 'bg-gray-800' : ''
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold ${
                conv.type === "group" 
                  ? 'rounded-lg bg-indigo-600' 
                  : 'rounded-full bg-gray-600'
              }`}>
                {conv.type === "group" ? "📱" : conv.name.charAt(0).toUpperCase()}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <div className="text-white text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {conv.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {conv.time}
                  </div>
                </div>
                <div className="text-gray-400 text-xs overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                  {conv.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 border border-gray-400 flex flex-col bg-gray-800">
        {/* Chat Header */}
        <div className="px-5 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
              M
            </div>
            <div>
              <div className="text-white  text-base font-semibold">
                {conversations.find(c => c.id === selectedChat)?.name || "Md Sahjalal"}
              </div>
            </div>
          </div>
          <button className="bg-transparent border-none text-gray-400 cursor-pointer text-lg hover:text-white transition-colors">
            ⚙️
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-5 bg-gray-800 overflow-y-auto relative">
          {/* Sample message bubble in top right */}
          <div className="absolute top-5 right-5">
            <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
              hey jalal
            </div>
            <div className="text-right text-gray-400 text-xs mt-1">
              3 hours ago
            </div>
          </div>
        </div>

        {/* Fixed Message Input at Bottom */}
        <div className="p-5 bg-gray-800">
          <div className="bg-gray-700 rounded-lg flex items-center px-4 py-3 gap-3">
            <input
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none outline-none text-gray-200 text-sm placeholder-gray-400"
            />
            <button className="bg-blue-600 border-none rounded-full w-8 h-8 text-white cursor-pointer text-sm flex items-center justify-center hover:bg-blue-500 transition-colors">
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
