self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("karssie-cache").then(cache =>
      cache.addAll([
        "/home.html",
        "/style.css",
        "/script.js"
      ])
    )
  );
});
