import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { incidentsAPI } from '../api';
import { formatDateTime, getStatusColor, getPriorityColor, capitalize, formatDistance, calculateDistance, getCurrentLocation } from '../utils';
import { MapPin, Clock, AlertTriangle, CheckCircle, Play, RefreshCw, Navigation, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import socketService from '../socket';
import IncidentMap from '../components/IncidentMap';

const VolunteerDashboard = () => {
  const { user, updateLocation } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [assignedIncidents, setAssignedIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    loadIncidents();
    loadAssignedIncidents();
    
    // Listen for new incidents
    const handleNewIncident = (incident) => {
      setIncidents(prev => [incident, ...prev]);
      toast.success(`New emergency reported: ${incident.title}`, {
        duration: 6000,
        icon: '🚨',
      });
    };

    // Listen for incident status updates
    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => 
        prev.map(incident => 
          incident._id === updatedIncident._id ? updatedIncident : incident
        )
      );
      setAssignedIncidents(prev => 
        prev.map(incident => 
          incident._id === updatedIncident._id ? updatedIncident : incident
        )
      );
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
      const response = await incidentsAPI.getAll({ status: 'open' });
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedIncidents = async () => {
    try {
      const response = await incidentsAPI.getAll({ assignedVolunteer: user.id });
      setAssignedIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to load assigned incidents:', error);
    }
  };

  const startLocationSharing = async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationSharing(true);
      
      // Update backend with location
      await updateLocation(location);
      
      // Send location to socket server
      socketService.updateVolunteerLocation(location);
      
      toast.success('Location sharing started');
      
      // Watch for location changes
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);
          await updateLocation(newLocation);
          socketService.updateVolunteerLocation(newLocation);
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );

      // Store watch ID for cleanup
      window.locationWatchId = watchId;
    } catch (error) {
      toast.error('Failed to get location');
      console.error('Location error:', error);
    }
  };

  const stopLocationSharing = () => {
    if (window.locationWatchId) {
      navigator.geolocation.clearWatch(window.locationWatchId);
      window.locationWatchId = null;
    }
    setLocationSharing(false);
    setUserLocation(null);
    toast.success('Location sharing stopped');
  };

  const handleAcceptIncident = async (incidentId) => {
    try {
      await incidentsAPI.updateStatus(incidentId, 'in_progress');
      toast.success('Incident accepted! You are now assigned to this emergency.');
      loadIncidents();
      loadAssignedIncidents();
    } catch (error) {
      console.error('Failed to accept incident:', error);
      toast.error('Failed to accept incident');
    }
  };

  const handleResolveIncident = async (incidentId) => {
    try {
      await incidentsAPI.updateStatus(incidentId, 'resolved');
      toast.success('Incident marked as resolved!');
      loadAssignedIncidents();
    } catch (error) {
      console.error('Failed to resolve incident:', error);
      toast.error('Failed to resolve incident');
    }
  };

  const getDistanceFromUser = (incident) => {
    if (!userLocation || !incident.location?.coordinates) return null;
    
    const [lng, lat] = incident.location.coordinates;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      lat,
      lng
    );
    return distance;
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
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
          <p className="text-gray-600">Respond to emergencies in your area</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className="btn-secondary flex items-center"
          >
            <Map className="w-4 h-4 mr-2" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          {!locationSharing ? (
            <button
              onClick={startLocationSharing}
              className="btn-primary flex items-center"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Start Location Sharing
            </button>
          ) : (
            <button
              onClick={stopLocationSharing}
              className="btn-secondary flex items-center"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Stop Location Sharing
            </button>
          )}
        </div>
      </div>

      {/* Location Status */}
      {locationSharing && userLocation && (
        <div className="alert-info">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            <span>
              Location sharing active - Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-danger-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{incidents.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Assigned to You</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignedIncidents.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-success-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignedIncidents.filter(i => i.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="text-sm font-bold text-gray-900">
                {locationSharing ? 'Sharing' : 'Not Sharing'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Incidents */}
      {assignedIncidents.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Assigned Incidents</h2>
          <div className="space-y-4">
            {assignedIncidents.map((incident) => (
              <div key={incident._id} className="border border-primary-200 rounded-lg p-4 bg-primary-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{incident.title}</h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(incident.status)}`}>
                      {capitalize(incident.status.replace('_', ' '))}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(incident.priority)}`}>
                      {capitalize(incident.priority)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">{incident.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDateTime(incident.createdAt)}
                  </div>
                  {incident.status === 'in_progress' && (
                    <button
                      onClick={() => handleResolveIncident(incident._id)}
                      className="btn-success text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map View */}
      {showMap && (
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Incidents Map</h2>
          <IncidentMap
            incidents={incidents}
            volunteerLocation={userLocation}
            onIncidentClick={(incident) => setSelectedIncident(incident)}
            height="500px"
          />
        </div>
      )}

      {/* Incident Details Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedIncident.title}</h3>
              <div className="space-y-3">
                <p className="text-gray-600">{selectedIncident.description}</p>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(selectedIncident.priority)}`}>
                    {capitalize(selectedIncident.priority)} Priority
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                    {capitalize(selectedIncident.status.replace('_', ' '))}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {formatDateTime(selectedIncident.createdAt)}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                {selectedIncident.status === 'open' && (
                  <button
                    onClick={() => {
                      handleAcceptIncident(selectedIncident._id);
                      setSelectedIncident(null);
                    }}
                    className="btn-primary"
                  >
                    Accept & Respond
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Incidents */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Available Incidents</h2>
          <button onClick={loadIncidents} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-4" />
            <p className="text-gray-500">No open incidents at the moment</p>
            <p className="text-sm text-gray-400 mt-2">
              You'll be notified when new emergencies are reported
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents
              .sort((a, b) => {
                // Sort by distance if location is available, then by priority and time
                const distanceA = getDistanceFromUser(a);
                const distanceB = getDistanceFromUser(b);
                if (distanceA !== null && distanceB !== null) {
                  return distanceA - distanceB;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
              })
              .map((incident) => {
                const distance = getDistanceFromUser(incident);
                return (
                  <div key={incident._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{incident.title}</h3>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(incident.priority)}`}>
                          {capitalize(incident.priority)}
                        </span>
                        {distance && (
                          <span className="px-2 py-1 text-xs rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                            {formatDistance(distance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{incident.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDateTime(incident.createdAt)}
                      </div>
                      <button
                        onClick={() => handleAcceptIncident(incident._id)}
                        className="btn-primary text-sm"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Accept & Respond
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;