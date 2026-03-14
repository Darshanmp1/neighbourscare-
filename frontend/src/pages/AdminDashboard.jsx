import React, { useState, useEffect } from 'react';
import { incidentsAPI } from '../api';
import { formatDateTime, getStatusColor, getPriorityColor, capitalize, formatRelativeTime } from '../utils';
import { BarChart3, Users, AlertTriangle, CheckCircle, Clock, RefreshCw, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import socketService from '../socket';

const AdminDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    loadIncidents();
    
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

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const response = await incidentsAPI.getAll();
      const incidentList = response.incidents || [];
      setIncidents(incidentList);
      updateStats(incidentList);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setIsLoading(false);
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

    // Calculate average response time for resolved incidents
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
      toast.error('Failed to update incident status');
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filter === 'all') return true;
    return incident.status === filter;
  });

  const exportData = () => {
    const csvData = incidents.map(incident => ({
      ID: incident._id,
      Title: incident.title,
      Description: incident.description,
      Status: incident.status,
      Priority: incident.priority,
      'Created At': formatDateTime(incident.createdAt),
      'Response Time (min)': incident.responseTimeMinutes || 'N/A',
      'Resolution Time (min)': incident.resolutionTimeMinutes || 'N/A',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and manage all incidents</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportData} className="btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
          <button onClick={loadIncidents} className="btn-primary flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-danger-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open</p>
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-success-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical</p>
              <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <div className="flex space-x-2">
            {['all', 'open', 'in_progress', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  filter === status
                    ? 'bg-primary-100 border-primary-300 text-primary-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : capitalize(status.replace('_', ' '))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Incidents ({filteredIncidents.length})
        </h2>
        
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No incidents match the current filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.map((incident) => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {incident.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {incident.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(incident.priority)}`}>
                        {capitalize(incident.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(incident.status)}`}>
                        {capitalize(incident.status.replace('_', ' '))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(incident.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incident.responseTimeMinutes ? `${incident.responseTimeMinutes}m` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {incident.status === 'open' && (
                          <button
                            onClick={() => handleStatusUpdate(incident._id, 'in_progress')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Assign
                          </button>
                        )}
                        {incident.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(incident._id, 'resolved')}
                            className="text-success-600 hover:text-success-900"
                          >
                            Resolve
                          </button>
                        )}
                        {incident.status !== 'open' && (
                          <button
                            onClick={() => handleStatusUpdate(incident._id, 'open')}
                            className="text-danger-600 hover:text-danger-900"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;