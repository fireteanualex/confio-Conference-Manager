const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  paper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  reviewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 10
  },
  comment: {
    type: String,
    default: ''
  },
  recommendation: {
    type: String,
    enum: ['ACCEPT', 'REJECT', 'MODIFY']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
reviewSchema.index({ paper_id: 1 });
reviewSchema.index({ reviewer_id: 1 });

module.exports = mongoose.model('Review', reviewSchema);
