const axios = require('axios');

/**
 * Fetch geographic details from coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, community: string}|null>} - Details or null
 */
const getGeoDetails = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'NeighboursCare/1.0'
      }
    });

    if (response.data) {
      return {
        address: response.data.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

/**
 * Backward compatibility helper
 */
const getAddressFromCoords = async (lat, lng) => {
  const details = await getGeoDetails(lat, lng);
  return details ? details.address : null;
};

module.exports = {
  getGeoDetails,
  getAddressFromCoords
};
