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
    // Changed: use "updatedAt" for ordering
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

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteChat = async (chatId) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Delete all messages in the subcollection
    const messagesQuery = await getDocs(
      collection(firestore, "users", uid, "chats", chatId, "messages")
    );
    for (const messageDoc of messagesQuery.docs) {
      await deleteDoc(messageDoc.ref);
    }

    // Then delete the chat document
    await deleteDoc(doc(firestore, "users", uid, "chats", chatId));

    // If the currently selected chat was deleted, display new conversation window.
    if (chatId === selectedChatId) {
      onSelect(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ...any additional logic on logout...
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={`sidebar ${className || ""}`}>
      <h2>Past Conversations</h2>
      {/* Styled search bar */}
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
      <button className="logout-btn" onClick={handleLogout}>
        <i className="fa fa-sign-out-alt"></i> Logout
      </button>
    </div>
  );
};

Sidebar.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selectedChatId: PropTypes.string, // new prop for tracking current chat
  className: PropTypes.string,
};

export default Sidebar;
