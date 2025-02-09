import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import { firestore, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
} from "firebase/firestore";
import OpenAI from "openai";

const getEnvVar = (key) => {
  if (window.env && window.env[key]) {
    return window.env[key];
  }
  return import.meta.env[key];
};

const openai = new OpenAI({
  apiKey: getEnvVar("VITE_OPENAI_API_KEY"),
  dangerouslyAllowBrowser: true,
});

const generateAssistantReply = async (
  conversation,
  onDelta,
  chatId = null,
  model = "gpt-4o-mini"
) => {
  const response = await openai.chat.completions.create({
    model,
    messages: conversation,
    stream: true,
  });

  let assistantContent = "";
  try {
    for await (const chunk of response) {
      const parsedDelta = chunk.choices[0].delta?.content || "";
      assistantContent += parsedDelta;
      onDelta(assistantContent);
      if (chatId) {
        updateDoc(
          doc(firestore, "users", auth.currentUser.uid, "chats", chatId),
          { updatedAt: new Date() }
        ).catch((err) => console.error("Error updating updatedAt:", err));
      }
    }
  } catch (error) {
    console.error("Error processing streaming response:", error);
  }
  return assistantContent;
};

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const messageEndRef = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!auth.currentUser || !initialLoad.current) return;
    initialLoad.current = false;
    const loadLastConversation = async () => {
      const uid = auth.currentUser.uid;
      const q = query(
        collection(firestore, "users", uid, "chats"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const lastChat = querySnapshot.docs[0];
        loadConversation(lastChat.id);
      }
    };
    loadLastConversation();
  }, []);

  const loadConversation = async (chatId) => {
    if (chatId === null) {
      setMessages([]);
      setCurrentChatId(null);
      return;
    }
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(firestore, "users", uid, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    const loadedMessages = querySnapshot.docs.map((doc) => doc.data());
    setMessages(loadedMessages);
    setCurrentChatId(chatId);
    if (window.innerWidth <= 800) {
      setShowSidebar(false);
    }
  };

  const storeMessage = async (chatId, msg) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await addDoc(
      collection(firestore, "users", uid, "chats", chatId, "messages"),
      {
        ...msg,
        timestamp: new Date(),
      }
    );
  };

  const storeConversation = async (finalMessages, model = "gpt-4o-mini") => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const conversationText = finalMessages
      .map((m) => m.content)
      .join("\n")
      .replace(/^"|"$/g, "");

    const title = await (async () => {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Give a short title for this conversation, only the title without any other text.",
            },
            { role: "user", content: conversationText },
          ],
        });
        return response.choices[0].message.content.trim().replace(/^"|"$/g, "");
      } catch (error) {
        console.error("Error generating title:", error);
        return "Untitled Conversation";
      }
    })();
    try {
      const chatDoc = await addDoc(
        collection(firestore, "users", uid, "chats"),
        {
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
      for (const msg of finalMessages) {
        await addDoc(
          collection(firestore, "users", uid, "chats", chatDoc.id, "messages"),
          {
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          }
        );
      }
      return chatDoc.id;
    } catch (error) {
      console.error("Error storing conversation:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setShowSidebar(false);
    const prevCount = messages.length;
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);
    try {
      const assistantContent = await generateAssistantReply(
        newMessages,
        (updatedContent) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = updatedContent;
            return updated;
          });
        },
        currentChatId,
        selectedModel
      );
      setIsStreaming(false);
      const finalMessages = [
        ...newMessages,
        { role: "assistant", content: assistantContent },
      ];
      const newMsgsToStore = finalMessages.slice(prevCount);
      if (currentChatId === null) {
        const newChatId = await storeConversation(finalMessages, selectedModel);
        setCurrentChatId(newChatId);
      } else {
        for (const msg of newMsgsToStore) {
          await storeMessage(currentChatId, msg);
        }
      }
      setMessages(finalMessages);
    } catch (error) {
      console.error("Error fetching streaming response:", error);
      setIsStreaming(false);
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1].content =
          "Error: " + error.message;
        return updatedMessages;
      });
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const conversation = messages.slice(0, -1);
    setMessages(conversation);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);
    try {
      const assistantContent = await generateAssistantReply(
        conversation,
        (updatedContent) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = updatedContent;
            return updated;
          });
        },
        currentChatId,
        selectedModel
      );
      setIsStreaming(false);
      const updatedMessages = [
        ...conversation,
        { role: "assistant", content: assistantContent },
      ];
      setMessages(updatedMessages);
      if (currentChatId !== null) {
        await storeMessage(currentChatId, {
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (error) {
      console.error("Error regenerating reply:", error);
      setIsStreaming(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentChatId(null);
    setShowSidebar(false);
  };

  const handleBackdropClick = () => {
    setShowSidebar(false);
  };

  return (
    <div className="ai-openchat">
      <div className="chat-header">
        <button
          className="sidebar-toggle"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <i className="fa fa-bars"></i>
        </button>
        <h1>
          <span className="header-title">OpenChat</span> 💬
        </h1>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4o-mini">Default (gpt-4o-mini)</option>
          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          <option value="gpt-4">gpt-4</option>
        </select>
        <button onClick={startNewConversation} className="new-convo-btn">
          <i className="fa-regular fa-pen-to-square new-convo-icon"></i>
        </button>
      </div>
      <div className="chat-body">
        {showSidebar && (
          <>
            <div className="sidebar-backdrop" onClick={handleBackdropClick} />
            <Sidebar
              onSelect={loadConversation}
              selectedChatId={currentChatId} // added selectedChatId prop
              className={showSidebar ? "open" : ""}
            />
          </>
        )}
        <div
          className="chat-container"
          onClick={() => {
            if (window.innerWidth <= 800) {
              setShowSidebar(false);
            }
          }}
        >
          {messages.map((message, idx) => (
            <ChatMessage key={idx} message={message} />
          ))}
          <div ref={messageEndRef} />
          {!isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" && (
              <div className="assistant-actions">
                <button
                  onClick={handleRegenerate}
                  className="regenerate-btn"
                  title="Regenerate reply"
                >
                  <i className="fa fa-redo"></i>
                </button>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      messages[messages.length - 1].content
                    )
                  }
                  className="copy-reply-btn"
                  title="Copy reply"
                >
                  <i className="fa fa-copy"></i>
                </button>
              </div>
            )}
        </div>
      </div>
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <div className="textarea-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type your message here..."
            disabled={isStreaming}
          />
        </div>
        <button
          className="send-button"
          type="submit"
          disabled={isStreaming || input.trim() === ""}
        >
          {isStreaming ? "Generating..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatApp;
