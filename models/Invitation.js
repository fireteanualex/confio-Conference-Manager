const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  invitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
invitationSchema.index({ invitedUserId: 1, status: 1 });
invitationSchema.index({ orgId: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
