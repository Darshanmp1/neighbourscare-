const twilio = require('twilio');

/**
 * Send SMS notification using Twilio
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise} - Twilio message response
 */
const sendSMS = async (to, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    // Basic E.164 formatting check
    let formattedTo = to.trim();
    if (!formattedTo.startsWith('+')) {
      // Default to +91 if missing (assuming India, but could be made configurable)
      formattedTo = `+91${formattedTo}`;
      console.log(`Formatting phone number from ${to} to ${formattedTo}`);
    }

    if (!accountSid || !authToken || !from) {
      console.warn('Twilio credentials missing. SMS not sent.');
      return null;
    }

    const client = twilio(accountSid, authToken);

    const response = await client.messages.create({
      body: message,
      from: from,
      to: formattedTo
    });

    console.log(`SMS sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
};

/**
 * Send incident alert SMS to a volunteer
 * @param {string} to - Volunteer phone number
 * @param {Object} incident - Incident details
 */
const sendIncidentSMS = async (to, incident) => {
  if (!to) return;

  const { title, address, priority, description, location } = incident;
  const [lng, lat] = location.coordinates;
  
  const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const message = `🚨 EMERGENCY ALERT: ${title}
📍 Address: ${address || 'Near coordinates below'}
⚠️ Priority: ${priority.toUpperCase()}
📝 Details: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}

🗺️ Navigate: ${mapsLink}`;

  return sendSMS(to, message);
};

module.exports = {
  sendSMS,
  sendIncidentSMS
};
