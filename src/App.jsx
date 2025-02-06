import { useEffect, useState } from "react";
import PropTypes from "prop-types"; // added for prop validation
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatApp from "./ChatApp";
import SignIn from "./components/Auth/SignIn";
import SignUp from "./components/Auth/SignUp";
import ResetPassword from "./components/Auth/ResetPassword";
import { auth } from "./firebase";

// Updated ProtectedRoute with logging and error callback
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      (u) => {
        console.log("Auth state changed, user:", u);
        setUser(u);
        setLoading(false);
      },
      (error) => {
        console.error("Auth state error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;
  return user ? children : <Navigate to="/signin" />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          }
        />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
