// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // updated to import App
import "./App.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App /> {/* updated to render App */}
  </React.StrictMode>
);
