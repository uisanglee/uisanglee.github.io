(function () {
  "use strict";

  const sectionIds = ["home", "publications", "cv", "contact"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scrollAnimationId = 0;

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
    document.querySelectorAll(".masthead__menu-item").forEach((item) => item.classList.remove("selected"));
    document.querySelector(`a[data-section-link="${id}"]`)?.closest(".masthead__menu-item")?.classList.add("selected");
  }

  function scrollToSection(id, updateHistory) {
    const section = document.getElementById(id);
    if (!section) return;

    const mastheadHeight = document.querySelector(".masthead")?.offsetHeight || 0;
    const startY = window.scrollY;
    const targetY = Math.max(0, section.getBoundingClientRect().top + startY - mastheadHeight - 20);
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

  function prepareScrollReveals() {
    const revealTargets = document.querySelectorAll(".profile-details, .one-page-section, .profile-contact");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => target.classList.add("has-revealed"));
      return;
    }

    document.documentElement.classList.add("scroll-motion-ready");
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("has-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12%", threshold: .12 });

    revealTargets.forEach((target) => revealObserver.observe(target));
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
    prepareScrollReveals();
    const initialId = sectionIds.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "home";
    setActiveSection(initialId);
  });
  ["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, () => { scrollAnimationId += 1; }, { passive: true });
  });
  window.addEventListener("resize", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("orientationchange", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("popstate", () => scrollToSection(window.location.hash.slice(1) || "home", false));
})();
