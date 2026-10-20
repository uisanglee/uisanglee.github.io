(function () {
  "use strict";

  const sectionIds = ["home", "publications", "cv", "contact"];

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
    section.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
    setActiveSection(id);
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
    const initialId = sectionIds.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "home";
    setActiveSection(initialId);
  });
  window.addEventListener("resize", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("orientationchange", () => window.requestAnimationFrame(enforceMobileNavigation));
  window.addEventListener("popstate", () => scrollToSection(window.location.hash.slice(1) || "home", false));
})();
