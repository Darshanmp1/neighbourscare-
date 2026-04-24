require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const volunteers = await User.find({ role: 'volunteer' }).select('name email phone');
    console.log(JSON.stringify(volunteers, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
