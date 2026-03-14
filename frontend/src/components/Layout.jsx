import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, MapPin, Users, AlertTriangle, Settings, Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardHref = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin';
      case 'volunteer':
        return '/volunteer';
      case 'user':
      default:
        return '/dashboard';
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: getDashboardHref(),
      icon: AlertTriangle,
      roles: ['user', 'volunteer', 'admin']
    },
    {
      name: 'Incidents',
      href: '/incidents',
      icon: Bell,
      roles: ['volunteer', 'admin']
    },
    {
      name: 'Volunteers',
      href: '/volunteers',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['user', 'volunteer', 'admin']
    }
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary-600">
                  NeighboursCare
                </h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigation
                  .filter(item => item.roles.includes(user?.role))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => console.log(`Navigating to: ${item.name} - ${item.href}`)}
                        className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                          isActive 
                            ? 'text-primary-600 border-b-2 border-primary-600' 
                            : 'text-gray-900 hover:text-primary-600'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Link>
                    );
                  })}
              </div>
            </div>
            
            {/* Desktop user info and logout */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <span>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 hover:text-primary-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {navigation
                .filter(item => item.roles.includes(user?.role))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'text-primary-600 bg-primary-50' 
                          : 'text-gray-900 hover:text-primary-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              
              {/* Mobile user info and logout */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-3 py-2 text-xs text-gray-500">
                  <div className="flex items-center mb-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="capitalize">{user?.role}</span>
                  </div>
                  <div>{user?.name}</div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-primary-600 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;