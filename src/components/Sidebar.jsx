import { useEffect, useState } from "react";
import { auth, firestore } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import PropTypes from "prop-types";
import { signOut } from "firebase/auth";

const Sidebar = ({ onSelect, selectedChatId, className }) => {
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(firestore, "users", uid, "chats"),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(fetchedChats);
    });
    return () => unsubscribe();
  }, []);

  const currentUser = auth.currentUser;
  let providerIconClass = "";
  if (
    currentUser &&
    currentUser.providerData &&
    currentUser.providerData.length
  ) {
    const provider = currentUser.providerData.find(
      (p) => p.providerId === "google.com" || p.providerId === "github.com"
    );
    if (provider) {
      providerIconClass =
        provider.providerId === "google.com" ? "fa-google" : "fa-github";
    }
  }

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteChat = async (chatId) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const messagesQuery = await getDocs(
      collection(firestore, "users", uid, "chats", chatId, "messages")
    );
    for (const messageDoc of messagesQuery.docs) {
      await deleteDoc(messageDoc.ref);
    }
    await deleteDoc(doc(firestore, "users", uid, "chats", chatId));
    if (chatId === selectedChatId) {
      onSelect(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div
      className={`sidebar ${className || ""}`}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <h2>Past Conversations</h2>
      <input
        type="text"
        placeholder="Search conversations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          marginBottom: "1rem",
          padding: "0.5rem",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <ul>
          {filteredChats.map((chat) => (
            <li key={chat.id} className="chat-item">
              <span onClick={() => onSelect && onSelect(chat.id)}>
                {chat.title}
              </span>
              <button
                className="delete-chat-btn"
                onClick={() => handleDeleteChat(chat.id)}
              >
                <i className="fa fa-trash"></i>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {currentUser && (
        <div className="user-info" style={{ marginTop: "1rem" }}>
          {providerIconClass && (
            <i
              className={`fa-brands provider-icon fa ${providerIconClass}`}
              style={{ marginRight: "0.1rem" }}
            ></i>
          )}
          <span>{currentUser.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fa fa-sign-out-alt"></i>
          </button>
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selectedChatId: PropTypes.string,
  className: PropTypes.string,
};

export default Sidebar;
