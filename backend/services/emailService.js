const nodemailer = require('nodemailer');

// Create transporter based on environment variables
const createTransporter = () => {
  // Check if email credentials are provided
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Emails will be logged to console only.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Initialize transporter
let transporter = createTransporter();

// Send incident notification to offline volunteer
const sendIncidentNotification = async (email, incident) => {
  const mailOptions = {
    from: `"NeighboursCare Alert" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🚨 New Emergency Alert: ${incident.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">🚨 Emergency Alert</h2>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">${incident.title}</h3>
          <p style="color: #4a5568;">${incident.description}</p>
          
          <div style="margin: 15px 0;">
            <strong>Priority:</strong> 
            <span style="color: ${getPriorityColor(incident.priority)};">
              ${incident.priority.toUpperCase()}
            </span>
          </div>
          
          ${incident.address ? `
            <div style="margin: 15px 0;">
              <strong>Location:</strong> ${incident.address}
            </div>
          ` : ''}
          
          <div style="margin: 15px 0;">
            <strong>Reported:</strong> ${new Date(incident.createdAt).toLocaleString()}
          </div>
        </div>
        
        <div style="background-color: #ebf8ff; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #2b6cb0;">
            <strong>Take Action:</strong> Log into your NeighboursCare dashboard to respond to this emergency.
          </p>
          ${process.env.FRONTEND_URL ? `
            <p style="margin-top: 10px;">
              <a href="${process.env.FRONTEND_URL}/incidents/${incident._id}" 
                style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                View Emergency Details
              </a>
            </p>
          ` : ''}
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #718096; text-align: center;">
          <p>You're receiving this because you're a registered volunteer with NeighboursCare.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    `
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email notification');
    }
  } else {
    // Log email to console if no transporter is configured
    console.log('\n=== Email Notification (DEV MODE) ===');
    console.log('To:', email);
    console.log('Subject:', mailOptions.subject);
    console.log('Content:', incident);
    console.log('=====================================\n');
  }
};

// Helper function to get color based on priority
function getPriorityColor(priority) {
  const colors = {
    low: '#48bb78',     // green
    medium: '#ecc94b',  // yellow
    high: '#ed8936',    // orange
    critical: '#e53e3e' // red
  };
  return colors[priority] || colors.medium;
}

module.exports = {
  sendIncidentNotification
};