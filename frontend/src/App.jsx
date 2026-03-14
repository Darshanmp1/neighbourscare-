import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';

// Main App Router
const AppRouter = () => {
  const { isAuthenticated, user } = useAuth();

  // If authenticated, redirect to appropriate dashboard
  const getDashboardRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'volunteer':
        return '/volunteer';
      case 'user':
      default:
        return '/dashboard';
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to={getDashboardRoute()} /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to={getDashboardRoute()} /> : <Register />} 
        />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['user']}>
            <Layout>
              <UserDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/volunteer" element={
          <ProtectedRoute roles={['volunteer']}>
            <Layout>
              <VolunteerDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute roles={['user', 'volunteer', 'admin']}>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Default redirect */}
        <Route path="/" element={
          isAuthenticated ? 
            <Navigate to={getDashboardRoute()} /> : 
            <Navigate to="/login" />
        } />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={
          isAuthenticated ? 
            <Navigate to={getDashboardRoute()} /> : 
            <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ff6b6b',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
