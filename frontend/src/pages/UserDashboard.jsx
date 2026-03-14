import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { incidentsAPI } from '../api';
import { getCurrentLocation, formatDateTime, getStatusColor, getPriorityColor, capitalize } from '../utils';
import { AlertTriangle, MapPin, Clock, Plus, RefreshCw, X, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import socketService from '../socket';
import IncidentMap from '../components/IncidentMap';

const UserDashboard = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    lat: '',
    lng: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showVolunteerDetails, setShowVolunteerDetails] = useState(null);
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [focusedIncident, setFocusedIncident] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadIncidents();
    
    // Listen for incident status updates
    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => 
        prev.map(incident => 
          incident._id === updatedIncident._id ? updatedIncident : incident
        )
      );
      toast.success(`Incident "${updatedIncident.title}" status updated to ${updatedIncident.status}`);
    };

    socketService.onIncidentStatusUpdate(handleIncidentUpdate);

    return () => {
      socketService.off('incident:statusUpdate', handleIncidentUpdate);
    };
  }, []);

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const response = await incidentsAPI.getAll({ reporter: user.id });
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setFormData(prev => ({
        ...prev,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
      }));
      toast.success('Location obtained successfully!');
    } catch (error) {
      toast.error('Failed to get location. Please enter manually.');
      console.error('Location error:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Location is required for emergency reporting');
      return;
    }

    setIsSubmitting(true);
    try {
      const incidentData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      };

      await incidentsAPI.create(incidentData);
      toast.success('Emergency reported successfully! Nearby volunteers have been notified.');
      
      // Reset form and close
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        lat: '',
        lng: '',
      });
      setShowCreateForm(false);
      
      // Reload incidents
      loadIncidents();
    } catch (error) {
      console.error('Failed to create incident:', error);
      toast.error('Failed to report emergency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle map zoom to incident with animation
  const handleZoomToIncident = (incident) => {
    if (!incident.location?.coordinates) {
      toast.error('Incident location not available');
      return;
    }
    
    setShowMap(true);
    setIsAnimating(true);
    setFocusedIncident(incident);
    
    // Show success toast
    toast.success(`Zooming to incident: ${incident.title}`, {
      duration: 2000,
      icon: '🗺️'
    });
    
    // Auto-hide the focused incident after animation
    setTimeout(() => {
      setIsAnimating(false);
    }, 2200);
  };

  // Handle animation completion
  const handleAnimationComplete = () => {
    setIsAnimating(false);
    if (focusedIncident) {
      toast.success(`📍 Focused on: ${focusedIncident.title}`, {
        duration: 1500,
        icon: '🎯'
      });
    }
  };

  // Toggle map view
  const toggleMapView = () => {
    setShowMap(!showMap);
    if (!showMap) {
      setFocusedIncident(null);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Emergency Dashboard</h1>
          <p className="text-gray-600">Report emergencies and track their status</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={toggleMapView}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              showMap 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-danger flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Emergency
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-danger-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{incidents.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open</p>
              <p className="text-2xl font-bold text-gray-900">
                {incidents.filter(i => i.status === 'open').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {incidents.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-success-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {incidents.filter(i => i.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      {showMap && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {focusedIncident ? `Viewing: ${focusedIncident.title}` : 'Incidents Map'}
            </h2>
            <div className="flex items-center space-x-3">
              {isAnimating && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">Zooming to incident...</span>
                </div>
              )}
              {focusedIncident && !isAnimating && (
                <button
                  onClick={() => setFocusedIncident(null)}
                  className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Focus
                </button>
              )}
            </div>
          </div>
          <IncidentMap
            incidents={incidents}
            userLocation={user.location?.coordinates ? [user.location.coordinates[1], user.location.coordinates[0]] : null}
            focusIncident={focusedIncident}
            onAnimationComplete={handleAnimationComplete}
            animateToLocation={!!focusedIncident}
            onIncidentClick={(incident) => {
              // Handle incident click with zoom animation
              handleZoomToIncident(incident);
            }}
            height="500px"
          />
          <div className="mt-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                  <span>Your Location</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span>Incidents</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span>Volunteers</span>
                </div>
              </div>
              <span className="text-xs">Click on incidents to zoom and view details</span>
            </div>
          </div>
        </div>
      )}

      {/* Create Incident Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Emergency</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Emergency Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Brief description of the emergency"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-input"
                    rows="3"
                    placeholder="Detailed description of what happened"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      value={formData.lat}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Latitude"
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      value={formData.lng}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Longitude"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="btn-secondary flex items-center whitespace-nowrap"
                    >
                      {isGettingLocation ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-1" />
                          Get Location
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-danger"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Report Emergency'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Incidents List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Your Emergency Reports</h2>
          <button onClick={loadIncidents} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No emergency reports yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary mt-4"
            >
              Report Your First Emergency
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident._id} className="border border-gray-200 rounded-lg p-4">
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
                
                {/* Action Buttons */}
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => handleZoomToIncident(incident)}
                    className="flex items-center text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    View on Map
                  </button>
                  {incident.location?.coordinates && (
                    <span className="text-xs text-gray-500">
                      📍 Location Available
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDateTime(incident.createdAt)}
                  </div>
                  {incident.assignedVolunteer && (
                    <div className="text-primary-600 text-right">
                      <div className="font-medium">Volunteer: {incident.assignedVolunteer.name}</div>
                      <div className="text-xs">{incident.assignedVolunteer.email}</div>
                      {incident.assignedVolunteer.phone && (
                        <div className="text-xs">Phone: {incident.assignedVolunteer.phone}</div>
                      )}
                      <button
                        onClick={() => setShowVolunteerDetails(incident.assignedVolunteer)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mt-1"
                      >
                        Track Volunteer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volunteer Details Modal */}
      {showVolunteerDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Volunteer Details & Location</h2>
              <button
                onClick={() => {
                  setShowVolunteerDetails(null);
                  setVolunteerLocation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volunteer Information */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <strong className="w-20">Name:</strong>
                      <span>{showVolunteerDetails.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      <strong className="w-20">Email:</strong>
                      <a 
                        href={`mailto:${showVolunteerDetails.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {showVolunteerDetails.email}
                      </a>
                    </div>
                    {showVolunteerDetails.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        <strong className="w-20">Phone:</strong>
                        <a 
                          href={`tel:${showVolunteerDetails.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {showVolunteerDetails.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center">
                      <strong className="w-20">Role:</strong>
                      <span className="capitalize">{showVolunteerDetails.role}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Tracking Status</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Real-time location tracking helps you know when help is on the way.
                  </p>
                  <button
                    onClick={() => {
                      // Simulate getting volunteer location
                      if (showVolunteerDetails.location?.coordinates) {
                        const [lng, lat] = showVolunteerDetails.location.coordinates;
                        setVolunteerLocation([lat, lng]);
                        toast.success('Volunteer location updated');
                      } else {
                        // Simulate location near user
                        if (user.location?.coordinates) {
                          const [userLng, userLat] = user.location.coordinates;
                          setVolunteerLocation([
                            userLat + (Math.random() - 0.5) * 0.01,
                            userLng + (Math.random() - 0.5) * 0.01
                          ]);
                          toast.success('Volunteer location found');
                        } else {
                          setVolunteerLocation([40.7589, -73.9851]); // Default NYC location
                          toast.success('Volunteer location found');
                        }
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Refresh Location
                  </button>
                </div>
              </div>
              
              {/* Map */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Location Map</h3>
                <IncidentMap
                  incidents={[]}
                  volunteerLocation={volunteerLocation}
                  userLocation={user.location?.coordinates ? [user.location.coordinates[1], user.location.coordinates[0]] : null}
                  height="400px"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                      <span>Your Location</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                      <span>Volunteer Location</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowVolunteerDetails(null);
                  setVolunteerLocation(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;