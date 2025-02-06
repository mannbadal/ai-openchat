import { useState } from "react";
import { auth } from "../../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css"; // added styling

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const signIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const signInWithProvider = async (providerName) => {
    let provider;
    if (providerName === "google") {
      provider = new GoogleAuthProvider();
    } else if (providerName === "github") {
      provider = new GithubAuthProvider();
    }
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign In</h2>
      {error && <p className="error-text">{error}</p>}
      <form onSubmit={signIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="signin-button" type="submit">
          Sign In
        </button>
      </form>
      {/* Provider login buttons with Font Awesome icons */}
      <div className="provider-buttons">
        <button
          onClick={() => signInWithProvider("google")}
          className="provider-button"
        >
          <i className="fab fa-brands fa-google provider-icon"></i>
        </button>
        <button
          onClick={() => signInWithProvider("github")}
          className="provider-button"
        >
          <i className="fab fa-brands fa-github provider-icon"></i>
        </button>
      </div>
      <div className="auth-links">
        <Link to="/signup">Sign Up</Link> |{" "}
        <Link to="/reset">Reset Password</Link>
      </div>
    </div>
  );
};

export default SignIn;
