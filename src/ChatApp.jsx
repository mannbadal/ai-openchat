/* eslint-disable react/prop-types */
// src/ChatApp.js
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types"; // added for prop validation
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Sidebar from "./components/Sidebar"; // updated
import { firestore, auth } from "./firebase"; // updated
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore"; // new

/* Add helper component for code blocks with copy icon */
const CodeBlock = ({ inline, className, children, ...props }) => {
  const codeRef = useRef(null);
  const handleCopy = () => {
    const codeText = codeRef.current.innerText;
    navigator.clipboard.writeText(codeText);
  };

  // Try to extract a language from the className, default to "text" if not found
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  // For non-inline code blocks, always use the SyntaxHighlighter
  if (!inline) {
    return (
      <div className="code-block-container">
        <button className="copy-btn" onClick={handleCopy}>
          <i className="fa fa-copy"></i>
        </button>
        <SyntaxHighlighter
          language={language}
          style={docco}
          PreTag="div"
          {...props}
          ref={codeRef}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    );
  }

  // For inline code, just return a plain <code> element.
  return (
    <code ref={codeRef} className={className} {...props}>
      {children}
    </code>
  );
};

const ChatMessage = ({ message }) => {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: CodeBlock,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
};

// NEW: Extract streaming logic into a helper
// Modified generateAssistantReply to stream deltas via onDelta callback
const generateAssistantReply = async (conversation, onDelta) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: conversation,
      stream: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Network error: ${response.statusText}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let assistantContent = "";
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") {
            done = true;
            break;
          }
          try {
            const dataObj = JSON.parse(dataStr);
            const delta = dataObj.choices[0].delta.content;
            if (delta) {
              assistantContent += delta;
              if (onDelta) onDelta(assistantContent);
            }
          } catch (error) {
            console.error("Error parsing stream data:", error);
          }
        }
      }
    }
  }
  return assistantContent;
};

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null); // new
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // New: load a conversation from Firestore by chatId
  const loadConversation = async (chatId) => {
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
      // close sidebar on mobile only
      setShowSidebar(false);
    }
  };

  // New helper: store a single message in an existing conversation
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

  // Modify storeConversation to return the new chat id
  const storeConversation = async (finalMessages) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const conversationText = finalMessages.map((m) => m.content).join("\n");
    const title = await (async () => {
      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "Give a short title for this conversation.",
                },
                { role: "user", content: conversationText },
              ],
            }),
          }
        );
        const data = await response.json();
        return data.choices[0].message.content.trim();
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
        }
      );
      // Store each message in the "messages" subcollection.
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
    // Close sidebar on message send
    setShowSidebar(false);
    const prevCount = messages.length;
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    // Append placeholder for assistant’s reply
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);
    try {
      // Pass onDelta callback to update the last assistant message as new content arrives
      const assistantContent = await generateAssistantReply(
        newMessages,
        (updatedContent) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = updatedContent;
            return updated;
          });
        }
      );
      setIsStreaming(false);
      const finalMessages = [
        ...newMessages,
        { role: "assistant", content: assistantContent },
      ];
      // Storage logic remains unchanged
      const newMsgsToStore = finalMessages.slice(prevCount);
      if (currentChatId === null) {
        const newChatId = await storeConversation(finalMessages);
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

  // NEW: Add handleRegenerate to retry the last assistant reply
  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    // Remove last assistant reply
    const conversation = messages.slice(0, -1);
    setMessages(conversation);
    // Append placeholder for assistant’s reply
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
        }
      );
      setIsStreaming(false);
      const updatedMessages = [
        ...conversation,
        { role: "assistant", content: assistantContent },
      ];
      setMessages(updatedMessages);
      // For existing conversations, update storage
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

  // New: start a new conversation
  const startNewConversation = () => {
    setMessages([]);
    setCurrentChatId(null);
    // Close sidebar on new conversation
    setShowSidebar(false);
  };

  // Click outside sidebar (only for mobile) to close it
  const handleBackdropClick = () => {
    setShowSidebar(false);
  };

  return (
    <div className="chat-app">
      <div className="chat-header">
        <button
          className="sidebar-toggle"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          ☰
        </button>
        <h1>OpenChat</h1>
        <button onClick={startNewConversation} className="new-convo-btn">
          New Conversation
        </button>
      </div>
      <div className="chat-body">
        {/* Revert to rendering a single Sidebar component */}
        {showSidebar && (
          <>
            <div className="sidebar-backdrop" onClick={handleBackdropClick} />
            <Sidebar
              onSelect={loadConversation}
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
          {/* NEW: Assistant response actions for last reply */}
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
