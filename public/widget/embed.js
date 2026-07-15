/* SetReady embeddable Training & Certificates widget — loader.
   Install (the ONLY thing a partner adds to their site):

     <div id="setready-widget"></div>
     <script src="https://www.setready.site/widget/embed.js" data-partner="YOUR_PARTNER_KEY"></script>

   The loader finds #setready-widget (or creates one where the script sits),
   drops in a responsive iframe pointing at SetReady's hosted widget, and
   auto-resizes it. Nothing else to configure. */
(function () {
  var scriptEl = document.currentScript;
  var partner = (scriptEl && scriptEl.getAttribute('data-partner')) || '';
  // Origin the widget is served from (same origin as this script by default).
  var origin = 'https://www.setready.site';
  try { origin = new URL(scriptEl.src).origin; } catch (e) {}

  function mount() {
    var host = document.getElementById('setready-widget');
    if (!host) {
      host = document.createElement('div');
      host.id = 'setready-widget';
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.insertBefore(host, scriptEl);
      else document.body.appendChild(host);
    }
    if (host.getAttribute('data-mounted')) return;
    host.setAttribute('data-mounted', '1');

    var iframe = document.createElement('iframe');
    iframe.src = origin + '/widget/index.html?partner=' + encodeURIComponent(partner) + '&api=' + encodeURIComponent(origin);
    iframe.title = 'SetReady Training & Certification';
    iframe.setAttribute('allow', 'payment');
    iframe.style.width = '100%';
    iframe.style.minHeight = '640px';
    iframe.style.border = '0';
    iframe.style.borderRadius = '16px';
    iframe.style.display = 'block';
    host.appendChild(iframe);

    // Auto-resize from the widget's postMessage height reports.
    window.addEventListener('message', function (ev) {
      if (ev.origin !== origin) return;
      var d = ev.data;
      if (d && d.setready === 'height' && typeof d.px === 'number') {
        iframe.style.height = Math.max(480, d.px + 24) + 'px';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
