const express = require('express');
const cors = require('cors');
const path = require('path');
const dbHelper = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
dbHelper.initDatabase();

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Logo route
app.get('/waste%20recycle%20logo_India.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'waste recycle logo_India.png'));
});

// Submit enquiry
app.post('/api/enquiries', (req, res) => {
  const {
    company_name,
    contact_name,
    email,
    phone,
    waste_volume,
    pickup_location
  } = req.body;

  if (
    !company_name ||
    !contact_name ||
    !email ||
    !phone ||
    !waste_volume ||
    !pickup_location
  ) {
    return res.status(400).json({
      error: 'All required fields must be provided.'
    });
  }

  dbHelper.createEnquiry(req.body, (err, result) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to save enquiry.'
      });
    }

    res.status(201).json({
      success: true,
      tracking_id: result.tracking_id,
      id: result.id
    });
  });
});

// Track enquiry
app.get('/api/track/:tracking_id', (req, res) => {
  dbHelper.getTrackingStatus(req.params.tracking_id, (err, row) => {
    if (err)
      return res.status(500).json({
        error: 'Database error.'
      });

    if (!row)
      return res.status(404).json({
        error: 'Tracking ID not found.'
      });

    res.json(row);
  });
});

// Get all enquiries
app.get('/api/enquiries', (req, res) => {
  dbHelper.getAllEnquiries((err, rows) => {
    if (err)
      return res.status(500).json({
        error: 'Database error.'
      });

    res.json(rows);
  });
});

// Update status
app.patch('/api/enquiries/:id/status', (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      error: 'Status is required.'
    });
  }

  dbHelper.updateStatus(req.params.id, status, (err, changes) => {
    if (err)
      return res.status(500).json({
        error: 'Database error.'
      });

    if (!changes)
      return res.status(404).json({
        error: 'Enquiry not found.'
      });

    res.json({
      success: true
    });
  });
});

// Home page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel exports the app
module.exports = app;

// Local development only
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}