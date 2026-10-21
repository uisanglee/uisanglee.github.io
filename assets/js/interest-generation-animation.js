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
      glyph.style.setProperty("--motion-delay", `${type === "diffusion" ? rank * 125 : 0}ms`);
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

    const diffusionGlyphs = Array.from(item.querySelectorAll(".diffusion-char"));
    const autoregressiveGlyphs = Array.from(item.querySelectorAll(".autoregressive-char"));
    let cycle = 0;

    const play = () => {
      cycle += 1;
      const activeCycle = cycle;
      const order = shuffledIndexes(diffusionGlyphs.length);
      const ranks = new Map(order.map((characterIndex, rank) => [characterIndex, rank]));

      item.classList.remove("is-motion-playing");
      autoregressiveGlyphs.forEach((glyph) => glyph.classList.remove("is-revealed"));
      diffusionGlyphs.forEach((glyph, index) => {
        glyph.style.setProperty("--motion-delay", `${ranks.get(index) * 125}ms`);
        glyph.style.setProperty("--mask-x", `${Math.round((Math.random() - .5) * 16)}px`);
        glyph.style.setProperty("--mask-y", `${Math.round((Math.random() - .5) * 12)}px`);
      });
      void item.offsetWidth;
      item.classList.add("is-motion-playing");
      autoregressiveGlyphs.forEach((glyph, index) => {
        window.setTimeout(() => {
          if (cycle === activeCycle) glyph.classList.add("is-revealed");
        }, 1500 + index * 75);
      });
    };
    const startLoop = () => {
      play();
      window.setInterval(play, 3000);
    };
    if (!("IntersectionObserver" in window)) {
      window.setTimeout(startLoop, 80);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      startLoop();
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
