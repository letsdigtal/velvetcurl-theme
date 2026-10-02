/* VelvetCurl demo theme — interactivity
   Cart drawer (AJAX), quick add, quantity steppers, mobile menu, testimonial slider, gallery. */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  /* ---------------- Helpers ---------------- */
  function money(cents) {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  /* ---------------- Cart drawer ---------------- */
  var drawer = document.getElementById('CartDrawer');
  var cartCountEls = document.querySelectorAll('[data-cart-count]');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderCart();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-cart-open]').forEach(function (btn) {
    btn.addEventListener('click', openDrawer);
  });
  document.querySelectorAll('[data-cart-close]').forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDrawer();
      closeMobileMenu();
    }
  });

  function renderCart() {
    var itemsEl = drawer.querySelector('[data-cart-items]');
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        cartCountEls.forEach(function (el) { el.textContent = cart.item_count; });
        var subtotalEl = drawer.querySelector('[data-cart-subtotal]');
        if (subtotalEl) subtotalEl.textContent = money(cart.total_price);

        if (!cart.items.length) {
          itemsEl.innerHTML = '<div class="cart-drawer__empty"><p>Your cart is empty.</p></div>';
          return;
        }
        itemsEl.innerHTML = cart.items.map(function (item, i) {
          var img = item.image
            ? '<img src="' + item.image.replace(/(\.[a-z]+)$/, '_200x$1') + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
            : '';
          var variant = item.variant_title && item.variant_title.indexOf('Default') === -1
            ? '<p class="cart-line__variant">' + escapeHtml(item.variant_title) + '</p>' : '';
          return (
            '<div class="cart-line">' +
              '<a class="cart-line__media" href="' + item.url + '">' + img + '</a>' +
              '<div class="cart-line__info">' +
                '<p class="cart-line__title"><a href="' + item.url + '">' + escapeHtml(item.product_title) + '</a></p>' +
                variant +
                '<div class="cart-line__row">' +
                  '<span class="cart-line__qty">' +
                    '<button type="button" data-line="' + (i + 1) + '" data-qty="-1" aria-label="Decrease">−</button>' +
                    '<span>' + item.quantity + '</span>' +
                    '<button type="button" data-line="' + (i + 1) + '" data-qty="1" aria-label="Increase">+</button>' +
                  '</span>' +
                  '<span class="cart-line__price">' + money(item.final_line_price) + '</span>' +
                '</div>' +
                '<button type="button" class="cart-line__remove" data-line="' + (i + 1) + '" data-qty="0">Remove</button>' +
              '</div>' +
            '</div>'
          );
        }).join('');

        itemsEl.querySelectorAll('[data-line]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var line = parseInt(btn.getAttribute('data-line'), 10);
            var delta = parseInt(btn.getAttribute('data-qty'), 10);
            var current = parseInt(btn.closest('.cart-line').querySelector('.cart-line__qty span').textContent, 10) || 1;
            updateLine(line, delta === 0 ? 0 : current + delta);
          });
        });
      })
      .catch(function () { /* leave drawer as-is on network failure */ });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateLine(line, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: line, quantity: Math.max(0, quantity) })
    }).then(function () { renderCart(); });
  }

  function addToCart(id, quantity, button) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, quantity: quantity || 1 })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('add failed');
        return r.json();
      })
      .then(function () {
        openDrawer();
        if (button) {
          var msg = button.closest('form') ? button.closest('form').querySelector('[data-added-message]') : null;
          if (msg) { msg.hidden = false; setTimeout(function () { msg.hidden = true; }, 2500); }
        }
      })
      .catch(function () {
        // Fallback: submit natively if AJAX fails
        if (button && button.form) button.form.submit();
      });
  }

  /* Product form (main-product) */
  document.querySelectorAll('form[data-product-form]').forEach(function (form) {
    var variantsEl = form.querySelector('[data-variants]');
    var idInput = form.querySelector('[data-variant-id]');

    if (variantsEl && idInput) {
      var variants = JSON.parse(variantsEl.textContent);
      form.querySelectorAll('input[type="radio"][data-option-position]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          var selected = {};
          form.querySelectorAll('input[type="radio"][data-option-position]:checked').forEach(function (r) {
            selected[r.getAttribute('data-option-position')] = r.value;
          });
          var match = variants.find(function (v) {
            return v.options.every(function (opt, i) {
              return String(selected[String(i + 1)] || '') === String(opt);
            });
          });
          if (match) idInput.value = match.id;
        });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var qtyInput = form.querySelector('[data-quantity-input]');
      var id = idInput ? idInput.value : null;
      var btn = form.querySelector('[data-add-to-cart]');
      if (!id) { form.submit(); return; }
      addToCart(id, qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1, btn);
    });
  });

  /* Quick-add forms (product cards) */
  document.querySelectorAll('form[data-quick-add]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = form.querySelector('input[name="id"]').value;
      addToCart(id, 1, form.querySelector('button[type="submit"]'));
    });
  });

  /* ---------------- Quantity steppers ---------------- */
  document.querySelectorAll('[data-quantity]').forEach(function (wrap) {
    var input = wrap.querySelector('[data-quantity-input]');
    var minus = wrap.querySelector('[data-quantity-minus]');
    var plus = wrap.querySelector('[data-quantity-plus]');
    if (minus) minus.addEventListener('click', function () {
      input.value = Math.max(parseInt(input.min || '1', 10), (parseInt(input.value, 10) || 1) - 1);
    });
    if (plus) plus.addEventListener('click', function () {
      input.value = (parseInt(input.value, 10) || 1) + 1;
    });
  });

  /* ---------------- Mobile menu ---------------- */
  var mobileMenu = document.getElementById('MobileMenu');
  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-mobile-menu-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  });
  document.querySelectorAll('[data-mobile-menu-close]').forEach(function (el) {
    el.addEventListener('click', closeMobileMenu);
  });

  /* ---------------- Testimonial slider ---------------- */
  document.querySelectorAll('[data-testimonial-slider]').forEach(function (slider) {
    var quotes = slider.querySelectorAll('.testimonial__quote');
    var dots = slider.querySelectorAll('[data-testimonial-dot]');
    function show(index) {
      quotes.forEach(function (q, i) { q.classList.toggle('is-active', i === index); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(parseInt(dot.getAttribute('data-testimonial-dot'), 10));
      });
    });
    if (quotes.length > 1) {
      var current = 0;
      setInterval(function () {
        current = (current + 1) % quotes.length;
        show(current);
      }, 7000);
    }
  });

  /* ---------------- Product gallery thumbnails ---------------- */
  document.querySelectorAll('[data-product-gallery]').forEach(function (gallery) {
    var main = gallery.querySelector('[data-gallery-main]');
    gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.getAttribute('data-gallery-thumb');
        gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });
  });

  /* ---------------- Collection sort ---------------- */
  var sortSelect = document.querySelector('[data-sort-select]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }
})();
