import { useEffect, useRef, useState } from "react";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import EmojiPicker from "./EmojiPicker";

function ChatPanel({ matchId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatEndRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!matchId || !user?.username) return undefined;
    if (!socket.connected) socket.connect();

    socket.emit("join_match", { matchId, username: user.username });
    const receiveHandler = (payload) => setMessages((prev) => [...prev, payload]);
    const historyHandler = (history) => setMessages(history);
    
    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("connect_error", (err) => console.error("Socket connection error:", err));
    socket.on("receive_message", receiveHandler);
    socket.on("chat_history", historyHandler);
    socket.on("chat_error", (payload) => {
      console.error("Chat error:", payload);
      setError(payload?.message || "Chat error");
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      socket.off("receive_message", receiveHandler);
      socket.off("chat_history", historyHandler);
      socket.off("chat_error", errorHandler);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [matchId, user?.username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!input.trim() || !matchId) return;
    socket.emit("send_message", { matchId, message: input.trim() });
    setInput("");
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    return `${Math.floor(seconds / 3600)} hr ago`;
  };

  return (
    <div className="flex h-full max-h-[700px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl shadow-cyan-950/20 sm:min-h-[700px]">
      <div className="p-4 sm:p-5 pb-2 sm:pb-3 shrink-0">
        <h3 className="text-lg font-bold text-slate-100 sm:text-xl">Match Chat</h3>
      </div>

      <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto px-4 sm:px-5 py-2 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-slate-500 sm:text-sm">No messages yet. Start the fan war!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.timestamp}-${index}`} className="flex items-start gap-2 sm:gap-3">
              <img src={`https://ui-avatars.com/api/?name=${msg.username}&background=0f172a&color=22d3ee`} alt="avatar" className="mt-1 h-6 w-6 shrink-0 rounded-full border border-slate-700 shadow-sm sm:h-8 sm:w-8" />
              <div className="flex-1 rounded-2xl rounded-tl-none border border-slate-700 bg-slate-800 p-2.5 shadow-sm sm:p-3.5">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs font-bold text-cyan-300 sm:text-sm">{msg.username}</p>
                  <p className="text-[9px] font-medium text-slate-500 sm:text-[10px]">{getTimeAgo(msg.timestamp)}</p>
                </div>
                <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">{msg.message}</p>
                <div className="mt-1.5 sm:mt-2 flex gap-3">
                  <button className="flex items-center gap-1 text-[9px] font-medium text-slate-500 transition hover:text-cyan-400 sm:text-[10px]">
                    <span className="text-xs sm:text-sm">👍</span> 0
                  </button>
                  <button className="flex items-center gap-1 text-[9px] font-medium text-slate-500 transition hover:text-amber-400 sm:text-[10px]">
                    <span className="text-xs sm:text-sm">🔥</span> 0
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-700 p-3 pt-2 sm:p-4">
        <form onSubmit={sendMessage} className="relative">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-2.5 pr-20 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:bg-slate-800 focus:shadow-md sm:px-5 sm:py-3.5 sm:pr-24 sm:text-sm"
          />
          <div className="absolute right-1 sm:right-1.5 top-1 sm:top-1.5 flex items-center gap-0.5 sm:gap-1" ref={dropdownRef}>
            {showEmojiPicker && (
              <EmojiPicker 
                onEmojiSelect={addEmoji} 
                onClose={() => setShowEmojiPicker(false)} 
              />
            )}
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`hidden p-1.5 transition sm:block sm:p-2 ${showEmojiPicker ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button
              type="submit"
              className="flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 p-1.5 text-slate-950 shadow-md transition hover:from-cyan-400 hover:to-indigo-400 active:scale-95 sm:p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 -rotate-45" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </form>
        {error && <p className="mt-1.5 text-center text-[10px] text-red-400 sm:mt-2 sm:text-xs">{error}</p>}
        <p className="mt-2 text-center text-[9px] text-slate-500 sm:mt-3 sm:text-[10px]">Be respectful. No hate speech.</p>
      </div>
    </div>
  );
}

export default ChatPanel;
