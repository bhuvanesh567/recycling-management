/* ==========================================================================
   iWaste Recycling India Pvt. Ltd. - Operator Dashboard JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  let enquiriesData = [];
  let volumeChartInstance = null;
  let statusChartInstance = null;

  // DOM Handles
  const tbody = document.getElementById('enquiries-tbody');
  const refreshBtn = document.getElementById('refresh-btn');
  const lastUpdatedSpan = document.getElementById('last-updated');
  const toast = document.getElementById('toast-message');
  const toastText = document.getElementById('toast-text');

  // Stats Handles
  const statTotal = document.getElementById('stat-total');
  const statActive = document.getElementById('stat-active');
  const statPending = document.getElementById('stat-pending');
  const statCompleted = document.getElementById('stat-completed');

  // Initial load
  loadDashboardData();

  refreshBtn.addEventListener('click', () => {
    loadDashboardData();
  });

  async function loadDashboardData() {
    try {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate);">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
            Refreshing registry data...
          </td>
        </tr>
      `;

      const response = await fetch('/api/enquiries');
      if (!response.ok) throw new Error('API server returned error.');
      
      enquiriesData = await response.json();
      
      renderStats();
      renderTable();
      renderCharts();
      
      // Update Timestamp
      lastUpdatedSpan.textContent = `Last Updated: ${new Date().toLocaleTimeString('en-IN')}`;
    } catch (err) {
      console.error('Error loading dashboard:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #e11d48; font-weight: 500;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
            Failed to connect to the operational database server.
          </td>
        </tr>
      `;
    }
  }

  function renderTable() {
    if (enquiriesData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate);">
            No enquiries or pickup requests found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';

    enquiriesData.forEach((row) => {
      const tr = document.createElement('tr');
      
      // Formulate Date String
      const dateStr = new Date(row.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // Map dynamic styles for selects
      let selectClass = 'status-select ';
      if (row.status === 'Pending Pickup') selectClass += 'status-Pending';
      else if (row.status === 'In Transit') selectClass += 'status-Transit';
      else if (row.status === 'Received') selectClass += 'status-Received';
      else if (row.status === 'Processing & Data Destruction') selectClass += 'status-Processing';
      else if (row.status === 'Electro-Refining & Sorting') selectClass += 'status-Refining';
      else if (row.status === 'Recycled (Certificate Issued)') selectClass += 'status-Completed';

      tr.innerHTML = `
        <td><span class="tracking-code">${row.tracking_id}</span></td>
        <td class="company-col">
          <strong>${escapeHtml(row.company_name)}</strong>
          <span>${escapeHtml(row.contact_name)} | ${escapeHtml(row.email)} | ${escapeHtml(row.phone)}</span>
        </td>
        <td><strong>${escapeHtml(row.waste_volume)}</strong></td>
        <td><span><i class="fa-solid fa-location-dot" style="color: var(--color-accent-green); margin-right: 4px;"></i> ${escapeHtml(row.pickup_location)}</span></td>
        <td>${dateStr}</td>
        <td>
          <select class="${selectClass}" data-id="${row.id}">
            <option value="Pending Pickup" ${row.status === 'Pending Pickup' ? 'selected' : ''}>Pending Pickup</option>
            <option value="In Transit" ${row.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
            <option value="Received" ${row.status === 'Received' ? 'selected' : ''}>Received</option>
            <option value="Processing & Data Destruction" ${row.status === 'Processing & Data Destruction' ? 'selected' : ''}>Processing & Data Destruction</option>
            <option value="Electro-Refining & Sorting" ${row.status === 'Electro-Refining & Sorting' ? 'selected' : ''}>Electro-Refining & Sorting</option>
            <option value="Recycled (Certificate Issued)" ${row.status === 'Recycled (Certificate Issued)' ? 'selected' : ''}>Recycled (Certificate Issued)</option>
          </select>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Add event listeners to all status dropdown elements
    document.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        
        await updateStatusAPI(id, newStatus, e.target);
      });
    });
  }

  async function updateStatusAPI(id, status, selectElement) {
    try {
      const response = await fetch(`/api/enquiries/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(`Record updated to "${status}"`);
        
        // Dynamically update the class lists to color the select
        selectElement.className = 'status-select';
        let selectClass = '';
        if (status === 'Pending Pickup') selectClass = 'status-Pending';
        else if (status === 'In Transit') selectClass = 'status-Transit';
        else if (status === 'Received') selectClass = 'status-Received';
        else if (status === 'Processing & Data Destruction') selectClass = 'status-Processing';
        else if (status === 'Electro-Refining & Sorting') selectClass = 'status-Refining';
        else if (status === 'Recycled (Certificate Issued)') selectClass = 'status-Completed';
        selectElement.classList.add(selectClass);

        // Update local object array to keep charts and stats synced without reloading whole list
        const item = enquiriesData.find(x => x.id === parseInt(id));
        if (item) {
          item.status = status;
          item.updated_at = new Date().toISOString();
        }
        
        renderStats();
        renderCharts();
      } else {
        alert(result.error || 'Failed to update status.');
        loadDashboardData(); // Reload to restore table status state
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Unable to reach the backend server.');
      loadDashboardData();
    }
  }

  function renderStats() {
    statTotal.textContent = enquiriesData.length;
    
    const pending = enquiriesData.filter(x => x.status === 'Pending Pickup').length;
    const completed = enquiriesData.filter(x => x.status === 'Recycled (Certificate Issued)').length;
    const active = enquiriesData.length - (pending + completed);

    statPending.textContent = pending;
    statCompleted.textContent = completed;
    statActive.textContent = active;
  }

  function renderCharts() {
    // 1. Process Volume Breakdown Data
    const volumes = { '< 500 kg': 0, '500-2000 kg': 0, '2-5 Tons': 0, '5+ Tons': 0 };
    enquiriesData.forEach(row => {
      if (volumes[row.waste_volume] !== undefined) {
        volumes[row.waste_volume]++;
      }
    });

    const volCtx = document.getElementById('volumeChart').getContext('2d');
    if (volumeChartInstance) volumeChartInstance.destroy();
    
    volumeChartInstance = new Chart(volCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(volumes),
        datasets: [{
          data: Object.values(volumes),
          backgroundColor: ['#d8f3dc', '#b7e4c7', '#52b788', '#1b4d32'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });

    // 2. Stages Pipeline Data
    const pipeline = {
      'Pending': enquiriesData.filter(x => x.status === 'Pending Pickup').length,
      'Transit': enquiriesData.filter(x => x.status === 'In Transit').length,
      'Received': enquiriesData.filter(x => x.status === 'Received').length,
      'Processing': enquiriesData.filter(x => x.status === 'Processing & Data Destruction').length,
      'Sorting': enquiriesData.filter(x => x.status === 'Electro-Refining & Sorting').length,
      'Recycled': enquiriesData.filter(x => x.status === 'Recycled (Certificate Issued)').length
    };

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(statusCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(pipeline),
        datasets: [{
          label: 'Active Shipments',
          data: Object.values(pipeline),
          backgroundColor: '#38b000',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { family: 'Inter', size: 10 } }
          },
          x: {
            ticks: { font: { family: 'Inter', size: 10 } }
          }
        }
      }
    });
  }

  function showToast(text) {
    toastText.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Escape HTML helper to prevent XSS injection
  function escapeHtml(string) {
    if (!string) return '';
    return String(string).replace(/[&<>"']/g, function (s) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[s];
    });
  }
});
