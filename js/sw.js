importScripts('cache-pollyfill.js');
const CACHE_VERSION = 'app-v1';
const CACHE_FILES = [ // 需要缓存的页面文件
    '/',
    '/jquery.min.js',
    '/highlight.min.js',
    '/js.min.js',
    '/nprogress.js',
    '/smoothscroll.js',
    '/static.duoshuo.com/embed.js',
    '/../css/material.min.css',
    '/../css/style.min.css',
    '/../css/gallery.min.css',
    '/../css/duoshuo.min.css',
    '/../css/solarized-white.css',
    '/../img/apple-touch-icon.png',
    '/../img/favicon.png',
    '/../img/avatar.png',
    '/../img/bg.png',
    '/../img/daily_pic.png',
    '/../img/logo.png',
    '/../img/random/1.png',
    '/../img/random/2.png',
    '/../img/random/3.png',
    '/../img/random/4.png',
    '/../img/random/5.png',
    '/../img/footer/footer_ico-github.png',
    '/../img/sidebar_header.png',
    '/../fonts/MaterialIcons-Regular.woff2'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('install');
      return cache.addAll(CACHE_FILES);
    })
  )
});

self.addEventListener('activate',  e => {
  console.log('service worker activated.')
  e.waitUntil(
    caches.keys().then(function(keys){
            return Promise.all(keys.map(function(key){ // 清除旧版本缓存
                if(key !== CACHE_VERSION){
                    return caches.delete(key);
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
self.addEventListener('fetch', e => {
  e.respondWith( // 返回页面的资源请求
          caches.match(e.request).then(function(response){ // 判断缓存是否命中
              return response || fetch(e.request);
          })
      )
});

// function requestBackend(event){  // 请求备份操作
//     var url = event.request.clone();
//     return fetch(url).then(function(res){ // 请求线上资源
//         //if not a valid response send the error
//         if(!res || res.status !== 200 || res.type !== 'basic'){
//             return res;
//         }
//
//         var response = res.clone();
//
//         caches.open(CACHE_VERSION).then(function(cache){ // 缓存从线上获取的资源
//             cache.put(event.request, response);
//         });
//
//         return res;
//     })
// }
