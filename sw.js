/* Service Worker — بيخلّي الموقع/التطبيق يفتح من غير نت */
var CACHE = 'lms-sw-v1';
var CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];
var PRE = [
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js'
];

self.addEventListener('install', function(e){
  e.waitUntil((async function(){
    var c = await caches.open(CACHE);
    var scope = self.registration.scope;
    await Promise.all([scope, scope + 'index.html'].concat(PRE).map(function(u){
      return fetch(u, { cache: 'reload' }).then(function(r){ if(r && r.ok) return c.put(u, r); }).catch(function(){});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var ks = await caches.keys();
    await Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

function timeout(p, ms){
  return new Promise(function(res, rej){
    var t = setTimeout(function(){ rej(new Error('timeout')); }, ms);
    p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); });
  });
}

async function networkFirst(req){
  var c = await caches.open(CACHE);
  try{
    var r = await timeout(fetch(req), 5000);
    if(r && r.ok) c.put(req, r.clone());
    return r;
  }catch(err){
    var m = await c.match(req, { ignoreSearch: true });
    if(!m && req.mode === 'navigate'){
      m = (await c.match(self.registration.scope)) || (await c.match(self.registration.scope + 'index.html'));
    }
    if(m) return m;
    throw err;
  }
}

async function staleWhileRevalidate(req){
  var c = await caches.open(CACHE);
  var m = await c.match(req);
  var net = fetch(req).then(function(r){
    if(r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
    return r;
  });
  if(m){ net.catch(function(){}); return m; }
  return net;
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin === self.location.origin){ e.respondWith(networkFirst(req)); return; }
  if(CDN.indexOf(url.hostname) >= 0){ e.respondWith(staleWhileRevalidate(req)); }
});
