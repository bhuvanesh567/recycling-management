const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'iwaste.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Initialize database schema
function initDatabase() {
  db.serialize(() => {
    // Create Enquiries & Order Tracking table
    db.run(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        waste_volume TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'Pending Pickup',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating enquiries table:', err.message);
      } else {
        console.log('Enquiries table checked/created.');
        seedMockData();
      }
    });
  });
}

// Seed the database with initial mock enquiries for demo/testing purposes
function seedMockData() {
  db.get('SELECT COUNT(*) as count FROM enquiries', [], (err, row) => {
    if (err) {
      console.error('Error checking enquiry count:', err.message);
      return;
    }

    if (row.count === 0) {
      const mockRecords = [
        {
          tracking_id: 'IW-IND-9201',
          company_name: 'Tech Mahindra Ltd.',
          contact_name: 'Ramesh Chenoy',
          email: 'ramesh.c@techmahindra.com',
          phone: '+91 98480 22331',
          waste_volume: '500-2000 kg',
          pickup_location: 'Hitec City, Hyderabad',
          message: 'Bulk disposal of obsolete development servers and office desktop monitors.',
          status: 'Pending Pickup',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        {
          tracking_id: 'IW-IND-1052',
          company_name: 'Andhra University Campus',
          contact_name: 'Dr. V. S. Rao',
          email: 'vsrao@andhrauniversity.edu.in',
          phone: '+91 94401 55667',
          waste_volume: '2-5 Tons',
          pickup_location: 'Visakhapatnam Campus',
          message: 'Lab upgrade waste including CRT monitors, oscilloscopes, and legacy CPUs.',
          status: 'In Transit',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
        },
        {
          tracking_id: 'IW-IND-4820',
          company_name: 'Wipro Technologies',
          contact_name: 'Anjali Sharma',
          email: 'sustainability@wipro.com',
          phone: '+91 80284 39000',
          waste_volume: '5+ Tons',
          pickup_location: 'Gachibowli campus, Hyderabad',
          message: 'Corporate asset decommissioning: 350+ laptops with secure data destruction certificates required.',
          status: 'Processing & Data Destruction',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        },
        {
          tracking_id: 'IW-IND-7391',
          company_name: 'KL University',
          contact_name: 'Prof. K. Satyanarayana',
          email: 'estate.manager@kluniversity.in',
          phone: '+91 86323 99999',
          waste_volume: '500-2000 kg',
          pickup_location: 'Vaddeswaram, Vijayawada',
          message: 'Disposal of 150 dead UPS lead-acid batteries and network switches.',
          status: 'Recycled (Certificate Issued)',
          created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString() // 18 days ago
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO enquiries (
          tracking_id, company_name, contact_name, email, phone, waste_volume, pickup_location, message, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      mockRecords.forEach((record) => {
        stmt.run(
          record.tracking_id,
          record.company_name,
          record.contact_name,
          record.email,
          record.phone,
          record.waste_volume,
          record.pickup_location,
          record.message,
          record.status,
          record.created_at,
          record.created_at // Use same time for updated_at initially
        );
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('Error seeding data:', err.message);
        } else {
          console.log('Mock records successfully seeded.');
        }
      });
    } else {
      console.log('Database already has records, seeding skipped.');
    }
  });
}

// Database Helper functions
module.exports = {
  db,
  initDatabase,
  
  // Submit new B2B Request for Quote / Pickup
  createEnquiry: (data, callback) => {
    const trackingId = 'IW-IND-' + Math.floor(1000 + Math.random() * 9000);
    const sql = `
      INSERT INTO enquiries (
        tracking_id, company_name, contact_name, email, phone, waste_volume, pickup_location, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      trackingId,
      data.company_name,
      data.contact_name,
      data.email,
      data.phone,
      data.waste_volume,
      data.pickup_location,
      data.message || '',
      'Pending Pickup'
    ];

    db.run(sql, params, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, { id: this.lastID, tracking_id: trackingId });
    });
  },

  // Get tracking status by ID
  getTrackingStatus: (trackingId, callback) => {
    const sql = `SELECT * FROM enquiries WHERE tracking_id = ?`;
    db.get(sql, [trackingId], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  },

  // Get all enquiries (for Admin view)
  getAllEnquiries: (callback) => {
    const sql = `SELECT * FROM enquiries ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  },

  // Update tracking status (for Admin action)
  updateStatus: (id, status, callback) => {
    const sql = `
      UPDATE enquiries 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    db.run(sql, [status, id], function (err) {
      if (err) return callback(err);
      callback(null, this.changes);
    });
  }
};
