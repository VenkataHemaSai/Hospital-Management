import { useEffect, useState, useRef } from "react";
import { chatAPI } from "../api/index.js";
import { useAuthStore } from "../store/authStore.js";
import toast from "react-hot-toast";
import { Send, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import { io } from "socket.io-client";

let socket = null;

export default function ChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef();
  const typingTimeout = useRef();

  // Initialize socket
  useEffect(() => {
    socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      withCredentials: true,
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user_typing", () => setIsTyping(true));
    socket.on("user_stopped_typing", () => setIsTyping(false));

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    chatAPI.getConversations().then((res) => {
      setConversations(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const openConversation = async (conv) => {
    setActive(conv);
    socket?.emit("join_conversation", conv._id);
    const res = await chatAPI.getMessages(conv._id);
    setMessages(res.data.data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      const res = await chatAPI.sendMessage(active._id, { content: text });
      const msg = res.data.data;
      setMessages((prev) => [...prev, msg]);
      socket?.emit("send_message", { conversationId: active._id, message: msg });
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit("typing_start", { conversationId: active?._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit("typing_stop", { conversationId: active?._id });
    }, 1500);
  };

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== user?._id);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Messages</h1>
        <p>Communicate securely with your care team</p>
      </div>

      <div className="chat-layout">
        {/* Sidebar: Conversations */}
        <div className="chat-sidebar card" style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "1rem", position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="input" placeholder="Search conversations..." style={{ paddingLeft: "2.25rem" }} />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : conversations.length === 0 ? (
            <div className="empty-state"><MessageSquare size={36} /><p>No conversations</p></div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isActive = active?._id === conv._id;
              const unread = conv.unreadCounts?.get ? conv.unreadCounts.get(user?._id) : conv.unreadCounts?.[user?._id];
              return (
                <button
                  key={conv._id}
                  className={`conv-item ${isActive ? "active" : ""}`}
                  onClick={() => openConversation(conv)}
                >
                  <div className="avatar" style={{ width: 40, height: 40, flexShrink: 0 }}>
                    {other?.firstName?.[0]}{other?.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {other?.role === "doctor" ? "Dr. " : ""}{other?.firstName} {other?.lastName}
                    </p>
                    <p className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span style={{ background: "var(--accent-primary)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Chat Window */}
        {active ? (
          <div className="chat-window card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div className="chat-header">
              <div className="avatar" style={{ width: 38, height: 38 }}>
                {getOtherParticipant(active)?.firstName?.[0]}{getOtherParticipant(active)?.lastName?.[0]}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {getOtherParticipant(active)?.role === "doctor" ? "Dr. " : ""}
                  {getOtherParticipant(active)?.firstName} {getOtherParticipant(active)?.lastName}
                </p>
                {isTyping && <p className="text-xs" style={{ color: "var(--accent-primary)" }}>typing...</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="messages-body">
              {messages.map((msg) => {
                const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                return (
                  <div key={msg._id} className={`message-wrapper ${isMine ? "mine" : "theirs"}`}>
                    <div className={`message-bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
                      <p>{msg.content}</p>
                      <p className="text-xs" style={{ marginTop: "0.2rem", opacity: 0.6 }}>
                        {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input
                className="input"
                placeholder="Type a message..."
                value={text}
                onChange={handleTyping}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", color: "var(--text-muted)" }}>
            <MessageSquare size={48} />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
