require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function verifyAdminFeatures() {
  console.log('--- Verifying Admin Features ---');

  let adminToken;
  let userToken;
  let testUserId;
  let testIncidentId;

  try {
    // 1. Register an Admin
    console.log('\n1. Registering Admin...');
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Super Admin',
      email: `admin_${Date.now()}@test.com`,
      password: 'password123',
      role: 'admin'
    });
    adminToken = adminRes.data.token;
    console.log('✅ Admin registered.');

    // 2. Register a regular User
    console.log('\n2. Registering regular User...');
    const userRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: `user_${Date.now()}@test.com`,
      password: 'password123',
      role: 'user'
    });
    userToken = userRes.data.token;
    testUserId = userRes.data.user.id;
    console.log('✅ User registered.');

    // 3. Test Unauthorized Access (Regular user trying to get all users)
    console.log('\n3. Testing unauthorized access to /admin/users...');
    try {
      await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      console.log('❌ Error: Regular user accessed admin route!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Success: Regular user blocked (403 Forbidden).');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // 4. Test Authorized Access (Admin getting all users)
    console.log('\n4. Testing admin access to /admin/users...');
    const usersRes = await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Admin accessed users list. Count: ${usersRes.data.count}`);

    // 5. Promote User to Volunteer
    console.log('\n5. Promoting user to volunteer...');
    const promoteRes = await axios.patch(`${API_URL}/admin/users/${testUserId}/role`, {
      role: 'volunteer'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ User promoted. New role: ${promoteRes.data.user.role}`);

    // 6. Create an incident and delete it as Admin
    console.log('\n6. Testing incident moderation...');
    const incidentRes = await axios.post(`${API_URL}/incidents`, {
      title: 'Moderation Test',
      description: 'This incident should be deleted by admin.',
      lat: 12.9716,
      lng: 77.5946
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    testIncidentId = incidentRes.data.incident._id;
    console.log('✅ Incident created.');

    console.log('Deleting incident as Admin...');
    await axios.delete(`${API_URL}/incidents/${testIncidentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Incident deleted by admin.');

    // 7. Deactivate user
    console.log('\n7. Deactivating user...');
    const deactivateRes = await axios.patch(`${API_URL}/admin/users/${testUserId}/status`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ User active status: ${deactivateRes.data.user.isActive}`);

    console.log('\n--- Verification Complete ---');
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

verifyAdminFeatures();
