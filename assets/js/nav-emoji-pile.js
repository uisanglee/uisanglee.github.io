(function () {
  "use strict";

  const STORAGE_KEY = "uisang-nav-emoji-pile-v1";
  const SHOWER_SIZE = 14;
  const MAX_VISIBLE = 140;
  const NAV_DELAY = 420;
  const GRAVITY = 1.08;
  const BALL_RESTITUTION = .72;
  const FLOOR_RESTITUTION = .68;
  const emojiByKey = { home: "🏠", publications: "📚", cv: "📑", contact: "📞" };

  const localDay = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const emptyState = () => ({
    date: localDay(),
    counts: { home: 0, publications: 0, cv: 0, contact: 0 }
  });

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.date !== localDay() || !saved.counts) return emptyState();
      return { ...emptyState(), counts: { ...emptyState().counts, ...saved.counts } };
    } catch (_) {
      return emptyState();
    }
  }

  let state = loadState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  const layer = document.createElement("div");
  layer.className = "emoji-pile-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const bodies = [];

  const loader = document.createElement("div");
  loader.className = "page-transition-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.setAttribute("aria-label", "Loading page");
  loader.innerHTML = '<span class="page-transition-loader__spinner" aria-hidden="true">🌀</span>';
  document.body.appendChild(loader);

  const setLoader = (active) => loader.classList.toggle("is-active", active);

  function enforceMobileNavigation() {
    if (!window.matchMedia("(max-width: 760px)").matches) return;

    const nav = document.querySelector("#site-nav");
    const visibleLinks = nav?.querySelector(".visible-links");
    const hiddenLinks = nav?.querySelector(".hidden-links");
    const menuButton = nav?.querySelector("button");
    if (!nav || !visibleLinks || !hiddenLinks || !menuButton) return;

    while (hiddenLinks.firstElementChild) visibleLinks.appendChild(hiddenLinks.firstElementChild);
    hiddenLinks.classList.add("hidden");
    menuButton.classList.add("hidden");
    menuButton.classList.remove("close");

    const masthead = document.querySelector(".masthead");
    if (masthead) document.body.style.paddingTop = `${masthead.offsetHeight}px`;
  }

  window.requestAnimationFrame(enforceMobileNavigation);
  window.addEventListener("resize", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("orientationchange", () => window.requestAnimationFrame(enforceMobileNavigation));

  function clearPile() {
    bodies.splice(0).forEach((body) => body.element.remove());
    state = emptyState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function scheduleDailyReset() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    window.setTimeout(() => {
      clearPile();
      scheduleDailyReset();
    }, nextMidnight.getTime() - now.getTime() + 50);
  }

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function placement(key, index, falling) {
    const seed = hash(`${state.date}:${key}:${index}`);
    const size = 32 + (seed % 15);
    const radius = size * .44;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const columns = Math.max(7, Math.floor(width / 43));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const useEdge = (seed >>> 17) % 100 < 68;
    const useRightEdge = (seed >>> 24) % 2 === 1;
    const lane = ((seed >>> 5) % 100) / 100;
    const fallingX = useEdge
      ? (useRightEdge ? width * (.76 + lane * .21) : width * (.03 + lane * .21))
      : width * (.25 + lane * .5);
    const packedX = ((column + .5) / columns) * width + (((seed >>> 9) % 9) - 4);

    return {
      size,
      radius,
      x: Math.max(radius, Math.min(width - radius, falling ? fallingX : packedX)),
      y: falling ? -radius - (index % 6) * 46 : Math.max(radius, height - radius - row * radius * 1.65),
      vx: falling ? (((seed >>> 12) % 17) - 8) * .16 : 0,
      vy: falling ? 6.6 + ((seed >>> 16) % 14) * .22 : 0,
      angle: ((seed >>> 12) % 45) - 22,
      angularVelocity: (((seed >>> 21) % 13) - 6) * .08,
      mass: radius * radius
    };
  }

  function makePiece(key, index, falling) {
    const place = placement(key, index, falling);
    const piece = document.createElement("span");
    piece.className = "emoji-pile-piece is-physics";
    piece.textContent = emojiByKey[key];
    piece.style.setProperty("--emoji-size", `${place.size}px`);
    layer.appendChild(piece);

    const body = { ...place, element: piece };
    bodies.push(body);
    if (bodies.length > MAX_VISIBLE) bodies.shift().element.remove();
    renderBody(body);
  }

  function renderBody(body) {
    body.element.style.transform = `translate3d(${body.x - body.size / 2}px, ${body.y - body.size / 2}px, 0) rotate(${body.angle}deg)`;
  }

  function solveCollisions() {
    for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
      const first = bodies[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
        const second = bodies[secondIndex];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const minimumDistance = first.radius + second.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= minimumDistance * minimumDistance) continue;

        const distance = Math.sqrt(distanceSquared) || .001;
        const normalX = dx / distance;
        const normalY = dy / distance;
        const overlap = minimumDistance - distance;
        const inverseFirst = 1 / first.mass;
        const inverseSecond = 1 / second.mass;
        const inverseTotal = inverseFirst + inverseSecond;

        first.x -= normalX * overlap * (inverseFirst / inverseTotal) * .82;
        first.y -= normalY * overlap * (inverseFirst / inverseTotal) * .82;
        second.x += normalX * overlap * (inverseSecond / inverseTotal) * .82;
        second.y += normalY * overlap * (inverseSecond / inverseTotal) * .82;

        const relativeX = second.vx - first.vx;
        const relativeY = second.vy - first.vy;
        const velocityAlongNormal = relativeX * normalX + relativeY * normalY;
        if (velocityAlongNormal > 0) continue;

        const impulse = -((1 + BALL_RESTITUTION) * velocityAlongNormal) / inverseTotal;
        first.vx -= impulse * normalX * inverseFirst;
        first.vy -= impulse * normalY * inverseFirst;
        second.vx += impulse * normalX * inverseSecond;
        second.vy += impulse * normalY * inverseSecond;

        const tangentX = -normalY;
        const tangentY = normalX;
        const tangentVelocity = relativeX * tangentX + relativeY * tangentY;
        const frictionImpulse = tangentVelocity * .015;
        first.vx += frictionImpulse * tangentX;
        first.vy += frictionImpulse * tangentY;
        second.vx -= frictionImpulse * tangentX;
        second.vy -= frictionImpulse * tangentY;
      }
    }
  }

  let previousFrame = performance.now();
  function physicsFrame(now) {
    const step = Math.min(2, Math.max(.35, (now - previousFrame) / 16.67));
    previousFrame = now;
    const width = window.innerWidth;
    const height = window.innerHeight;

    bodies.forEach((body) => {
      body.vy += GRAVITY * step;
      body.x += body.vx * step;
      body.y += body.vy * step;
      body.angle += body.angularVelocity * step;
      body.vx *= .997;
      body.angularVelocity *= .995;

      if (body.x < body.radius) {
        body.x = body.radius;
        body.vx = Math.abs(body.vx) * .55;
      } else if (body.x > width - body.radius) {
        body.x = width - body.radius;
        body.vx = -Math.abs(body.vx) * .55;
      }

      if (body.y > height - body.radius) {
        body.y = height - body.radius;
        body.vy = Math.abs(body.vy) < 1.15 ? 0 : -Math.abs(body.vy) * FLOOR_RESTITUTION;
        body.vx *= .965;
        body.angularVelocity *= .9;
      }
    });

    for (let pass = 0; pass < 3; pass += 1) solveCollisions();
    bodies.forEach(renderBody);
    window.requestAnimationFrame(physicsFrame);
  }

  window.requestAnimationFrame(physicsFrame);

  function renderSavedPile() {
    const entries = Object.entries(state.counts);
    const total = entries.reduce((sum, entry) => sum + Number(entry[1] || 0), 0);
    const start = Math.max(0, total - MAX_VISIBLE);
    let globalIndex = 0;

    entries.forEach(([key, rawCount]) => {
      const count = Number(rawCount || 0);
      for (let index = 0; index < count; index += 1) {
        if (globalIndex >= start) makePiece(key, globalIndex - start, false);
        globalIndex += 1;
      }
    });
  }

  function shower(key) {
    const previousTotal = Object.values(state.counts).reduce((sum, count) => sum + Number(count || 0), 0);
    state.counts[key] = Number(state.counts[key] || 0) + SHOWER_SIZE;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    for (let offset = 0; offset < SHOWER_SIZE; offset += 1) {
      window.setTimeout(() => makePiece(key, previousTotal + offset, true), offset * 24);
    }
  }

  renderSavedPile();
  scheduleDailyReset();

  let pageTransitionPending = false;
  let renderedUrl = window.location.href;

  function updateSelectedNavigation(destination) {
    const target = new URL(destination, window.location.href);
    const selectedKey = target.hash === "#contact"
      ? "contact"
      : target.pathname.includes("/publications")
        ? "publications"
        : target.pathname.includes("/cv")
          ? "cv"
          : "home";

    document.querySelectorAll(".masthead__menu-item").forEach((item) => item.classList.remove("selected"));
    const activeLink = document.querySelector(`a[data-nav-key="${selectedKey}"]`);
    if (activeLink) activeLink.closest(".masthead__menu-item")?.classList.add("selected");
  }

  function scrollForDestination(destination) {
    const target = new URL(destination, window.location.href);
    if (target.hash) {
      const anchor = document.querySelector(target.hash);
      if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function navigateWithoutReload(destination, options = {}) {
    const target = new URL(destination, window.location.href);
    const shouldPush = options.push !== false;
    const current = new URL(renderedUrl);

    if (target.origin !== current.origin) {
      window.location.href = target.href;
      return;
    }

    if (target.pathname === current.pathname && target.search === current.search) {
      if (shouldPush && target.href !== current.href) history.pushState({}, "", target.href);
      renderedUrl = target.href;
      updateSelectedNavigation(target.href);
      scrollForDestination(target.href);
      return;
    }

    if (pageTransitionPending) return;
    pageTransitionPending = true;
    setLoader(true);

    try {
      const [response] = await Promise.all([
        fetch(target.href, { headers: { "X-Requested-With": "portfolio-navigation" } }),
        new Promise((resolve) => window.setTimeout(resolve, 440))
      ]);
      if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

      const nextDocument = new DOMParser().parseFromString(await response.text(), "text/html");
      const nextMain = nextDocument.querySelector("#main[role='main']");
      const currentMain = document.querySelector("#main[role='main']");
      if (!nextMain || !currentMain) throw new Error("Page content container was not found");

      const swapContent = () => {
        currentMain.replaceWith(nextMain);
        nextMain.classList.add("is-page-entering");
        window.setTimeout(() => nextMain.classList.remove("is-page-entering"), 500);
      };

      let transition;
      if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        transition = document.startViewTransition(swapContent);
        await transition.ready;
      } else {
        swapContent();
      }

      document.title = nextDocument.title;
      if (shouldPush) history.pushState({}, "", target.href);
      renderedUrl = target.href;
      updateSelectedNavigation(target.href);
      scrollForDestination(target.href);
      if (transition) await transition.finished;
    } catch (_) {
      setLoader(false);
      window.location.href = target.href;
    } finally {
      setLoader(false);
      pageTransitionPending = false;
    }
  }

  window.addEventListener("popstate", () => {
    navigateWithoutReload(window.location.href, { push: false });
  });

  document.addEventListener("click", (event) => {
    const resetLink = event.target.closest("a[data-emoji-reset]");
    if (resetLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      clearPile();
      if (new URL(resetLink.href).pathname !== new URL(renderedUrl).pathname) navigateWithoutReload(resetLink.href);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const link = event.target.closest("a[data-nav-emoji][data-nav-key]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const key = link.dataset.navKey;
    if (!emojiByKey[key]) return;

    event.preventDefault();
    link.classList.remove("is-emoji-active");
    void link.offsetWidth;
    link.classList.add("is-emoji-active");
    shower(key);

    const destination = link.href;
    window.setTimeout(
      () => navigateWithoutReload(destination),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : NAV_DELAY
    );
  });
})();
