/* Denver Majestic Limousines — multi-step booking form */
(function () {
  'use strict';

  var form = document.querySelector('#bookingForm');
  if (!form) return;

  var panels = Array.prototype.slice.call(form.querySelectorAll('.form-panel'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.form-step-dot'));
  var current = 0;

  function validatePanel(panel) {
    var fields = panel.querySelectorAll('.field');
    var valid = true;
    fields.forEach(function (field) {
      var input = field.querySelector('.input, input, select, textarea');
      if (!input) return;
      if (!input.checkValidity()) {
        valid = false;
        field.classList.add('has-error');
      } else {
        field.classList.remove('has-error');
      }
    });
    return valid;
  }

  function showStep(index, scroll) {
    panels.forEach(function (p, i) { p.classList.toggle('is-active', i === index); });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === index);
      d.classList.toggle('is-done', i < index);
    });
    current = index;
    if (scroll) {
      var head = document.querySelector('#bookingFormTop');
      if (head) head.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  form.querySelectorAll('[data-step-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!validatePanel(panels[current])) {
        var firstError = panels[current].querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        return;
      }
      if (current < panels.length - 1) showStep(current + 1, true);
    });
  });

  form.querySelectorAll('[data-step-prev]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (current > 0) showStep(current - 1, true);
    });
  });

  /* Pre-fill from the hero quote widget: prefer the query string
     (e.g. booking.html?vehicle=s-class), but fall back to the
     sessionStorage draft main.js stashed before navigating, in case a
     host/dev-server rewrite stripped the query string along the way. */
  var params = new URLSearchParams(window.location.search);
  var draft = {};
  try { draft = JSON.parse(sessionStorage.getItem('dmlQuoteDraft') || '{}'); } catch (e) { draft = {}; }
  function getQuoteValue(key) {
    var fromUrl = params.get(key);
    return fromUrl != null && fromUrl !== '' ? fromUrl : (draft[key] || '');
  }

  var vehicleParam = getQuoteValue('vehicle');
  var serviceParam = getQuoteValue('service');
  if (vehicleParam) {
    var vehicleInput = form.querySelector('input[name="vehicle"][value="' + vehicleParam + '"]');
    if (vehicleInput) vehicleInput.checked = true;
  }
  if (serviceParam) {
    var serviceInput = form.querySelector('input[name="serviceType"][value="' + serviceParam + '"]');
    if (serviceInput) serviceInput.checked = true;
  }

  var fieldMap = {
    pickupDate: '#pickupDate',
    pickupTime: '#pickupTime',
    pickupLocation: '#pickupLocation',
    dropoffLocation: '#dropoffLocation'
  };
  Object.keys(fieldMap).forEach(function (key) {
    var value = getQuoteValue(key);
    if (!value) return;
    var el = form.querySelector(fieldMap[key]);
    if (el) el.value = value;
  });
  var duration = getQuoteValue('duration');
  if (duration) {
    var dropoffEl = form.querySelector('#dropoffLocation');
    if (dropoffEl && !dropoffEl.value) dropoffEl.value = 'As Directed (' + duration + ')';
  }
  try { sessionStorage.removeItem('dmlQuoteDraft'); } catch (e) { /* ignore */ }

  var dateInput = form.querySelector('input[type="date"]');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  showStep(0, false);
})();
