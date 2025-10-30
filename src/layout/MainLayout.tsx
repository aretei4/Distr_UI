import React from 'react';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
      <footer className="text-center p-4 bg-gray-200 text-sm">
        © {new Date().getFullYear()} My React App
      </footer>
    </div>
  );
};

export default MainLayout;
