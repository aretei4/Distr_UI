import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      localStorage.setItem("loggedIn", "true");
      navigate("/dashboard");
    } else {
      alert("Please enter both fields");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-96"
        autoComplete="off"   // 🚫 disables browser autofill
      >
        <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">
          Demo Login
        </h2>

        <div className="mb-4">
          <label className="block text-gray-600 text-sm mb-1">Username</label>
          <input
            type="text"
            name="fake-username"   // 👈 fake name so Chrome won’t treat it as login
            placeholder="Enter any username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoComplete="new-username"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-600 text-sm mb-1">Password</label>
          <input
            type="password"
            name="fake-password"  // 👈 not “password” to bypass Google Password Manager
            placeholder="Enter any password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
