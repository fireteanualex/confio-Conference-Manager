const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  abstract: {
    type: String,
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'ACCEPTED', 'REJECTED'],
    default: 'SUBMITTED'
  },
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conference_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  reviewer_ids: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  }
}, {
  timestamps: true
});

// Indexes for faster queries
paperSchema.index({ author_id: 1 });
paperSchema.index({ conference_id: 1 });

module.exports = mongoose.model('Paper', paperSchema);
