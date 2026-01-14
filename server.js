require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Organization = require('./models/Organization');
const Conference = require('./models/Conference');
const Paper = require('./models/Paper');
const Review = require('./models/Review');
const Invitation = require('./models/Invitation');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/confio';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== AUTHENTICATION ROUTES ====================

// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { name, surname, email, password, role, profilePicture } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name,
      surname,
      email,
      password_hash,
      role,
      profilePicture: profilePicture || `https://ui-avatars.com/api/?name=${name}+${surname}&background=2D2926&color=F2F1E8`,
      isConfirmed: false
    });

    await newUser.save();

    // Return user without password hash
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      surname: newUser.surname,
      email: newUser.email,
      role: newUser.role,
      profilePicture: newUser.profilePicture,
      isConfirmed: newUser.isConfirmed
    };

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login (authenticate user)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is confirmed
    if (!user.isConfirmed) {
      return res.status(403).json({ error: 'Please confirm your email address before signing in' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user without password hash
    const userResponse = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      isConfirmed: user.isConfirmed
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Confirm user email
app.post('/api/confirm-email', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOneAndUpdate(
      { email },
      { isConfirmed: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Email confirmed successfully' });
  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({ error: 'Email confirmation failed' });
  }
});

// ==================== USER ROUTES ====================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password_hash');
    const usersResponse = users.map(user => ({
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      isConfirmed: user.isConfirmed
    }));
    res.json(usersResponse);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      isConfirmed: user.isConfirmed
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password_hash; // Don't allow direct password_hash updates

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      isConfirmed: user.isConfirmed
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ==================== ORGANIZATION ROUTES ====================

// Get all organizations
app.get('/api/organizations', async (req, res) => {
  try {
    const orgs = await Organization.find();
    const orgsResponse = orgs.map(org => ({
      id: org._id,
      name: org.name,
      logoUrl: org.logoUrl,
      ownerId: org.ownerId,
      memberIds: org.memberIds
    }));
    res.json(orgsResponse);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization by ID
app.get('/api/organizations/:id', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({
      id: org._id,
      name: org.name,
      logoUrl: org.logoUrl,
      ownerId: org.ownerId,
      memberIds: org.memberIds
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create organization
app.post('/api/organizations', async (req, res) => {
  try {
    const { name, logoUrl, ownerId, memberIds } = req.body;

    const newOrg = new Organization({
      name,
      logoUrl: logoUrl || '',
      ownerId,
      memberIds: memberIds || []
    });

    await newOrg.save();

    res.status(201).json({
      id: newOrg._id,
      name: newOrg.name,
      logoUrl: newOrg.logoUrl,
      ownerId: newOrg.ownerId,
      memberIds: newOrg.memberIds
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
app.put('/api/organizations/:id', async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      id: org._id,
      name: org.name,
      logoUrl: org.logoUrl,
      ownerId: org.ownerId,
      memberIds: org.memberIds
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete organization
app.delete('/api/organizations/:id', async (req, res) => {
  try {
    const org = await Organization.findByIdAndDelete(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Also delete associated conferences
    await Conference.deleteMany({ organization_id: req.params.id });

    res.json({ success: true, message: 'Organization deleted' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// ==================== CONFERENCE ROUTES ====================

// Get all conferences
app.get('/api/conferences', async (req, res) => {
  try {
    const conferences = await Conference.find();
    const confsResponse = conferences.map(conf => ({
      id: conf._id,
      title: conf.title,
      description: conf.description,
      organizer_id: conf.organizer_id,
      start_date: conf.start_date,
      end_date: conf.end_date,
      start_time: conf.start_time,
      end_time: conf.end_time,
      organization_id: conf.organization_id,
      attendeeIds: conf.attendeeIds,
      type: conf.type,
      meeting_link: conf.meeting_link
    }));
    res.json(confsResponse);
  } catch (error) {
    console.error('Get conferences error:', error);
    res.status(500).json({ error: 'Failed to fetch conferences' });
  }
});

// Get conference by ID
app.get('/api/conferences/:id', async (req, res) => {
  try {
    const conf = await Conference.findById(req.params.id);
    if (!conf) {
      return res.status(404).json({ error: 'Conference not found' });
    }
    res.json({
      id: conf._id,
      title: conf.title,
      description: conf.description,
      organizer_id: conf.organizer_id,
      start_date: conf.start_date,
      end_date: conf.end_date,
      start_time: conf.start_time,
      end_time: conf.end_time,
      organization_id: conf.organization_id,
      attendeeIds: conf.attendeeIds,
      type: conf.type,
      meeting_link: conf.meeting_link
    });
  } catch (error) {
    console.error('Get conference error:', error);
    res.status(500).json({ error: 'Failed to fetch conference' });
  }
});

// Create conference
app.post('/api/conferences', async (req, res) => {
  try {
    const newConf = new Conference(req.body);
    await newConf.save();

    res.status(201).json({
      id: newConf._id,
      title: newConf.title,
      description: newConf.description,
      organizer_id: newConf.organizer_id,
      start_date: newConf.start_date,
      end_date: newConf.end_date,
      start_time: newConf.start_time,
      end_time: newConf.end_time,
      organization_id: newConf.organization_id,
      attendeeIds: newConf.attendeeIds,
      type: newConf.type,
      meeting_link: newConf.meeting_link
    });
  } catch (error) {
    console.error('Create conference error:', error);
    res.status(500).json({ error: 'Failed to create conference' });
  }
});

// Update conference
app.put('/api/conferences/:id', async (req, res) => {
  try {
    const conf = await Conference.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!conf) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    res.json({
      id: conf._id,
      title: conf.title,
      description: conf.description,
      organizer_id: conf.organizer_id,
      start_date: conf.start_date,
      end_date: conf.end_date,
      start_time: conf.start_time,
      end_time: conf.end_time,
      organization_id: conf.organization_id,
      attendeeIds: conf.attendeeIds,
      type: conf.type,
      meeting_link: conf.meeting_link
    });
  } catch (error) {
    console.error('Update conference error:', error);
    res.status(500).json({ error: 'Failed to update conference' });
  }
});

// Delete conference
app.delete('/api/conferences/:id', async (req, res) => {
  try {
    const conf = await Conference.findByIdAndDelete(req.params.id);
    if (!conf) {
      return res.status(404).json({ error: 'Conference not found' });
    }
    res.json({ success: true, message: 'Conference deleted' });
  } catch (error) {
    console.error('Delete conference error:', error);
    res.status(500).json({ error: 'Failed to delete conference' });
  }
});

// ==================== PAPER ROUTES ====================

// Get all papers
app.get('/api/papers', async (req, res) => {
  try {
    const papers = await Paper.find();
    const papersResponse = papers.map(paper => ({
      id: paper._id,
      title: paper.title,
      abstract: paper.abstract,
      file_url: paper.file_url,
      version: paper.version,
      status: paper.status,
      author_id: paper.author_id,
      conference_id: paper.conference_id
    }));
    res.json(papersResponse);
  } catch (error) {
    console.error('Get papers error:', error);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

// Get papers by conference
app.get('/api/papers/conference/:conferenceId', async (req, res) => {
  try {
    const papers = await Paper.find({ conference_id: req.params.conferenceId });
    const papersResponse = papers.map(paper => ({
      id: paper._id,
      title: paper.title,
      abstract: paper.abstract,
      file_url: paper.file_url,
      version: paper.version,
      status: paper.status,
      author_id: paper.author_id,
      conference_id: paper.conference_id
    }));
    res.json(papersResponse);
  } catch (error) {
    console.error('Get papers by conference error:', error);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

// Submit paper
app.post('/api/papers', async (req, res) => {
  try {
    const newPaper = new Paper(req.body);
    await newPaper.save();

    res.status(201).json({
      id: newPaper._id,
      title: newPaper.title,
      abstract: newPaper.abstract,
      file_url: newPaper.file_url,
      version: newPaper.version,
      status: newPaper.status,
      author_id: newPaper.author_id,
      conference_id: newPaper.conference_id
    });
  } catch (error) {
    console.error('Submit paper error:', error);
    res.status(500).json({ error: 'Failed to submit paper' });
  }
});

// Update paper
app.put('/api/papers/:id', async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    res.json({
      id: paper._id,
      title: paper.title,
      abstract: paper.abstract,
      file_url: paper.file_url,
      version: paper.version,
      status: paper.status,
      author_id: paper.author_id,
      conference_id: paper.conference_id
    });
  } catch (error) {
    console.error('Update paper error:', error);
    res.status(500).json({ error: 'Failed to update paper' });
  }
});

// ==================== INVITATION ROUTES ====================

// Get all invitations
app.get('/api/invitations', async (req, res) => {
  try {
    const invitations = await Invitation.find();
    const invitationsResponse = invitations.map(inv => ({
      id: inv._id,
      orgId: inv.orgId,
      invitedUserId: inv.invitedUserId,
      invitedByUserId: inv.invitedByUserId,
      status: inv.status
    }));
    res.json(invitationsResponse);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get invitations for user
app.get('/api/invitations/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if userId is valid
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.json([]);
    }

    const invitations = await Invitation.find({
      invitedUserId: userId,
      status: 'PENDING'
    });
    const invitationsResponse = invitations.map(inv => ({
      id: inv._id,
      orgId: inv.orgId,
      invitedUserId: inv.invitedUserId,
      invitedByUserId: inv.invitedByUserId,
      status: inv.status
    }));
    res.json(invitationsResponse);
  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Create invitation
app.post('/api/invitations', async (req, res) => {
  try {
    const newInvitation = new Invitation(req.body);
    await newInvitation.save();

    res.status(201).json({
      id: newInvitation._id,
      orgId: newInvitation.orgId,
      invitedUserId: newInvitation.invitedUserId,
      invitedByUserId: newInvitation.invitedByUserId,
      status: newInvitation.status
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Update invitation status
app.put('/api/invitations/:id', async (req, res) => {
  try {
    const invitation = await Invitation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({
      id: invitation._id,
      orgId: invitation.orgId,
      invitedUserId: invitation.invitedUserId,
      invitedByUserId: invitation.invitedByUserId,
      status: invitation.status
    });
  } catch (error) {
    console.error('Update invitation error:', error);
    res.status(500).json({ error: 'Failed to update invitation' });
  }
});

// ==================== REVIEW ROUTES ====================

// Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find();
    const reviewsResponse = reviews.map(review => ({
      id: review._id,
      paper_id: review.paper_id,
      reviewer_id: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      recommendation: review.recommendation
    }));
    res.json(reviewsResponse);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews by paper
app.get('/api/reviews/paper/:paperId', async (req, res) => {
  try {
    const reviews = await Review.find({ paper_id: req.params.paperId });
    const reviewsResponse = reviews.map(review => ({
      id: review._id,
      paper_id: review.paper_id,
      reviewer_id: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      recommendation: review.recommendation
    }));
    res.json(reviewsResponse);
  } catch (error) {
    console.error('Get paper reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review
app.post('/api/reviews', async (req, res) => {
  try {
    const newReview = new Review(req.body);
    await newReview.save();

    res.status(201).json({
      id: newReview._id,
      paper_id: newReview.paper_id,
      reviewer_id: newReview.reviewer_id,
      rating: newReview.rating,
      comment: newReview.comment,
      recommendation: newReview.recommendation
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
app.put('/api/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      id: review._id,
      paper_id: review.paper_id,
      reviewer_id: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      recommendation: review.recommendation
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Confio Backend running on http://localhost:${PORT}`);
});
