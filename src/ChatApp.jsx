/* eslint-disable react/prop-types */
// src/ChatApp.jsx
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types"; // for prop validation
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Sidebar from "./components/Sidebar";
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
import Markdown from "markdown-to-jsx";

// Import the new OpenAI SDK (v4)
import OpenAI from "openai";

// Initialize the client with your API key
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/* Helper component for code blocks with copy icon */
const CodeBlock = ({ inline, className, children, ...props }) => {
  const codeRef = useRef(null);
  const handleCopy = () => {
    const codeText = codeRef.current.innerText;
    navigator.clipboard.writeText(codeText);
  };

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

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
        <Markdown
          options={{
            overrides: {
              li: {
                component: ({ children, ...props }) => (
                  <li style={{ marginLeft: "1rem" }} {...props}>
                    {children}
                  </li>
                ),
              },
              code: {
                component: CodeBlock,
              },
            },
          }}
        >
          {message.content}
        </Markdown>
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

// Generate assistant reply using streaming via the new SDK
const generateAssistantReply = async (conversation, onDelta, chatId = null) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: conversation,
    stream: true,
  });

  let assistantContent = "";
  try {
    // Iterate directly over the async iterable returned by the streaming endpoint
    for await (const chunk of response) {
      const parsedDelta = chunk.choices[0].delta?.content || "";
      assistantContent += parsedDelta;
      onDelta(assistantContent);
      // Update Firestore if chatId is provided
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
  const messageEndRef = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load the last conversation on mount (if it exists)
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

  // Load a conversation by chatId from Firestore
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
      setShowSidebar(false);
    }
  };

  // Store a single message in an existing conversation
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

  // Store the conversation and generate a title using the new OpenAI SDK
  const storeConversation = async (finalMessages) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const conversationText = finalMessages
      .map((m) => m.content)
      .join("\n")
      .replace(/^"|"$/g, "");

    const title = await (async () => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
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
    setShowSidebar(false);
    const prevCount = messages.length;
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    // Append a placeholder for the assistant’s reply
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);
    try {
      // Update the assistant’s message as new content arrives
      const assistantContent = await generateAssistantReply(
        newMessages,
        (updatedContent) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = updatedContent;
            return updated;
          });
        },
        currentChatId
      );
      setIsStreaming(false);
      const finalMessages = [
        ...newMessages,
        { role: "assistant", content: assistantContent },
      ];
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

  // Retry the last assistant reply
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
        currentChatId
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

  // Start a new conversation
  const startNewConversation = () => {
    setMessages([]);
    setCurrentChatId(null);
    setShowSidebar(false);
  };

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
          <i className="fa fa-bars"></i>
        </button>
        <h1>OpenChat 💬</h1>
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
