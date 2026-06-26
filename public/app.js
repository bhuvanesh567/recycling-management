/* ==========================================================================
   iWaste Recycling India Pvt. Ltd. - Client Application JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // 0. Background Slideshow Logic
  const slides = document.querySelectorAll('.hero-slide');
  let currentSlide = 0;
  
  function nextSlide() {
    if (slides.length > 0) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }
  }
  
  // Cycle background every 6 seconds (aligns with 8s CSS zoom transition)
  setInterval(nextSlide, 6000);

  // 1. Sticky Navigation Bar Scroll Effect
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-links a');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Highlight Active Link on Scroll
    let current = '';
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === `#${current}`) {
        a.classList.add('active');
      }
    });
  });

  // 2. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinksMenu = document.getElementById('nav-links');
  
  mobileToggle.addEventListener('click', () => {
    navLinksMenu.classList.toggle('active');
    const icon = mobileToggle.querySelector('i');
    if (navLinksMenu.classList.contains('active')) {
      icon.className = 'fa-solid fa-xmark';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  });

  // Close mobile menu when a link is clicked
  navLinksMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinksMenu.classList.remove('active');
      mobileToggle.querySelector('i').className = 'fa-solid fa-bars';
    });
  });

  // 3. Request for Quote (RFQ) Form Submission
  const rfqForm = document.getElementById('rfq-form');
  const successModal = document.getElementById('rfq-success');
  const assignedTrackingSpan = document.getElementById('assigned-tracking-id');
  const closeSuccessBtn = document.getElementById('close-success-btn');

  rfqForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      company_name: document.getElementById('company_name').value.trim(),
      contact_name: document.getElementById('contact_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      waste_volume: document.getElementById('waste_volume').value,
      pickup_location: document.getElementById('pickup_location').value.trim(),
      message: document.getElementById('message').value.trim()
    };

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Show success modal & display tracking ID
        assignedTrackingSpan.textContent = result.tracking_id;
        successModal.classList.remove('hidden');
        rfqForm.reset();
        
        // Auto scroll slightly to ensure the modal is in full view
        successModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        alert(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting RFQ:', err);
      alert('Unable to connect to the recycling server. Please try again later.');
    }
  });

  closeSuccessBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
  });

  // 4. Order Tracking System
  const trackingForm = document.getElementById('tracking-form');
  const trackingInput = document.getElementById('tracking-input');
  const trackingResult = document.getElementById('tracking-result');
  const trackingError = document.getElementById('tracking-error');
  const errorMessage = document.getElementById('error-message');

  // Interactive timeline DOM handles
  const stepPending = document.getElementById('step-pending');
  const stepTransit = document.getElementById('step-transit');
  const stepReceived = document.getElementById('step-received');
  const stepProcessing = document.getElementById('step-processing');
  const stepRecycling = document.getElementById('step-recycling');
  const stepCompleted = document.getElementById('step-completed');

  const datePending = document.getElementById('date-pending');
  const dateTransit = document.getElementById('date-transit');
  const dateReceived = document.getElementById('date-received');
  const dateProcessing = document.getElementById('date-processing');
  const dateRecycling = document.getElementById('date-recycling');
  const dateCompleted = document.getElementById('date-completed');

  const certArea = document.getElementById('cert-area');

  // Submit Handler for tracking
  trackingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trackingId = trackingInput.value.trim();
    if (!trackingId) return;

    await queryTracking(trackingId);
  });

  // Quick Demo Links handler
  const demoLinks = document.querySelectorAll('.search-tip strong');
  demoLinks.forEach(demoLink => {
    demoLink.addEventListener('click', async () => {
      const code = demoLink.textContent;
      trackingInput.value = code;
      await queryTracking(code);
      trackingResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  async function queryTracking(id) {
    // Reset views
    trackingResult.classList.add('hidden');
    trackingError.classList.add('hidden');

    try {
      const response = await fetch(`/api/track/${encodeURIComponent(id)}`);
      const data = await response.json();

      if (response.ok) {
        renderTrackingResult(data);
      } else {
        errorMessage.textContent = data.error || 'Tracking ID not found.';
        trackingError.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error fetching tracking info:', err);
      errorMessage.textContent = 'Server connection failed. Could not retrieve tracking status.';
      trackingError.classList.remove('hidden');
    }
  }

  function renderTrackingResult(order) {
    // Populate header info
    document.getElementById('res-tracking-id').textContent = order.tracking_id;
    document.getElementById('res-company-name').textContent = order.company_name;
    
    const badge = document.getElementById('res-status-badge');
    badge.textContent = order.status;

    // Reset timeline classes
    const steps = [stepPending, stepTransit, stepReceived, stepProcessing, stepRecycling, stepCompleted];
    steps.forEach(s => {
      s.classList.remove('active-step', 'completed-step');
    });

    const dates = [datePending, dateTransit, dateReceived, dateProcessing, dateRecycling, dateCompleted];
    dates.forEach(d => d.textContent = '--');
    certArea.style.display = 'none';

    // Format timestamps
    const createdDate = formatDate(order.created_at);
    const updatedDate = formatDate(order.updated_at);

    // Map database statuses to timeline indices
    // 0: Pending Pickup
    // 1: In Transit
    // 2: Received at Vijayawada Facility
    // 3: Processing & Data Destruction
    // 4: Electro-Refining & Sorting
    // 5: Recycled (Certificate Issued)
    let activeIdx = 0;
    const status = order.status;

    if (status === 'Pending Pickup') {
      activeIdx = 0;
      datePending.textContent = createdDate;
    } else if (status === 'In Transit') {
      activeIdx = 1;
      datePending.textContent = createdDate;
      dateTransit.textContent = updatedDate;
    } else if (status === 'Received') {
      activeIdx = 2;
      datePending.textContent = createdDate;
      dateTransit.textContent = formatDateAddDays(order.created_at, 2);
      dateReceived.textContent = updatedDate;
    } else if (status === 'Processing & Data Destruction') {
      activeIdx = 3;
      datePending.textContent = createdDate;
      dateTransit.textContent = formatDateAddDays(order.created_at, 2);
      dateReceived.textContent = formatDateAddDays(order.created_at, 4);
      dateProcessing.textContent = updatedDate;
    } else if (status === 'Electro-Refining & Sorting') {
      activeIdx = 4;
      datePending.textContent = createdDate;
      dateTransit.textContent = formatDateAddDays(order.created_at, 2);
      dateReceived.textContent = formatDateAddDays(order.created_at, 4);
      dateProcessing.textContent = formatDateAddDays(order.created_at, 7);
      dateRecycling.textContent = updatedDate;
    } else if (status === 'Recycled (Certificate Issued)') {
      activeIdx = 5;
      datePending.textContent = createdDate;
      dateTransit.textContent = formatDateAddDays(order.created_at, 2);
      dateReceived.textContent = formatDateAddDays(order.created_at, 4);
      dateProcessing.textContent = formatDateAddDays(order.created_at, 7);
      dateRecycling.textContent = formatDateAddDays(order.created_at, 12);
      dateCompleted.textContent = updatedDate;
      certArea.style.display = 'block'; // Show download cert button
    }

    // Apply active and completed styling classes
    steps.forEach((step, idx) => {
      if (idx < activeIdx) {
        step.classList.add('completed-step');
      } else if (idx === activeIdx) {
        step.classList.add('active-step');
      }
    });

    // Make result visible
    trackingResult.classList.remove('hidden');
  }

  // Date Formatting Helpers
  function formatDate(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDateAddDays(isoString, days) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' (Est.)';
  }
});
