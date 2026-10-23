(function () {
  "use strict";

  const sectionIds = ["home", "publications", "cv", "contact"];
  const brandLabels = { home: "Uisang Lee", publications: "📚", cv: "📑", contact: "📞" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scrollAnimationId = 0;
  let navigationTargetId = null;
  let activeSectionId = null;
  let brandSwapTimer = null;
  let motionFrame = 0;
  const motionState = new Map();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function finishNavigationScroll() {
    navigationTargetId = null;
    updateActiveSection();
  }

  function getDocumentTop(element) {
    let top = 0;
    let current = element;
    while (current) {
      top += current.offsetTop || 0;
      current = current.offsetParent;
    }
    return top;
  }

  function getSectionTop(id) {
    const anchor = document.querySelector(`[data-section-anchor="${id}"]`);
    return anchor ? getDocumentTop(anchor) : getDocumentTop(document.getElementById(id));
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

  function updatePinnedOffset() {
    const mastheadHeight = document.querySelector(".masthead")?.offsetHeight || 0;
    const gap = window.matchMedia("(max-width: 760px)").matches ? 12 : 22;
    const pinTop = mastheadHeight + gap;
    document.documentElement.style.setProperty("--section-pin-top", `${pinTop}px`);
    sectionIds.forEach((id) => {
      const card = document.getElementById(id);
      if (!card) return;
      const cardTop = Math.min(pinTop, window.innerHeight - card.offsetHeight - 16);
      card.style.setProperty("--card-pin-top", `${cardTop}px`);
    });
  }

  function updateActiveSection() {
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--section-pin-top")) || 0;
    const position = window.scrollY + pinTop + 2;
    let currentId = "home";
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section && getSectionTop(id) <= position) currentId = id;
    });
    setActiveSection(currentId);
    updateVisualStack();
    requestMotion();
  }

  function updateVisualStack() {
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--section-pin-top")) || 0;
    let frontIndex = 0;
    sectionIds.forEach((id, index) => {
      const naturalTop = getSectionTop(id) - window.scrollY;
      const transitionStart = getTransitionStart(index, pinTop);
      if (naturalTop < transitionStart - 1) frontIndex = index;
      document.getElementById(id)?.classList.toggle("is-waiting", index > 0 && naturalTop >= transitionStart);
    });
    sectionIds.forEach((id, index) => {
      document.getElementById(id)?.classList.toggle("is-past", index < frontIndex);
    });
  }

  function getTransitionStart(index, pinTop) {
    const previous = document.getElementById(sectionIds[index - 1]);
    return previous?.offsetHeight > window.innerHeight * 1.15
      ? pinTop + 160
      : window.innerHeight;
  }

  function renderMotion() {
    motionFrame = 0;
    if (reduceMotion.matches) return;
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--section-pin-top")) || 0;
    let unsettled = false;

    sectionIds.slice(1).forEach((id, offsetIndex) => {
      const card = document.getElementById(id);
      if (!card) return;
      const transitionStart = getTransitionStart(offsetIndex + 1, pinTop);
      const travel = Math.max(1, transitionStart - pinTop);
      const naturalTop = getSectionTop(id) - window.scrollY;
      const progress = clamp((transitionStart - naturalTop) / travel, 0, 1);
      const remaining = 1 - progress;
      const target = progress > 0 && progress < 1
        ? (pinTop - naturalTop) * (1 - remaining ** 32)
        : 0;
      const state = motionState.get(id) || { offset: target, velocity: 0 };
      state.velocity = (state.velocity + (target - state.offset) * .35) * .74;
      state.offset += state.velocity;
      motionState.set(id, state);

      card.style.setProperty("--sticky-translate", `${state.offset.toFixed(2)}px`);
      card.style.setProperty("--sticky-scale", (1 - Math.min(.017, Math.abs(state.offset) / 10000)).toFixed(4));
      if (Math.abs(target - state.offset) > .15 || Math.abs(state.velocity) > .15) unsettled = true;
    });

    if (unsettled) requestMotion();
  }

  function requestMotion() {
    if (!motionFrame && !reduceMotion.matches) motionFrame = window.requestAnimationFrame(renderMotion);
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

  function scrollToSection(id, updateHistory) {
    const section = document.getElementById(id);
    if (!section) return;

    updatePinnedOffset();
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--section-pin-top")) || 0;
    const startY = window.scrollY;
    const targetY = id === "home"
      ? 0
      : Math.max(0, getSectionTop(id) - pinTop);
    const distance = targetY - startY;
    const animationId = ++scrollAnimationId;

    if (reduceMotion.matches) {
      window.scrollTo({ top: targetY, behavior: "instant" });
      finishNavigationScroll();
    } else {
      navigationTargetId = id;
      const duration = Math.min(760, Math.max(480, 420 + Math.abs(distance) * .075));
      const startedAt = performance.now();
      const easeInOutCubic = (progress) => progress < .5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2;

      const animate = (now) => {
        if (animationId !== scrollAnimationId) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        window.scrollTo({ top: startY + distance * easeInOutCubic(progress), behavior: "instant" });
        if (progress < 1) {
          window.requestAnimationFrame(animate);
        } else {
          finishNavigationScroll();
        }
      };
      window.requestAnimationFrame(animate);
    }

    updateActiveSection();
    if (updateHistory) history.pushState({}, "", `#${id}`);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-section-link]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = new URL(link.href, window.location.href);
    if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || !target.hash) return;

    const id = target.hash.slice(1);
    if (!sectionIds.includes(id)) return;
    event.preventDefault();
    scrollToSection(id, true);
  });

  window.requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = "auto";
    enforceMobileNavigation();
    updatePinnedOffset();
    const initialId = sectionIds.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "home";
    setActiveSection(initialId);
    if (window.location.hash) {
      window.requestAnimationFrame(() => scrollToSection(initialId, false));
    } else {
      updateActiveSection();
    }
  });
  window.addEventListener("scroll", updateActiveSection, { passive: true });
  ["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      if (!navigationTargetId) return;
      scrollAnimationId += 1;
      finishNavigationScroll();
    }, { passive: true });
  });
  const refreshLayout = () => window.requestAnimationFrame(() => {
    enforceMobileNavigation();
    updatePinnedOffset();
    updateActiveSection();
  });
  window.addEventListener("resize", refreshLayout);
  window.addEventListener("orientationchange", refreshLayout);
  window.addEventListener("load", refreshLayout);
  window.addEventListener("popstate", () => scrollToSection(window.location.hash.slice(1) || "home", false));
})();
