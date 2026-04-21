import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "./components/Loader";
import MainLayout from "./layout/MainLayout";

const Login = lazy(() => import("./pages/LoginPage"));
const Home = lazy(() => import("./pages/Home"));
const Upload = lazy(() => import("./pages/Upload"));
const Template = lazy(() => import("./pages/TemplateMappingPage"));
const SalesTable = lazy(() => import("./pages/SalesTable"));
const SalesDetail = lazy(() => import("./pages/SalesDetail"));
const DeliveryAgents = lazy(() => import("./pages/DeliveryAgents"));
const DeliveryTable = lazy(() => import("./pages/DeliveryTable"));
const DeliveryList = lazy(() => import("./pages/DeliveryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DeliveryDetails = lazy(() => import("./pages/DeliveryDetails"));
const CustomerList = lazy(() => import("./pages/CustomerList"));
const DayEnd = lazy(() => import("./pages/DayEnd"));

const App: React.FC = () => {
  // Simple login flag (replace with real auth later)
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Protected routes (with layout) */}
        {isLoggedIn ? (
          <Route element={<MainLayout />}>
		   <Route path="/dayEnd" element={<DayEnd />} />
            <Route path="/upload" element={<Upload />} />
			<Route path="/template" element={<Template />} />
            <Route path="/sales" element={<SalesTable />} />
            <Route path="/sales/:picklistNo" element={<SalesDetail />} />
			<Route path="/agents" element={<DeliveryAgents />} />
			<Route path="/agents/:agentId" element={<DeliveryTable />} /> {/* ✅ updated */}
			<Route path="/customer" element={<CustomerList />} />
			
			<Route path="/delivery" element={<DeliveryList />} />
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/details/:status" element={<DeliveryDetails />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        ) : (
          // If not logged in, redirect everything to login
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </Suspense>
  );
};

export default App;
