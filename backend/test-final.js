require('dotenv').config();
const { getAddressFromCoords } = require('./utils/geocoder');
const { sendIncidentSMS } = require('./services/smsService');
const { sendIncidentNotification } = require('./services/emailService');

async function testFinal() {
  console.log('--- Final Comprehensive Test ---');

  const lat = 12.9507;
  const lng = 77.5848;
  const address = await getAddressFromCoords(lat, lng) || 'Ashoka Pillar, Bengaluru';

  const sampleIncident = {
    title: 'Final Test Incident',
    description: 'Verifying landmark alerts and email together.',
    priority: 'high',
    address: address,
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    createdAt: new Date()
  };

  // 1. Send Email
  console.log('\n1. Sending Email...');
  try {
    await sendIncidentNotification('drshanmp24@gmail.com', sampleIncident);
    console.log('✅ Email service triggered.');
  } catch (error) {
    console.log('❌ Email failed:', error.message);
  }

  // 2. Send SMS (without link)
  console.log('\n2. Sending SMS (No Link)...');
  try {
    const result = await sendIncidentSMS('+919141643518', sampleIncident);
    if (result) {
       console.log('✅ SMS SID:', result.sid);
    }
  } catch (error) {
    console.log('❌ SMS failed:', error.message);
  }
}

testFinal();
