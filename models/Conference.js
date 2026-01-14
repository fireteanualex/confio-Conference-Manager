const mongoose = require('mongoose');

const conferenceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  start_date: {
    type: String,
    required: true
  },
  end_date: {
    type: String,
    required: true
  },
  start_time: {
    type: String,
    default: ''
  },
  end_time: {
    type: String,
    default: ''
  },
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  attendeeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  type: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'HYBRID'],
    required: true
  },
  meeting_link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for faster queries
conferenceSchema.index({ organizer_id: 1 });
conferenceSchema.index({ organization_id: 1 });

module.exports = mongoose.model('Conference', conferenceSchema);
