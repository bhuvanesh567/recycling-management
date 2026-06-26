const express = require('express');
const cors = require('cors');
const path = require('path');
const dbHelper = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the SQLite database and seed mock data
dbHelper.initDatabase();

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serving public logo if the requested file exists in the parent directory
app.get('/waste%20recycle%20logo_India.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'waste recycle logo_India.png'));
});

// API Routes

// 1. Submit a new B2B Quote / Pickup request
app.post('/api/enquiries', (req, res) => {
  const { company_name, contact_name, email, phone, waste_volume, pickup_location, message } = req.body;

  // Basic validation
  if (!company_name || !contact_name || !email || !phone || !waste_volume || !pickup_location) {
    return res.status(400).json({ error: 'All fields except message are required.' });
  }

  dbHelper.createEnquiry(req.body, (err, result) => {
    if (err) {
      console.error('Error saving enquiry:', err.message);
      return res.status(500).json({ error: 'Database error. Failed to save request.' });
    }
    
    // Return tracking information
    res.status(201).json({
      success: true,
      message: 'Pickup request submitted successfully.',
      tracking_id: result.tracking_id,
      id: result.id
    });
  });
});

// 2. Track order status by tracking ID
app.get('/api/track/:tracking_id', (req, res) => {
  const trackingId = req.params.tracking_id.trim();

  dbHelper.getTrackingStatus(trackingId, (err, row) => {
    if (err) {
      console.error('Error fetching tracking info:', err.message);
      return res.status(500).json({ error: 'Database error occurred during tracking query.' });
    }

    if (!row) {
      return res.status(404).json({ error: `Tracking ID "${trackingId}" not found.` });
    }

    res.json(row);
  });
});

// 3. Admin: Get all enquiries
app.get('/api/enquiries', (req, res) => {
  dbHelper.getAllEnquiries((err, rows) => {
    if (err) {
      console.error('Error fetching enquiries:', err.message);
      return res.status(500).json({ error: 'Database error. Failed to fetch requests.' });
    }
    res.json(rows);
  });
});

// 4. Admin: Update status of an enquiry by ID
app.patch('/api/enquiries/:id/status', (req, res) => {
  const enquiryId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status field is required.' });
  }

  const validStatuses = [
    'Pending Pickup', 
    'In Transit', 
    'Received', 
    'Processing & Data Destruction', 
    'Electro-Refining & Sorting', 
    'Recycled (Certificate Issued)'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status update provided.' });
  }

  dbHelper.updateStatus(enquiryId, status, (err, changes) => {
    if (err) {
      console.error('Error updating status:', err.message);
      return res.status(500).json({ error: 'Database error. Failed to update status.' });
    }

    if (changes === 0) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    res.json({ success: true, message: 'Status updated successfully.', updated_status: status });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` iWaste Recycling India B2B Server is running!`);
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================`);
});
