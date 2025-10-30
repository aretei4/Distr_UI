import React from 'react';

const Loader: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <p className="animate-pulse text-gray-500">Loading...</p>
  </div>
);

export default Loader;
