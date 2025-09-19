import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Chat } from "./components/Chat";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ConversationDetail } from "./components/ConversationDetail";
import { ConversationPlaceholder } from "./components/ConversationPlaceholder";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />}>
          <Route index element={<ConversationPlaceholder />} />
          <Route path="conversation/:conversationId" element={<ConversationDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
