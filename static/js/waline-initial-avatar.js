/**
 * Lightweight Waline initials avatars.
 * Replaces remote default avatars with a local, nickname-based badge.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var initialized = false;
  var observer = null;
  var inputTimer = null;
  var fetchPatched = false;

  function isWalineApi(input) {
    var rawUrl = typeof input === 'string' ? input : input && input.url;
    if (!rawUrl) return false;

    try {
      var url = new URL(rawUrl, window.location.href);
      return /\/(?:api\/)?(?:comment|user)(?:\/|$)/.test(url.pathname);
    } catch (e) {
      return false;
    }
  }

  function stripAvatars(value) {
    if (!value || typeof value !== 'object') return value;

    if (Array.isArray(value)) {
      value.forEach(stripAvatars);
      return value;
    }

    if (Object.prototype.hasOwnProperty.call(value, 'avatar')) {
      value.avatar = '';
    }

    Object.keys(value).forEach(function (key) {
      stripAvatars(value[key]);
    });

    return value;
  }

  function patchWalineFetch() {
    if (fetchPatched || !window.fetch || !window.Response || !window.Headers) return;

    var originalFetch = window.fetch.bind(window);
    fetchPatched = true;

    window.fetch = function () {
      var input = arguments[0];
      var args = arguments;

      return originalFetch.apply(window, args).then(function (response) {
        if (!isWalineApi(input)) return response;

        var contentType = response.headers.get('content-type') || '';
        if (contentType.indexOf('application/json') === -1) return response;

        return response.clone().json().then(function (data) {
          var headers = new Headers(response.headers);
          headers.delete('content-length');
          headers.delete('content-encoding');

          return new Response(JSON.stringify(stripAvatars(data)), {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          });
        }).catch(function () {
          return response;
        });
      });
    };
  }

  function firstGrapheme(value) {
    var text = String(value || '').trim();
    if (!text) return '?';

    var cleaned = text.replace(/^@+/, '').trim();
    if (!cleaned) return '?';

    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      var first = segmenter.segment(cleaned)[Symbol.iterator]().next();
      if (!first.done && first.value && first.value.segment) {
        return first.value.segment.toUpperCase();
      }
    }

    return Array.from(cleaned)[0].toUpperCase();
  }

  function colorIndex(seed) {
    var hash = 0;
    var text = String(seed || '');
    for (var i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash % 6;
  }

  function makeAvatar(name) {
    var avatar = document.createElement('span');
    avatar.className = 'wl-initial-avatar wl-initial-avatar--' + colorIndex(name);
    avatar.textContent = firstGrapheme(name);
    avatar.setAttribute('aria-hidden', 'true');
    return avatar;
  }

  function nickFromCard(card) {
    var nick = card.querySelector('.wl-card > .wl-head .wl-nick');
    return nick ? nick.textContent.trim() : '';
  }

  function disableImage(img) {
    if (!img) return;
    if (img.dataset.initialAvatarDisabled === 'true') return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('src');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.dataset.initialAvatarDisabled = 'true';
  }

  function renderInto(target, name) {
    if (!target) return;

    var text = firstGrapheme(name);
    var avatar = target.querySelector(':scope > .wl-initial-avatar');

    if (!avatar) {
      avatar = makeAvatar(name);
      target.insertBefore(avatar, target.firstChild);
    }

    var nextClass = 'wl-initial-avatar wl-initial-avatar--' + colorIndex(name);
    if (avatar.textContent !== text) avatar.textContent = text;
    if (avatar.className !== nextClass) avatar.className = nextClass;
    target.classList.add('wl-initial-avatar-host');
    target.querySelectorAll(':scope > img').forEach(disableImage);
  }

  function renderCards(root) {
    root.querySelectorAll('.wl-card-item').forEach(function (card) {
      var user = card.querySelector(':scope > .wl-user');
      renderInto(user, nickFromCard(card));
    });
  }

  function currentInputNick(root) {
    var input = root.querySelector('#wl-nick, input.wl-nick, input[name="nick"]');
    return input && input.value ? input.value : '访客';
  }

  function renderEditor(root) {
    var avatar = root.querySelector('.wl-comment .wl-avatar, .wl-login-info .wl-avatar');
    renderInto(avatar, currentInputNick(root));
  }

  function renderAll() {
    document.querySelectorAll('.waline-comment').forEach(function (root) {
      renderCards(root);
      renderEditor(root);
    });
  }

  function bindNickInputs() {
    document.querySelectorAll('.waline-comment #wl-nick, .waline-comment input.wl-nick, .waline-comment input[name="nick"]').forEach(function (input) {
      if (input.dataset.initialAvatarBound === 'true') return;
      input.dataset.initialAvatarBound = 'true';
      input.addEventListener('input', function () {
        window.clearTimeout(inputTimer);
        inputTimer = window.setTimeout(renderAll, 30);
      });
    });
  }

  function init() {
    patchWalineFetch();

    if (initialized) {
      renderAll();
      bindNickInputs();
      return;
    }

    initialized = true;
    renderAll();
    bindNickInputs();

    observer = new MutationObserver(function () {
      renderAll();
      bindNickInputs();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pjax:complete', init);
  window.WalineInitialAvatar = {
    refresh: renderAll,
    disconnect: function () {
      if (observer) observer.disconnect();
      initialized = false;
    },
  };
})();
