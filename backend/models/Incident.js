const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Incident must have a reporter']
    },
    title: {
        type: String,
        required: [true, 'Please provide incident title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide incident description'],
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: [true, 'Please provide incident location coordinates']
        }
    },
    address: {
        type: String,
        trim: true
    },
    assignedVolunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    responseTime: {
        type: Date
    },
    resolvedAt: {
        type: Date
    },
    notes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    notifiedVolunteers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notifiedAt: {
            type: Date,
            default: Date.now
        },
        method: {
            type: String,
            enum: ['socket', 'email'],
            default: 'socket'
        }
    }]
}, {
    timestamps: true
});

// Create geospatial index for location-based queries
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1 });
incidentSchema.index({ reporter: 1 });
incidentSchema.index({ assignedVolunteer: 1 });
incidentSchema.index({ createdAt: -1 });

// Update status and track timing
incidentSchema.methods.updateStatus = function (newStatus, volunteerId = null) {
    this.status = newStatus;

    if (newStatus === 'in_progress' && !this.responseTime) {
        this.responseTime = new Date();
        this.assignedVolunteer = volunteerId;
    } else if (newStatus === 'resolved' && !this.resolvedAt) {
        this.resolvedAt = new Date();
    }

    return this.save();
};

// Add note to incident
incidentSchema.methods.addNote = function (userId, text) {
    this.notes.push({
        user: userId,
        text: text
    });
    return this.save();
};

// Calculate response time in minutes
incidentSchema.virtual('responseTimeMinutes').get(function () {
    if (!this.responseTime) return null;
    return Math.round((this.responseTime - this.createdAt) / (1000 * 60));
});

// Calculate resolution time in minutes
incidentSchema.virtual('resolutionTimeMinutes').get(function () {
    if (!this.resolvedAt) return null;
    return Math.round((this.resolvedAt - this.createdAt) / (1000 * 60));
});

// Ensure virtual fields are serialized
incidentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Incident', incidentSchema);