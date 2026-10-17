/* All Card — service worker v5: app turant cache se khulta hai, peeche se update hota rehta hai */
const CACHE = "all-card-shell-v5";
const CORE = ["./", "./index.html", "./manifest.json", "./favicon.png", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/icon-512-maskable.png"];
const TOOLS = ["aadhaar", "voter", "pan", "manualpan", "apaar", "ayushman", "atm", "ippb", "kisan", "passport"].map(n => "./tools/" + n + ".html");

self.addEventListener("install", event => {
  // ek file na mile to bhi install fail na ho (pehle cache.addAll se poora install ruk jata tha)
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
  // bade tools background me cache hote hain (install ko rokte nahi)
  caches.open(CACHE).then(c => TOOLS.forEach(u => c.add(u).catch(() => {})));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
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
    return hit || net;   // cache me ho to turant, warna network
  }));
});
