import { useRef } from "react";
import PropTypes from "prop-types";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

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

CodeBlock.propTypes = {
  inline: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default CodeBlock;
