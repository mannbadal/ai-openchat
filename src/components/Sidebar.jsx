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

const Sidebar = ({ onSelect, className }) => {
  // new prop
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(firestore, "users", uid, "chats"),
      orderBy("createdAt", "desc")
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
      <ul>
        {chats.map((chat) => (
          <li key={chat.id}>
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
  className: PropTypes.string,
};

export default Sidebar;
