require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const volunteers = await User.find({ role: 'volunteer' });
    console.log('\nVolunteers:');
    volunteers.forEach(v => {
      console.log(`- Name: ${v.name}, Phone: ${v.phone || 'N/A'}`);
    });

    const admins = await User.find({ role: 'admin' });
    console.log('\nAdmins:');
    admins.forEach(a => {
      console.log(`- Name: ${a.name}, Phone: ${a.phone || 'N/A'}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
