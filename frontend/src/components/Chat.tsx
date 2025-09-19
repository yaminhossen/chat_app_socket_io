import React from "react";
import { Sidebar } from "../pages/Sidebar";
import { Outlet } from "react-router-dom";

export const Chat: React.FC = () => {
  return (
    <div className="flex h-screen w-screen font-sans bg-gray-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Chat Area - This will render the child routes */}
      <Outlet />
    </div>
  );
};
