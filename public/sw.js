const CACHE = "x-effect-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["./", "./index.html"])),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return res
      })
      .catch(async () => {
        const hit = await caches.match(event.request)
        if (hit) return hit
        if (event.request.mode === "navigate") {
          const index = await caches.match("./index.html")
          if (index) return index
        }
        return Response.error()
      }),
  )
})
