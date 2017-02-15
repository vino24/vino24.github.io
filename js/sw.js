importScripts('cache-pollyfill.js');
const CACHE_VERSION = 'app-v3';
const RUNTIME = 'runtime';
const CACHE_FILES = [ // 需要缓存的页面文件
    '/',
    'jquery.min.js',
    'highlight.min.js',
    'js.min.js',
    'nprogress.js',
    'smoothscroll.js',
    'static.duoshuo.com/embed.js',
    '../css/material.min.css',
    '../css/style.min.css',
    '../css/gallery.min.css',
    '../css/duoshuo.min.css',
    '../css/solarized-white.css',
    '../img/apple-touch-icon.png',
    '../img/favicon.png',
    '../img/avatar.png',
    '../img/bg.png',
    '../img/daily_pic.png',
    '../img/logo.png',
    '../img/random/1.png',
    '../img/random/2.png',
    '../img/random/3.png',
    '../img/random/4.png',
    '../img/random/5.png',
    '../img/footer/footer_ico-github.png',
    '../img/sidebar_header.png',
    '../fonts/MaterialIcons-Regular.woff2'
];


// The Util Function to hack URLs of intercepted requests
const getFixedUrl = (req) => {
  var now = Date.now();
  url = new URL(req.url)

  // 1. fixed http URL
  // Just keep syncing with location.protocol
  // fetch(httpURL) belongs to active mixed content.
  // And fetch(httpRequest) is not supported yet.
  url.protocol = self.location.protocol

  // 2. add query for caching-busting.
  // Github Pages served with Cache-Control: max-age=600
  // max-age on mutable content is error-prone, with SW life of bugs can even extend.
  // Until cache mode of Fetch API landed, we have to workaround cache-busting with query string.
  // Cache-Control-Bug: https://bugs.chromium.org/p/chromium/issues/detail?id=453190
  url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;
  return url.href
}

// The Util Function to detect and polyfill req.mode="navigate"
// request.mode of 'navigate' is unfortunately not supported in Chrome
// versions older than 49, so we need to include a less precise fallback,
// which checks for a GET request with an Accept: text/html header.
const isNavigationReq = (req) => (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept').includes('text/html')))

// The Util Function to detect if a req is end with extension
// Accordin to Fetch API spec <https://fetch.spec.whatwg.org/#concept-request-destination>
// Any HTML's navigation has consistently mode="navigate" type="" and destination="document"
// including requesting an img (or any static resources) from URL Bar directly.
// So It ends up with that regExp is still the king of URL routing ;)
// P.S. An url.pathname has no '.' can not indicate it ends with extension (e.g. /api/version/1.2/)
const endWithExtension = (req) => Boolean(new URL(req.url).pathname.match(/\.\w+$/))

// Redirect in SW manually fixed github pages arbitray 404s on things?blah
// what we want:
//    repo?blah -> !(gh 404) -> sw 302 -> repo/?blah
//    .ext?blah -> !(sw 302 -> .ext/?blah -> gh 404) -> .ext?blah
// If It's a navigation req and it's url.pathname isn't end with '/' or '.ext'
// it should be a dir/repo request and need to be fixed (a.k.a be redirected)
// Tracking https://twitter.com/Huxpro/status/798816417097224193
const shouldRedirect = (req) => (isNavigationReq(req) && new URL(req.url).pathname.substr(-1) !== "/" && !endWithExtension(req))

// The Util Function to get redirect URL
// `${url}/` would mis-add "/" in the end of query, so we use URL object.
// P.P.S. Always trust url.pathname instead of the whole url string.
const getRedirectUrl = (req) => {
  url = new URL(req.url)
  url.pathname += "/"
  return url.href
}

/**
 *  @Lifecycle Install
 *  Precache anything static to this version of your app.
 *  e.g. App Shell, 404, JS/CSS dependencies...
 *
 *  waitUntil() : installing ====> installed
 *  skipWaiting() : waiting(installed) ====> activating
 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('install');
      return cache.addAll(CACHE_FILES);
    })
  )
});


/**
 *  @Lifecycle Activate
 *  New one activated when old isnt being used.
 *
 *  waitUntil(): activating ====> activated
 */
self.addEventListener('activate',  event => {
  console.log('service worker activated.')
  event.waitUntil(
    caches.keys().then(function(keys){
            return Promise.all(keys.map(function(key, i){ // 清除旧版本缓存
                if(key !== CACHE_VERSION){
                    return caches.delete(keys[i]);
                }
            }))
        }));
});


/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.
 *
 *  void respondWith(Promise<Response> r);
 */
self.addEventListener('fetch', event => {
  event.respondWith( // 返回页面的资源请求
          caches.match(event.request).then(function(res){ // 判断缓存是否命中
              if(res){  // 返回缓存中的资源
                  return res;
              }
              requestBackend(event); // 执行请求备份操作
          })
      )
});

function requestBackend(event){  // 请求备份操作
    var url = event.request.clone();
    return fetch(url).then(function(res){ // 请求线上资源
        //if not a valid response send the error
        if(!res || res.status !== 200 || res.type !== 'basic'){
            return res;
        }

        var response = res.clone();

        caches.open(CACHE_VERSION).then(function(cache){ // 缓存从线上获取的资源
            cache.put(event.request, response);
        });

        return res;
    })
}
