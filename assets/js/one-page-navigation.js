(function () {
  "use strict";

  const sectionIds = ["home", "publications", "cv", "contact"];
  const brandLabels = { home: "Uisang Lee", publications: "📚", cv: "📑", contact: "📞" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scrollAnimationId = 0;
  let activeSectionId = null;
  let brandSwapTimer = null;

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

    const mastheadHeight = document.querySelector(".masthead")?.offsetHeight || 0;
    const mobileLayout = window.matchMedia("(max-width: 760px)").matches;
    const sectionGap = mobileLayout ? 12 : 22;
    const startY = window.scrollY;
    const targetY = id === "home"
      ? 0
      : Math.max(0, getDocumentTop(section) - mastheadHeight - sectionGap);
    const distance = targetY - startY;
    const animationId = ++scrollAnimationId;

    if (reduceMotion.matches) {
      window.scrollTo(0, targetY);
    } else {
      const duration = Math.min(1250, Math.max(720, 620 + Math.abs(distance) * .16));
      const startedAt = performance.now();
      const easeInOutQuint = (progress) => progress < .5
        ? 16 * progress ** 5
        : 1 - ((-2 * progress + 2) ** 5) / 2;

      const animate = (now) => {
        if (animationId !== scrollAnimationId) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        window.scrollTo(0, startY + distance * easeInOutQuint(progress));
        if (progress < 1) window.requestAnimationFrame(animate);
      };
      window.requestAnimationFrame(animate);
    }

    setActiveSection(id);
    if (updateHistory) history.pushState({}, "", `#${id}`);
  }

  function prepareScrollAnimations() {
    const elements = Array.from(document.querySelectorAll(".profile-details, .one-page-section, .profile-contact"));
    if (reduceMotion.matches) return;

    document.documentElement.classList.add("scroll-motion-ready");
    let ranges = [];
    let ticking = false;
    let mobileMotion = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const interpolate = (from, to, progress) => from + (to - from) * progress;
    const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

    const measure = () => {
      mobileMotion = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
      elements.forEach((element) => element.style.removeProperty("--scroll-transform"));
      ranges = elements.map((element) => {
        const top = getDocumentTop(element);
        return {
          element,
          start: top - window.innerHeight * (mobileMotion ? .98 : .9),
          end: top - window.innerHeight * (mobileMotion ? .08 : .28),
          exitStart: top + element.offsetHeight - window.innerHeight * (mobileMotion ? .5 : .4),
          exitEnd: top + element.offsetHeight - window.innerHeight * (mobileMotion ? .02 : .08),
          currentEnter: null,
          currentExit: null,
          enterVelocity: 0,
          exitVelocity: 0
        };
      });
      render();
    };

    const render = () => {
      const scrollTop = window.scrollY || window.pageYOffset;
      let isSettling = false;
      ranges.forEach((range) => {
        const { element, start, end, exitStart, exitEnd } = range;
        const rawProgress = clamp((scrollTop - start) / Math.max(1, end - start), 0, 1);
        const rawExitProgress = element.classList.contains("profile-contact")
          ? 0
          : clamp((scrollTop - exitStart) / Math.max(1, exitEnd - exitStart), 0, 1);
        const targetEnter = easeOutCubic(rawProgress);
        const targetExit = rawExitProgress ** 2;

        if (range.currentEnter === null) range.currentEnter = targetEnter;
        if (range.currentExit === null) range.currentExit = targetExit;
        if (mobileMotion) {
          range.enterVelocity = (range.enterVelocity + (targetEnter - range.currentEnter) * .095) * .8;
          range.exitVelocity = (range.exitVelocity + (targetExit - range.currentExit) * .085) * .8;
          range.currentEnter += range.enterVelocity;
          range.currentExit += range.exitVelocity;
        } else {
          range.currentEnter += (targetEnter - range.currentEnter) * .14;
          range.currentExit += (targetExit - range.currentExit) * .11;
        }

        if (
          Math.abs(targetEnter - range.currentEnter) > .001 ||
          Math.abs(targetExit - range.currentExit) > .001 ||
          Math.abs(range.enterVelocity) > .001 ||
          Math.abs(range.exitVelocity) > .001
        ) {
          isSettling = true;
        }

        const enterProgress = clamp(range.currentEnter, 0, 1);
        const exitProgress = clamp(range.currentExit, 0, 1);
        const opacity = interpolate(.08, 1, enterProgress) * interpolate(1, .08, exitProgress);
        const translateY = interpolate(mobileMotion ? 112 : 86, 0, enterProgress) + interpolate(0, mobileMotion ? -88 : -72, exitProgress);
        const scale = interpolate(mobileMotion ? .95 : .968, 1, enterProgress) - exitProgress * (mobileMotion ? .024 : .018);
        const maxBlur = mobileMotion ? 5 : 12;
        const blur = Math.max(interpolate(maxBlur, 0, enterProgress), interpolate(0, mobileMotion ? 4 : 8, exitProgress));

        element.style.setProperty("--scroll-opacity", opacity.toFixed(3));
        element.style.setProperty("--scroll-transform", `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`);
        element.style.setProperty("--scroll-blur", `${blur.toFixed(2)}px`);
      });
      if (isSettling) {
        window.requestAnimationFrame(render);
      } else {
        ticking = false;
      }
    };

    const requestRender = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(render);
    };

    measure();
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
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

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveSection(visible.target.id);
  }, { rootMargin: "-18% 0px -62%", threshold: [0, .15, .35, .6] });

  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });

  window.requestAnimationFrame(() => {
    enforceMobileNavigation();
    prepareScrollAnimations();
    const initialId = sectionIds.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "home";
    setActiveSection(initialId);
    if (window.location.hash) {
      window.requestAnimationFrame(() => scrollToSection(initialId, false));
    }
  });
  ["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, () => { scrollAnimationId += 1; }, { passive: true });
  });
  window.addEventListener("resize", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("orientationchange", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("popstate", () => scrollToSection(window.location.hash.slice(1) || "home", false));
})();
