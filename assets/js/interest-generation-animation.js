(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function shuffledIndexes(length) {
    const indexes = Array.from({ length }, (_, index) => index);
    for (let index = indexes.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
    }
    return indexes;
  }

  function makeCharacters(term, type) {
    const text = term.dataset.motionText || term.textContent.trim();
    const revealOrder = type === "diffusion"
      ? shuffledIndexes(text.length)
      : Array.from({ length: text.length }, (_, index) => index);
    const revealRank = new Map(revealOrder.map((characterIndex, rank) => [characterIndex, rank]));
    const fragment = document.createDocumentFragment();

    Array.from(text).forEach((character, index) => {
      const glyph = document.createElement("span");
      const rank = revealRank.get(index);
      glyph.className = `motion-char ${type}-char${character === " " ? " is-space" : ""}`;
      glyph.dataset.char = character;
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = character;
      glyph.style.setProperty("--motion-delay", `${type === "diffusion" ? rank * 62 : 920 + rank * 74}ms`);
      glyph.style.setProperty("--mask-x", `${Math.round((Math.random() - .5) * 16)}px`);
      glyph.style.setProperty("--mask-y", `${Math.round((Math.random() - .5) * 12)}px`);
      glyph.style.setProperty("--mask-scale", (0.75 + Math.random() * .55).toFixed(2));
      fragment.appendChild(glyph);
    });

    term.setAttribute("aria-label", text);
    term.replaceChildren(fragment);
  }

  function initialize() {
    if (reduceMotion.matches) return;

    const item = document.querySelector(".interest-llm-motion");
    const diffusion = item?.querySelector(".interest-diffusion");
    const autoregressive = item?.querySelector(".interest-autoregressive");
    if (!item || !diffusion || !autoregressive) return;

    makeCharacters(diffusion, "diffusion");
    makeCharacters(autoregressive, "autoregressive");
    item.classList.add("is-motion-prepared");

    const play = () => {
      item.classList.add("is-motion-playing");
      item.querySelectorAll(".autoregressive-char").forEach((glyph, index) => {
        window.setTimeout(() => glyph.classList.add("is-revealed"), 920 + index * 74);
      });
    };
    if (!("IntersectionObserver" in window)) {
      window.setTimeout(play, 80);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      play();
      observer.disconnect();
    }, { threshold: .45 });
    observer.observe(item);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}());
