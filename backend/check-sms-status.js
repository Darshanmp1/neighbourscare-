require('dotenv').config();
const twilio = require('twilio');

async function checkSMSStatus(sid) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages(sid).fetch();
    console.log('--- SMS Status Check ---');
    console.log('SID:', message.sid);
    console.log('Status:', message.status);
    console.log('To:', message.to);
    console.log('Error Code:', message.errorCode);
    console.log('Error Message:', message.errorMessage);
    console.log('------------------------');
  } catch (error) {
    console.error('Error fetching SMS status:', error.message);
  }
}

const sid = process.argv[2] || 'SM797c94eadb7216f3934dd62d4260c2d3';
checkSMSStatus(sid);
