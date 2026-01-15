const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: { unique: true }
  },
  password_hash: {
    type: String,
    required: function() {
      // Password is required only if not using OAuth
      return !this.googleId;
    }
  },
  role: {
    type: String,
    enum: ['ORGANIZER', 'AUTHOR', 'REVIEWER'],
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  // OAuth fields
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
