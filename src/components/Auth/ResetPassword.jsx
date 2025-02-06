import { useState } from "react";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import "./Auth.css"; // added styling

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const resetPassword = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent!");
      setError(null);
    } catch (err) {
      setError(err.message);
      setMessage(null);
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      <form onSubmit={resetPassword}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Email</button>
      </form>
      <div className="auth-links">
        <Link to="/signin">Sign In</Link>
      </div>
    </div>
  );
};

export default ResetPassword;
