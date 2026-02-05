import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import LiveMonitoring from './pages/LiveMonitoring';
import Detections from './pages/Detections';
import CameraDetail from './pages/CameraDetail';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/cameras/:id" element={<CameraDetail />} />
          <Route path="/monitoring" element={<LiveMonitoring />} />
          <Route path="/detections" element={<Detections />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

