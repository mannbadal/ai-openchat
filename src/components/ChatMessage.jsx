import PropTypes from "prop-types";
import Markdown from "markdown-to-jsx";
import CodeBlock from "./CodeBlock";

const ChatMessage = ({ message }) => (
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
            code: { component: CodeBlock },
          },
        }}
      >
        {message.content}
      </Markdown>
    </div>
  </div>
);

ChatMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
};

export default ChatMessage;
