<div class="w-100 rounded-10"><img src="/assets/logos/CONFIO.png"></div>
<div align="center">
  <h1>Confio - Conference Management Platform</h1>
  <p><b>A full-stack academic and professional event management system.</b></p>
</div>

<hr />

<h2>Project Overview</h2>
<p>
  Confio is designed to handle the entire lifecycle of scientific conferences. The platform facilitates multi-role interactions between organizers, authors, and reviewers. It represents a significant architectural evolution, moving from a legacy local-storage system to a persistent, cloud-based MongoDB infrastructure.
</p>
<p>
  The application serves as a central hub for academic organizations to host meetings and conferences, managing everything from initial user registration to the complex pipeline of scientific paper submission and peer review.
</p>

<hr />

<h2>Key Functionalities</h2>

<h3>Authentication and User Management</h3>
<ul>
  <li><b>Role-Based Access Control:</b> Distinct permission levels for Organizers (org/event management), Authors (research submission), and Reviewers (evaluations).</li>
  <li><b>Persistent Sessions:</b> Hybrid management via local UI state and server-side verification.</li>
  <li><b>Security:</b> Implementation of password hashing for credentials and protected frontend routes.</li>
</ul>

<h3>Organizational Architecture</h3>
<ul>
  <li><b>Multi-Tenancy:</b> Users can establish or join multiple organizations, each acting as a unique workspace.</li>
  <li><b>Invitation System:</b> Formal workflow for member acquisition, including tracking and response management.</li>
</ul>

<h3>Conference Operations</h3>
<ul>
  <li><b>Event Types:</b> Native support for Online, Offline, and Hybrid formats.</li>
  <li><b>Real-time Integration:</b> Centralized management of meeting links and scheduling.</li>
  <li><b>Participant Tracking:</b> Granular management of invited attendees and event visibility.</li>
</ul>

<h3>Scientific Submission Pipeline</h3>
<ul>
  <li><b>Paper Lifecycle:</b> Comprehensive upload system for research titles, abstracts, and file references.</li>
  <li><b>Status Tracking:</b> Automated progression through states: Submitted, Under Review, Changes Requested, Accepted, or Rejected.</li>
  <li><b>Review System:</b> Academic reviewer infrastructure for feedback, ratings, and recommendations.</li>
</ul>

<hr />

<h2>Technical Stack</h2>

<table>
  <tr>
    <td width="50%" valign="top">
      <h4>Frontend</h4>
      <ul>
        <li>React 18 (Functional Components)</li>
        <li>TypeScript (Static Typing)</li>
        <li>Tailwind CSS (Utility-first Design)</li>
        <li>React Router Dom (Navigation)</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h4>Backend</h4>
      <ul>
        <li>Node.js & Express</li>
        <li>MongoDB Atlas (Cloud Database)</li>
        <li>Mongoose (ODM/Schema Validation)</li>
      </ul>
    </td>
  </tr>
</table>

<hr />

<h2>Data Models</h2>
<p>The database is structured into five core collections:</p>
<ul>
  <li><b>Users:</b> Profiles, credentials, and roles.</li>
  <li><b>Organizations:</b> Workspace metadata and member associations.</li>
  <li><b>Conferences:</b> Event details, dates, and organizational links.</li>
  <li><b>Papers:</b> Submission metadata, author links, and status.</li>
  <li><b>Invitations:</b> Membership requests between organizations and users.</li>
</ul>

<hr />

<h2>Installation and Configuration</h2>

<h3>Prerequisites</h3>
<ul>
  <li>Node.js v18+</li>
  <li>MongoDB Atlas Connection String</li>
</ul>

<h3>1. Clone the Repository</h3>

```bash
git clone https://github.com/fireteanualex/confio-Conference-Manager.git
cd confio-Conference-Manager
```
<h3>2. Install Dependencies</h3>

```bash
npm install
```
<h3>3. Environment Setup</h3>
<p>Create a <code>.env</code> file in the root directory:</p>

```bash
# Server Configuration
PORT=3001
MONGODB_URI=your_mongodb_connection_string

# Frontend Configuration
VITE_API_URL=http://localhost:3001/api
```

<h3>4. Running the Application</h3>

```bash
npm run dev
```

<hr />
<h2>API Reference</h2>
<ul>
<li><code>POST /api/register</code> - Create a new user account.</li>
<li><code>POST /api/organizations</code> - Establish a new organizational workspace.</li>
<li><code>GET /api/conferences</code> - Retrieve conferences based on user permissions.</li>
<li><code>POST /api/conferences</code> - Initialize a new meeting or conference event.</li>
</ul>
<hr />
<h2>Deployment</h2>
<p>Configured for <b>Render.com</b>:</p>
<p>Render.com Link: <a href="https://confio-frontend.onrender.com/">https://confio-frontend.onrender.com/</a></p>
<ul>
<li><b>Backend:</b> Deploy as a Web Service; connect MongoDB Atlas URI via Environment Variables.</li>
<li><b>Frontend:</b> Deploy as a Static Site; use <code>npm run build</code>; point <code>VITE_API_URL</code> to backend service.</li>
</ul>
<hr />
<div align="center">
<p>Maintained by <a href="https://github.com/fireteanualex">fireteanualex</a> and <a href="https://github.com/Stefannasd">Stefannasd</a></p>
</div>
