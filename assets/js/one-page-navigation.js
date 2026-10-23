(function () {
  "use strict";

  const sectionIds = ["home", "publications", "cv", "contact"];
  const brandLabels = { home: "Uisang Lee", publications: "📚", cv: "📑", contact: "📞" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const story = document.querySelector(".horizontal-scroll-story");
  const stage = story?.querySelector(".profile-shell");
  const track = story?.querySelector(".horizontal-track");
  if (!story || !stage || !track) return;

  let slideDistance = 0;
  let scrollStart = 0;
  let panelStride = 0;
  let renderFrame = 0;
  let scrollAnimationId = 0;
  let navigationTargetId = null;
  let activeSectionId = null;
  let brandSwapTimer = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function getDocumentTop(element) {
    let top = 0;
    let current = element;
    while (current) {
      top += current.offsetTop || 0;
      current = current.offsetParent;
    }
    return top;
  }

  function enforceMobileNavigation() {
    if (!window.matchMedia("(max-width: 760px)").matches) {
      document.body.style.paddingTop = "";
      return;
    }

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

  function measure() {
    enforceMobileNavigation();
    stage.scrollLeft = 0;
    const mastheadHeight = document.querySelector(".masthead")?.offsetHeight || 0;
    const gap = window.matchMedia("(max-width: 760px)").matches ? 12 : 22;
    const pinTop = mastheadHeight + gap;
    const panelHeight = Math.max(320, window.innerHeight - pinTop - 16);
    document.documentElement.style.setProperty("--section-pin-top", `${pinTop}px`);
    document.documentElement.style.setProperty("--panel-height", `${panelHeight}px`);
    document.documentElement.classList.add("horizontal-ready");

    const panelWidth = stage.clientWidth;
    document.documentElement.style.setProperty("--panel-width", `${panelWidth}px`);
    const panelGap = parseFloat(getComputedStyle(track).gap) || 0;
    panelStride = panelWidth + panelGap;
    slideDistance = Math.max(400, window.innerHeight);
    story.style.height = `${panelHeight + slideDistance * sectionIds.length}px`;
    scrollStart = Math.max(0, getDocumentTop(story) - pinTop);
    requestRender();
  }

  function setActiveSection(id) {
    if (!sectionIds.includes(id) || id === activeSectionId) return;
    const previousSectionId = activeSectionId;
    activeSectionId = id;
    document.querySelectorAll(".masthead__menu-item").forEach((item) => item.classList.remove("selected"));
    document.querySelector(`.masthead__menu-item:not(.masthead__menu-item--lg) a[data-section-link="${id}"]`)?.closest(".masthead__menu-item")?.classList.add("selected");

    const brand = document.querySelector(".brand-roulette");
    const brandLink = document.querySelector(".brand-roulette-link");
    if (!brand || !brandLink) return;
    brandLink.setAttribute("aria-label", `${brandLabels[id]} — ${id}`);
    if (previousSectionId === null && brand.textContent.trim() === brandLabels[id]) return;

    window.clearTimeout(brandSwapTimer);
    if (reduceMotion.matches) {
      brand.textContent = brandLabels[id];
      return;
    }

    brand.classList.remove("is-rolling-in");
    brand.classList.add("is-rolling-out");
    brandSwapTimer = window.setTimeout(() => {
      brand.textContent = brandLabels[id];
      brand.classList.remove("is-rolling-out");
      void brand.offsetWidth;
      brand.classList.add("is-rolling-in");
      brand.addEventListener("animationend", () => brand.classList.remove("is-rolling-in"), { once: true });
    }, 220);
  }

  function render() {
    renderFrame = 0;
    const progress = clamp((window.scrollY - scrollStart) / Math.max(1, slideDistance), 0, sectionIds.length - 1);
    const visibleIndex = navigationTargetId
      ? sectionIds.indexOf(navigationTargetId)
      : clamp(Math.floor(progress + .25), 0, sectionIds.length - 1);
    track.style.transform = `translate3d(${-visibleIndex * panelStride}px, 0, 0)`;
    sectionIds.forEach((id, index) => {
      document.getElementById(id).inert = index !== visibleIndex;
    });
    setActiveSection(sectionIds[visibleIndex]);
  }

  function requestRender() {
    if (!renderFrame) renderFrame = window.requestAnimationFrame(render);
  }

  function finishNavigationScroll() {
    navigationTargetId = null;
    requestRender();
  }

  function scrollToSection(id, updateHistory) {
    const index = sectionIds.indexOf(id);
    if (index < 0) return;
    stage.scrollLeft = 0;
    document.getElementById(id).scrollTop = 0;
    const startY = window.scrollY;
    const targetY = index === 0 ? 0 : scrollStart + index * slideDistance;
    const distance = targetY - startY;
    const animationId = ++scrollAnimationId;

    if (reduceMotion.matches || Math.abs(distance) < 2) {
      window.scrollTo({ top: targetY, behavior: "instant" });
      finishNavigationScroll();
    } else {
      navigationTargetId = id;
      const duration = Math.min(780, Math.max(460, 420 + Math.abs(distance) * .08));
      const startedAt = performance.now();
      const ease = (progress) => progress < .5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2;

      const animate = (now) => {
        if (animationId !== scrollAnimationId) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        window.scrollTo({ top: startY + distance * ease(progress), behavior: "instant" });
        if (progress < 1) {
          window.requestAnimationFrame(animate);
        } else {
          finishNavigationScroll();
        }
      };
      window.requestAnimationFrame(animate);
    }

    requestRender();
    if (updateHistory) history.pushState({}, "", `#${id}`);
  }

  const cvSection = document.getElementById("cv");
  if (cvSection) {
    const edgeThreshold = 90;
    let wheelDistance = 0;
    let wheelDirection = 0;
    let touchY = null;
    let touchDistance = 0;
    let touchDirection = 0;
    let touchHandedOff = false;
    let handoffLockedUntil = 0;

    function edgeDirection(delta) {
      if (activeSectionId !== "cv" || !delta) return 0;
      const maxScroll = Math.max(0, cvSection.scrollHeight - cvSection.clientHeight);
      if (delta > 0 && cvSection.scrollTop >= maxScroll - 2) return 1;
      if (delta < 0 && cvSection.scrollTop <= 2) return -1;
      return 0;
    }

    function handOff(direction) {
      handoffLockedUntil = performance.now() + 850;
      scrollToSection(direction > 0 ? "contact" : "publications", true);
    }

    cvSection.addEventListener("wheel", (event) => {
      if (performance.now() < handoffLockedUntil || navigationTargetId) {
        event.preventDefault();
        return;
      }
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? cvSection.clientHeight : 1;
      const delta = event.deltaY * multiplier;
      const direction = edgeDirection(delta);
      if (!direction) {
        wheelDistance = 0;
        wheelDirection = 0;
        return;
      }

      event.preventDefault();
      if (wheelDirection !== direction) wheelDistance = 0;
      wheelDirection = direction;
      wheelDistance += Math.abs(delta);
      if (wheelDistance >= edgeThreshold) {
        wheelDistance = 0;
        handOff(direction);
      }
    }, { passive: false });

    cvSection.addEventListener("touchstart", (event) => {
      touchY = event.touches[0]?.clientY ?? null;
      touchDistance = 0;
      touchDirection = 0;
      touchHandedOff = false;
    }, { passive: true });

    cvSection.addEventListener("touchmove", (event) => {
      if (touchY === null || touchHandedOff || !event.touches.length) return;
      if (performance.now() < handoffLockedUntil || navigationTargetId) {
        event.preventDefault();
        return;
      }
      const nextY = event.touches[0].clientY;
      const delta = touchY - nextY;
      touchY = nextY;
      const direction = edgeDirection(delta);
      if (!direction) {
        touchDistance = 0;
        touchDirection = 0;
        return;
      }

      event.preventDefault();
      if (touchDirection !== direction) touchDistance = 0;
      touchDirection = direction;
      touchDistance += Math.abs(delta);
      if (touchDistance >= edgeThreshold) {
        touchHandedOff = true;
        handOff(direction);
      }
    }, { passive: false });

    ["touchend", "touchcancel"].forEach((name) => cvSection.addEventListener(name, () => {
      touchY = null;
      touchDistance = 0;
      touchDirection = 0;
      touchHandedOff = false;
    }, { passive: true }));
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-section-link]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = new URL(link.href, window.location.href);
    if (target.origin !== location.origin || target.pathname !== location.pathname || !target.hash) return;
    const id = target.hash.slice(1);
    if (!sectionIds.includes(id)) return;
    event.preventDefault();
    scrollToSection(id, true);
  });

  window.requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = "auto";
    measure();
    const initialId = sectionIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    if (location.hash) {
      window.requestAnimationFrame(() => scrollToSection(initialId, false));
    } else {
      render();
    }
  });
  window.addEventListener("scroll", requestRender, { passive: true });
  ["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (!navigationTargetId || event.defaultPrevented) return;
      scrollAnimationId += 1;
      finishNavigationScroll();
    }, { passive: true });
  });
  const refreshLayout = () => window.requestAnimationFrame(() => {
    const currentId = activeSectionId;
    measure();
    if (currentId && currentId !== "home") {
      window.scrollTo({ top: scrollStart + sectionIds.indexOf(currentId) * slideDistance, behavior: "instant" });
    }
    requestRender();
  });
  window.addEventListener("resize", refreshLayout);
  window.addEventListener("orientationchange", refreshLayout);
  window.addEventListener("load", refreshLayout);
  window.addEventListener("popstate", () => scrollToSection(location.hash.slice(1) || "home", false));
})();
