/**
 * Category Card Accordion — Cyber-Reimu
 * Card grid with cover images, expandable post lists
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  function init() {
    var grid = document.querySelector('.cat-grid');
    if (!grid) return;

    var headers = grid.querySelectorAll('.cat-card-header');
    if (!headers.length) return;

    headers.forEach(function (header) {
      header.style.cursor = 'pointer';
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');

      header.addEventListener('click', function (e) {
        e.preventDefault();
        toggleCard(header);
      });

      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCard(header);
        }
      });
    });
  }

  function toggleCard(header) {
    var card = header.closest('.cat-card');
    if (!card) return;

    var body = card.querySelector('.cat-card-body');
    if (!body) return;

    var isOpen = card.classList.contains('cat-card--open');

    if (isOpen) {
      card.classList.remove('cat-card--open');
      body.style.maxHeight = '0';
    } else {
      var grid = card.closest('.cat-grid');
      if (grid) {
        grid.querySelectorAll('.cat-card--open').forEach(function (c) {
          var b = c.querySelector('.cat-card-body');
          c.classList.remove('cat-card--open');
          if (b) b.style.maxHeight = '0';
        });
      }

      card.classList.add('cat-card--open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
