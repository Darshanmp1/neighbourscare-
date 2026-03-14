const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { sendIncidentNotification } = require('../services/emailService');

const router = express.Router();

// @desc    Create new incident
// @route   POST /api/incidents
// @access  Private
router.post('/', protect, [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority level'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address too long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, lat, lng, priority = 'medium', address } = req.body;

    // Create incident
    const incident = await Incident.create({
      reporter: req.user.id,
      title,
      description,
      priority,
      address,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    });

    // Find nearby volunteers (within ALERT_RADIUS_METERS)
    const radius = process.env.ALERT_RADIUS_METERS || 5000;
    const nearbyVolunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      }
    });

    // Emit socket event for online volunteers and prepare email list
    const offlineVolunteers = [];
    nearbyVolunteers.forEach(volunteer => {
      const lastSeen = new Date(volunteer.lastSeen);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (lastSeen > fiveMinutesAgo) {
        // Volunteer is online - notify via socket
        req.io.to(volunteer._id.toString()).emit('incident:new', {
          incident: {
            id: incident._id,
            title,
            description,
            location: incident.location,
            priority,
            address,
            createdAt: incident.createdAt
          }
        });

        // Add to notified list
        incident.notifiedVolunteers.push({
          user: volunteer._id,
          method: 'socket'
        });
      } else {
        // Volunteer is offline - add to email list
        offlineVolunteers.push(volunteer);
      }
    });

    // Send emails to offline volunteers
    for (const volunteer of offlineVolunteers) {
      try {
        await sendIncidentNotification(volunteer.email, incident);
        incident.notifiedVolunteers.push({
          user: volunteer._id,
          method: 'email'
        });
      } catch (error) {
        console.error(`Failed to send email to ${volunteer.email}:`, error);
      }
    }

    // Save notified volunteers
    await incident.save();

    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      incident,
      notifiedCount: {
        socket: nearbyVolunteers.length - offlineVolunteers.length,
        email: offlineVolunteers.length
      }
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating incident'
    });
  }
});

// @desc    Get all incidents (filtered by role/user)
// @route   GET /api/incidents
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    const { status, priority, startDate, endDate } = req.query;

    // Base query based on user role
    if (req.user.role === 'user') {
      query.reporter = req.user._id;
    } else if (req.user.role === 'volunteer') {
      query.$or = [
        { assignedVolunteer: req.user._id },
        { status: 'open' }
      ];
    }
    // Admin can see all incidents

    // Add filters if provided
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(query)
      .populate('reporter', 'name email')
      .populate('assignedVolunteer', 'name email phone location')
      .sort('-createdAt');

    res.json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting incidents'
    });
  }
});

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reporter', 'name email')
      .populate('assignedVolunteer', 'name email phone location')
      .populate('notes.user', 'name role');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && incident.reporter.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this incident'
      });
    }

    res.json({
      success: true,
      incident
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting incident'
    });
  }
});

// @desc    Update incident status
// @route   PATCH /api/incidents/:id/status
// @access  Private (Volunteer & Admin)
router.patch('/:id/status', [
  protect,
  authorize('volunteer', 'admin'),
  param('id').isMongoId().withMessage('Invalid incident ID'),
  body('status').isIn(['in_progress', 'resolved']).withMessage('Invalid status update')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Update status and associated data
    await incident.updateStatus(req.body.status, req.user.id);

    // Emit status update event
    req.io.to(incident.reporter.toString()).emit('incident:statusUpdate', {
      incidentId: incident._id,
      status: incident.status,
      volunteer: {
        id: req.user.id,
        name: req.user.name
      }
    });

    res.json({
      success: true,
      message: 'Incident status updated successfully',
      incident
    });
  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating incident status'
    });
  }
});

// @desc    Add note to incident
// @route   POST /api/incidents/:id/notes
// @access  Private
router.post('/:id/notes', [
  protect,
  param('id').isMongoId().withMessage('Invalid incident ID'),
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Note text must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Add note
    await incident.addNote(req.user.id, req.body.text);

    // Emit note added event
    req.io.to(incident.reporter.toString()).emit('incident:noteAdded', {
      incidentId: incident._id,
      note: {
        user: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role
        },
        text: req.body.text,
        createdAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Note added successfully',
      incident
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding note'
    });
  }
});

module.exports = router;