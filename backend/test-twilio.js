require('dotenv').config();
const { sendSMS } = require('./services/smsService');

// Change this to your actual phone number (with country code, e.g., +91...) to test
const TEST_PHONE = '+919932152331'; // I'll use a placeholder or ask user to provide one if this fails

async function testTwilio() {
  console.log('--- Testing Twilio SMS Service ---');
  console.log('Using SID:', process.env.TWILIO_ACCOUNT_SID);
  
  try {
    const response = await sendSMS(TEST_PHONE, 'Hello! This is a test from NeighbourCare platform.');
    if (response) {
      console.log('✅ SMS sent successfully! SID:', response.sid);
    } else {
      console.log('❌ Twilio credentials missing in .env');
    }
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    if (error.code === 21608) {
      console.log('💡 TIP: This error usually means your Twilio trial account only allows sending to "Verified Caller IDs".');
    }
  }
}

testTwilio();
