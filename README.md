# 🚨 NeighboursCare - Community Emergency Aid Platform

A comprehensive full-stack emergency response platform that connects community members with volunteers during critical situations. Built with modern technologies to provide real-time incident reporting, volunteer matching, and emergency response coordination.

## 🌟 Features

### 🚨 **Emergency Management**
- **Real-time incident reporting** with geolocation
- **Priority-based categorization** (Low, Medium, High, Critical)
- **Automatic volunteer matching** based on proximity
- **Live status updates** and notifications
- **Interactive maps** with incident visualization

### 👥 **Multi-Role System**
- **Users**: Report emergencies and track assistance
- **Volunteers**: Respond to nearby incidents and provide help
- **Admins**: Oversee all activities and manage the platform

### 🗺️ **Advanced Location Features**
- **Auto-zoom maps** to user location on refresh
- **Real-time volunteer tracking** for users
- **Geospatial volunteer matching** within configurable radius
- **Interactive incident markers** with detailed popups
- **Multiple location indicators** (users, volunteers, incidents)

### 📱 **Communication & Tracking**
- **Volunteer contact details** (phone, email) for users
- **Real-time Socket.IO notifications**
- **Email alerts** for critical incidents
- **Live location tracking** and updates
- **Click-to-call/email** functionality

### ⚙️ **User Management**
- **Comprehensive settings page** with profile management
- **Location preferences** and auto-update options
- **Notification settings** customization
- **Secure password management**
- **Profile information** updates

## 🛠️ Tech Stack

### **Frontend**
- **React 18** with Vite for fast development
- **TailwindCSS 3.4.15** for modern styling
- **React Router** for navigation
- **Socket.IO Client** for real-time updates  
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Leaflet & React-Leaflet** for interactive maps
- **Lucide React** for beautiful icons

### **Backend**
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** authentication with bcrypt
- **Nodemailer** for email notifications
- **Geospatial queries** for location-based matching
- **CORS** enabled for cross-origin requests

### **Development Tools**
- **ESLint** for code quality
- **PostCSS** with Autoprefixer
- **Nodemon** for development
- **Git** version control

## 🚀 Getting Started

### **Prerequisites**
- Node.js 20.19+ or 22.12+
- MongoDB database
- Git for version control

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/neighbourscare.git
   cd neighbourscare
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file with:
   # MONGODB_URI=your_mongodb_connection_string
   # JWT_SECRET=your_jwt_secret_key
   # EMAIL_USER=your_email@gmail.com
   # EMAIL_PASS=your_app_password
   # ALERT_RADIUS_METERS=5000
   
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### **For Users (Emergency Reporters)**
1. **Register/Login** to your account
2. **Report an emergency** with location and details
3. **Track volunteer response** in real-time
4. **Contact assigned volunteers** directly
5. **Monitor incident status** until resolution

### **For Volunteers**
1. **Register as a volunteer** and set your location
2. **View nearby incidents** on the interactive map
3. **Accept incidents** to provide assistance
4. **Update incident status** as you help
5. **Track your volunteer activity**

### **For Administrators**
1. **Monitor all platform activity**
2. **Manage users and volunteers**
3. **Oversee incident resolution**
4. **Access system analytics**
5. **Configure platform settings**

## 🗺️ Key Features Explained

### **Smart Location Services**
- Maps automatically center on user location
- Real-time volunteer position tracking
- Proximity-based volunteer matching
- Visual incident and volunteer markers

### **Real-Time Communication**
- Instant notifications via Socket.IO
- Email alerts for critical situations
- Live status updates across all users
- Direct volunteer contact options

### **Comprehensive Settings**
- Profile management (name, email, phone)
- Location preferences and auto-updates
- Notification customization
- Secure password changes

## 🔧 API Endpoints

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/location` - Update location
- `PUT /api/auth/password` - Change password

### **Incidents**
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Create new incident
- `PUT /api/incidents/:id/accept` - Accept incident (volunteers)
- `PUT /api/incidents/:id/status` - Update incident status

## 📁 Project Structure

```
neighbourscare/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── middleware/         # Auth & Socket middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── services/           # Email & other services
│   ├── index.js            # Server entry point
│   └── socket.js           # Socket.IO setup
├── frontend/               # React application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Page components
│   │   ├── socket/         # Socket client
│   │   └── utils/          # Utility functions
│   └── package.json
├── README.md
└── .gitignore
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Leaflet** for excellent mapping capabilities
- **Socket.IO** for real-time communication
- **TailwindCSS** for rapid UI development
- **React** ecosystem for robust frontend framework
- **MongoDB** for flexible data storage

## 📞 Support

For support, email support@neighbourscare.com or create an issue in this repository.

---

**Built with ❤️ for community safety and emergency response**