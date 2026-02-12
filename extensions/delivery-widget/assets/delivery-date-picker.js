/**
 * Delivery Date Pro - Storefront date picker + add-ons
 * Fetches available dates from app proxy, uses Flatpickr, saves as line item property "Delivery Date".
 * Fetches add-ons and adds selected add-on variants to cart with main product on submit.
 */
(function () {
  const PROP = 'Delivery Date';
  const proxyPrefix = '/apps/delivery';

  function getContainer() {
    return document.querySelector('.delivery-date-pro');
  }
  function getInput() {
    return document.getElementById('delivery-date-pro-input');
  }
  function getErrorEl() {
    return document.getElementById('delivery-date-pro-error');
  }
  function getAddOnsContainer() {
    return document.getElementById('delivery-date-pro-addons');
  }
  function getAddOnsListEl() {
    return document.getElementById('delivery-date-pro-addons-list');
  }
  function showError(msg) {
    const el = getErrorEl();
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  }
  function clearError() {
    const el = getErrorEl();
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function getShop() {
    const c = getContainer();
    return c && c.getAttribute('data-shop');
  }
  function getProductId() {
    const c = getContainer();
    const id = c && c.getAttribute('data-product-id');
    return id && id !== '' ? id : null;
  }

  function getProxyPrefix() {
    const addons = getAddOnsContainer();
    if (addons) return addons.getAttribute('data-proxy-prefix') || proxyPrefix;
    return proxyPrefix;
  }

  function fetchAddOns() {
    var shop = getShop();
    if (!shop) return Promise.resolve([]);
    var prefix = getProxyPrefix();
    var url = prefix + '/add-ons?shop=' + encodeURIComponent(shop);
    return fetch(url).then(function (res) {
      if (!res.ok) return [];
      return res.json().then(function (data) { return data.addOns || []; });
    }).catch(function () { return []; });
  }

  function renderAddOns(addOns) {
    var list = getAddOnsListEl();
    if (!list || !addOns || addOns.length === 0) return;
    list.innerHTML = '';
    addOns.forEach(function (addOn) {
      var label = document.createElement('label');
      label.className = 'delivery-date-pro__addon';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'delivery_date_pro_addon';
      cb.value = addOn.variantId;
      cb.setAttribute('data-addon-id', addOn.id);
      cb.setAttribute('data-addon-name', addOn.name);
      cb.setAttribute('data-addon-price', String(addOn.price));
      var text = document.createTextNode(addOn.name + ' (+' + formatMoney(addOn.price) + ')');
      label.appendChild(cb);
      label.appendChild(text);
      list.appendChild(label);
    });
  }

  function formatMoney(price) {
    return typeof price === 'number' ? '$' + price.toFixed(2) : '$0.00';
  }

  function getSelectedDeliveryDate() {
    var input = getInput();
    if (!input || !input.value) return null;
    return input.value.trim();
  }

  function variantIdForCart(val) {
    if (typeof val !== 'string') return val;
    var match = val.match(/ProductVariant\/(\d+)/);
    return match ? match[1] : val;
  }

  function getSelectedAddOnVariantIds() {
    var list = document.querySelectorAll('input[name="delivery_date_pro_addon"]:checked');
    var ids = [];
    list.forEach(function (el) { ids.push(variantIdForCart(el.value)); });
    return ids;
  }

  function interceptAddToCartForm() {
    var form = document.querySelector('form[action*="/cart/add"]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      var addonsContainer = getAddOnsContainer();
      var selectedAddOns = addonsContainer ? getSelectedAddOnVariantIds() : [];
      var deliveryDate = getSelectedDeliveryDate();
      var mainVariantInput = form.querySelector('input[name="id"]');
      var mainVariantId = mainVariantInput ? mainVariantInput.value : null;
      var qtyInput = form.querySelector('input[name="quantity"]');
      var quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
      if (!mainVariantId) return;
      var items = [];
      var mainItem = { id: mainVariantId, quantity: quantity };
      if (deliveryDate) mainItem.properties = { 'Delivery Date': deliveryDate };
      items.push(mainItem);
      selectedAddOns.forEach(function (variantId) {
        items.push({ id: variantId, quantity: 1 });
      });
      var useIntercept = items.length > 1 || (deliveryDate && selectedAddOns.length > 0);
      if (!useIntercept) return;
      e.preventDefault();
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); }).then(function (result) {
        if (result.ok) {
          window.location.href = '/cart';
        } else {
          showError(result.data && result.data.description ? result.data.description : 'Could not add to cart. Please try again.');
        }
      }).catch(function () {
        showError('Could not add to cart. Please try again.');
      });
    });
  }

  function fetchAvailableDates() {
    const shop = getShop();
    if (!shop) return Promise.reject(new Error('Missing shop'));
    const productId = getProductId();
    const url = proxyPrefix + '/available-dates?shop=' + encodeURIComponent(shop) +
      (productId ? '&product_id=' + encodeURIComponent(productId) : '');
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load dates');
      return res.json();
    });
  }

  function validateDate(deliveryDate) {
    const shop = getShop();
    if (!shop) return Promise.reject(new Error('Missing shop'));
    const productId = getProductId();
    var url = proxyPrefix + '/validate-date?shop=' + encodeURIComponent(shop);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryDate: deliveryDate, productId: productId })
    }).then(function (res) { return res.json(); });
  }

  function addPropertyToAddToCartForm(value) {
    var form = document.querySelector('form[action*="/cart/add"]');
    if (!form) return;
    var existing = form.querySelector('input[name="properties[' + PROP + ']"]');
    if (existing) existing.value = value;
    else {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'properties[' + PROP + ']';
      input.value = value;
      form.appendChild(input);
    }
  }

  function initFlatpickr(availableDates, excludedDates, nextValidDate, disabledReasons) {
    var input = getInput();
    if (!input || typeof window.flatpickr === 'undefined') return;
    var fp = window.flatpickr(input, {
      dateFormat: 'Y-m-d',
      allowInput: false,
      disable: [
        function (date) {
          var d = window.flatpickr.formatDate(date, 'Y-m-d');
          if (excludedDates && excludedDates.indexOf(d) !== -1) return true;
          return false;
        }
      ],
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        var d = dayElem.dateObj;
        var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
        var key = y + '-' + m + '-' + day;
        if (excludedDates && excludedDates.indexOf(key) !== -1) {
          dayElem.classList.add('flatpickr-disabled');
          var reason = disabledReasons && disabledReasons[key];
          if (reason) dayElem.title = reason;
        }
      },
      onChange: function (selected, dateStr) {
        clearError();
        if (!dateStr) return;
        addPropertyToAddToCartForm(dateStr);
        validateDate(dateStr).then(function (data) {
          if (data && !data.valid) {
            showError(data.reason || 'This date is not available');
            if (input) input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    });
    if (nextValidDate) {
      fp.setDate(nextValidDate, false);
      addPropertyToAddToCartForm(nextValidDate);
    }
  }

  function run() {
    var container = getContainer();
    if (!container) return;
    if (typeof window.flatpickr === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
      s.onload = loadAndInit;
      document.head.appendChild(s);
    } else {
      loadAndInit();
    }
  }
  function loadAndInit() {
    fetchAvailableDates()
      .then(function (data) {
        clearError();
        var availableDates = data.availableDates || [];
        var excludedDates = data.excludedDates || [];
        var nextValidDate = data.nextValidDate || null;
        var excludedReasons = data.excludedReasons || {};
        initFlatpickr(availableDates, excludedDates, nextValidDate, excludedReasons);
      })
      .catch(function (err) {
        showError('Unable to load delivery dates. Please refresh the page.');
      });
    if (getAddOnsContainer()) {
      fetchAddOns().then(renderAddOns);
      interceptAddToCartForm();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
