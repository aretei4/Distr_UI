import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="bg-blue-600 text-white p-4 flex gap-4">
      <Link to="/" className={pathname === '/' ? 'font-bold underline' : ''}>Home</Link>
      <Link to="/about" className={pathname === '/about' ? 'font-bold underline' : ''}>About</Link>
	  <Link to="/upload" className={pathname === '/upload' ? 'font-bold underline' : ''}>Upload</Link>
	    <Link to="/sales" className={pathname === '/sales' ? 'font-bold underline' : ''}>Sales Data</Link>
    </nav>
  );
};

export default Navbar;
