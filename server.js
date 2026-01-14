
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory data store (simulating the PostgreSQL database recommended in the ERD)
let users = [
  { id: 1, name: 'Alex', surname: 'Organizer', email: 'alex@confio.com', role: 'ORGANIZER', profilePicture: 'https://picsum.photos/200', isConfirmed: true },
  { id: 2, name: 'Sam', surname: 'Reviewer', email: 'sam@confio.com', role: 'REVIEWER', profilePicture: 'https://picsum.photos/201', isConfirmed: true },
  { id: 3, name: 'Jordan', surname: 'Author', email: 'jordan@confio.com', role: 'AUTHOR', profilePicture: 'https://picsum.photos/202', isConfirmed: true },
];

let organizations = [];
let conferences = [];
let invitations = [];

// API Routes
app.get('/api/users', (req, res) => res.json(users));

app.post('/api/register', (req, res) => {
  const newUser = { ...req.body, id: Date.now(), isConfirmed: false };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.post('/api/organizations', (req, res) => {
  const newOrg = { ...req.body, id: Date.now(), memberIds: [] };
  organizations.push(newOrg);
  res.status(201).json(newOrg);
});

app.get('/api/organizations', (req, res) => res.json(organizations));

app.get('/api/conferences', (req, res) => res.json(conferences));

app.post('/api/conferences', (req, res) => {
  const newConf = { ...req.body, id: Date.now(), attendeeIds: [] };
  conferences.push(newConf);
  res.status(201).json(newConf);
});

app.listen(PORT, () => {
  console.log(`Confio Backend running on http://localhost:${PORT}`);
});
