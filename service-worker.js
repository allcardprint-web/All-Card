/* All Card — service worker v8: app turant cache se khulta hai, Firebase/PDF libraries bhi offline ke liye cache */
const CACHE = "all-card-shell-v8";
const CORE = ["./", "./index.html", "./manifest.json", "./favicon.png", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];
const LIBS = [
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
];
const CDN = /(^|\.)gstatic\.com$|(^|\.)cdnjs\.cloudflare\.com$|(^|\.)cdn\.jsdelivr\.net$/;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
  // Firebase + PDF libraries background me (install ko rokte nahi) — taki offline me bhi app chale
  caches.open(CACHE).then(c => LIBS.forEach(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {})));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) {
    if (!CDN.test(u.hostname) || !/\.(js|css|mjs)(\?|$)/.test(u.pathname)) return;   // sirf libraries
    event.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => hit || Response.error());
      event.waitUntil(net.catch(() => {}));
      return hit || net;
    }));
    return;
  }
  event.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        if (hit && req.mode === "navigate") {
          const a = hit.headers.get("etag"), b = res.headers.get("etag");
          if (a && b && a !== b) self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage("updated")));
        }
      }
      return res;
    }).catch(() => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
    event.waitUntil(net.catch(() => {}));
    return hit || net;
  }));
});
