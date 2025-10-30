import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div className="text-center mt-20">
    <h1 className="text-4xl font-bold text-red-500 mb-4">404</h1>
    <p className="text-gray-700 mb-4">Page Not Found</p>
    <Link to="/" className="text-blue-600 underline">Go Home</Link>
  </div>
);

export default NotFound;
