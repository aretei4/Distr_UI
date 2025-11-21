import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";

const MainLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between">
        <nav className="space-x-4">
          <Link to="/sales">Sales</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/agents">Agent List</Link>
		  <Link to="/delivery">Delivery Status</Link>
        </nav>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 p-4 bg-gray-50">
        <Outlet /> {/* Renders the active page */}
      </main>
    </div>
  );
};

export default MainLayout;
