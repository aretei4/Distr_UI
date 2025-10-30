import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Loader from "./components/Loader";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Upload = lazy(() => import("./pages/Upload"));  // 👈 new
const NotFound = lazy(() => import("./pages/NotFound"));
const SalesTable = lazy(() => import("./pages/SalesTable"));
const SalesDetail = lazy(() => import("./pages/SalesDetail"));

const App: React.FC = () => {
  return (
    <MainLayout>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/upload" element={<Upload />} /> {/* 👈 added */}
		   <Route path="/sales" element={<SalesTable />} />
		   <Route path="/sales/:picklistNo" element={<SalesDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default App;
