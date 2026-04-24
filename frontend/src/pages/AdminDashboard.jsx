import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { incidentsAPI, adminAPI } from '../api';
import { formatDateTime, getStatusColor, getPriorityColor, capitalize, formatRelativeTime } from '../utils';
import { 
  BarChart3, Users, AlertTriangle, CheckCircle, 
  Clock, RefreshCw, Filter, Download, 
  Trash2, UserPlus, UserMinus, Shield, 
  UserCheck, ShieldCheck, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import socketService from '../socket';

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    loadData();
    
    // Listen for new incidents and updates
    const handleNewIncident = (incident) => {
      setIncidents(prev => [incident, ...prev]);
      updateStats([incident, ...incidents]);
      toast.success(`New incident reported: ${incident.title}`);
    };

    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => {
        const updated = prev.map(incident => 
          incident._id === updatedIncident._id ? updatedIncident : incident
        );
        updateStats(updated);
        return updated;
      });
    };

    socketService.onNewIncident(handleNewIncident);
    socketService.onIncidentStatusUpdate(handleIncidentUpdate);

    return () => {
      socketService.off('incident:new', handleNewIncident);
      socketService.off('incident:statusUpdate', handleIncidentUpdate);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadIncidents(), loadUsers()]);
    setIsLoading(false);
  };

  const loadIncidents = async () => {
    try {
      const response = await incidentsAPI.getAll();
      const incidentList = response.incidents || [];
      setIncidents(incidentList);
      updateStats(incidentList);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setIsUsersLoading(true);
      const response = await adminAPI.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const updateStats = (incidentList) => {
    const stats = {
      total: incidentList.length,
      open: incidentList.filter(i => i.status === 'open').length,
      inProgress: incidentList.filter(i => i.status === 'in_progress').length,
      resolved: incidentList.filter(i => i.status === 'resolved').length,
      critical: incidentList.filter(i => i.priority === 'critical').length,
    };

    const resolvedWithResponseTime = incidentList.filter(i => 
      i.status === 'resolved' && i.responseTimeMinutes
    );
    
    if (resolvedWithResponseTime.length > 0) {
      stats.avgResponseTime = Math.round(
        resolvedWithResponseTime.reduce((sum, i) => sum + i.responseTimeMinutes, 0) / 
        resolvedWithResponseTime.length
      );
    }

    setStats(stats);
  };

  const handleStatusUpdate = async (incidentId, newStatus) => {
    try {
      await incidentsAPI.updateStatus(incidentId, newStatus);
      toast.success('Incident status updated successfully');
      loadIncidents();
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Are you sure you want to delete this incident? This action cannot be undone.')) return;
    try {
      await incidentsAPI.deleteIncident(incidentId);
      toast.success('Incident deleted successfully');
      setIncidents(prev => prev.filter(i => i._id !== incidentId));
    } catch (error) {
      console.error('Failed to delete incident:', error);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await adminAPI.toggleUserStatus(userId);
      toast.success(response.message);
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? All their data will be permanently removed.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filter === 'all') return true;
    return incident.status === filter;
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const exportData = () => {
    const data = activeTab === 'incidents' ? incidents : users;
    const filename = activeTab === 'incidents' ? 'incidents' : 'users';
    
    const csvContent = activeTab === 'incidents' 
      ? incidents.map(i => `${i._id},${i.title},${i.status},${i.priority},${i.createdAt}`).join('\n')
      : users.map(u => `${u._id},${u.name},${u.email},${u.role},${u.isActive}`).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Platform-wide management and oversight
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportData} className="btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button onClick={loadData} className="btn-primary flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'incidents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Incidents
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'incidents' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="card bg-white p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="card bg-white p-4 text-orange-600 border-l-4 border-orange-500">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 text-gray-600">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
              </div>
            </div>
            <div className="card bg-white p-4 text-blue-600 border-l-4 border-blue-500">
              <div className="flex items-center">
                <Clock className="w-8 h-8" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
              </div>
            </div>
            <div className="card bg-white p-4 text-green-600 border-l-4 border-green-500">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 text-gray-600">Fixed</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
              </div>
            </div>
            <div className="card bg-white p-4 text-red-600 border-l-4 border-red-500">
              <div className="flex items-center">
                <Shield className="w-8 h-8" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 text-gray-600">Critical</p>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                </div>
              </div>
            </div>
            <div className="card bg-white p-4 text-purple-600">
              <div className="flex items-center">
                <Clock className="w-8 h-8" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 text-gray-600">Avg Res</p>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card flex flex-wrap items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex space-x-2">
              {['all', 'open', 'in_progress', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                    filter === s 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {capitalize(s.replace('_', ' '))}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIncidents.map((i) => (
                    <tr key={i._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{i.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{i.address}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(i.priority)}`}>
                          {capitalize(i.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(i.status)}`}>
                          {capitalize(i.status.replace('_', ' '))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(i.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          {i.status === 'open' && (
                            <button onClick={() => handleStatusUpdate(i._id, 'in_progress')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Assign">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteIncident(i._id)} className="p-1.5 text-danger-600 hover:bg-danger-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* User Search */}
          <div className="card flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              className="flex-1 border-none focus:ring-0 text-sm"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUserRoleChange(u._id, e.target.value)}
                          className="text-xs border-gray-300 rounded focus:ring-primary-500 py-1"
                        >
                          <option value="user">User</option>
                          <option value="volunteer">Volunteer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-3">
                          <button 
                            onClick={() => handleToggleUserStatus(u._id)}
                            className={`p-1.5 rounded ${u.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {u.isActive ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u._id)}
                            className="p-1.5 text-danger-600 hover:bg-danger-50 rounded"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-gray-500">No users found.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;