require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function verifyQuickActionsFlow() {
  console.log('--- Verifying Quick Emergency Action Presets ---');

  let userToken;

  try {
    // 1. Register a test user
    console.log('\n1. Registering test user...');
    const userRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Quick Action Tester',
      email: `tester_${Date.now()}@test.com`,
      password: 'password123',
      lat: 12.9716,
      lng: 77.5946
    });
    userToken = userRes.data.token;
    console.log(`✅ User registered.`);

    // 2. Simulate "FIRE" Quick Action
    console.log('\n2. Simulating "FIRE" button report...');
    const fireRes = await axios.post(`${API_URL}/incidents`, {
      title: 'Fire Emergency',
      description: 'Emergency fire report. Help needed immediately.',
      priority: 'critical',
      lat: 12.9716,
      lng: 77.5946
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (fireRes.data.incident.priority === 'critical') {
      console.log('✅ Success: Fire incident created with CRITICAL priority.');
    } else {
      console.log('❌ Error: Incident data mismatch.');
    }

    // 3. Simulate "ASSAULT" Quick Action
    console.log('\n3. Simulating "ASSAULT" button report...');
    const assaultRes = await axios.post(`${API_URL}/incidents`, {
      title: 'Manhandling / Assault',
      description: 'Physical confrontation or assault reported.',
      priority: 'high',
      lat: 12.9716,
      lng: 77.5946
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (assaultRes.data.incident.priority === 'high') {
      console.log('✅ Success: Assault incident created with HIGH priority.');
    } else {
      console.log('❌ Error: Incident priority mismatch.');
    }

    console.log('\n--- Quick Action Verification Complete ---');
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

verifyQuickActionsFlow();
