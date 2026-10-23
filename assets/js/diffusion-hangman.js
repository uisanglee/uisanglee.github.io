(function () {
  "use strict";

  const root = document.querySelector(".diffusion-terminal");
  if (!root) return;

  const SUPABASE_URL = "https://amiohgkpwojmphrygrrv.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rdGF_X1D1lhTTylPIueoqA_KIx_Gj8b";
  const MAX_ATTEMPTS = 100;
  const WORDS = [
    "absorb", "access", "active", "adapt", "agent", "align", "answer", "array", "atomic", "binary",
    "branch", "buffer", "cache", "cipher", "client", "cloud", "coding", "compile", "compute", "context",
    "cursor", "debug", "decode", "design", "device", "dialog", "digital", "dynamic", "encode", "engine",
    "feature", "filter", "function", "future", "github", "kernel", "language", "latent", "learning", "linear",
    "logic", "memory", "method", "model", "network", "neural", "object", "output", "parallel", "pattern",
    "pointer", "program", "prompt", "python", "reason", "response", "runtime", "search", "signal", "source",
    "system", "tensor", "terminal", "thread", "token", "training", "vector", "verify", "vision", "window",
    "abstract", "attention", "compiler", "dataset", "diffuse", "entropy", "gradient", "inference", "machine",
    "matrix", "pipeline", "random", "research", "semantic", "sequence", "software", "syntax", "transform",
    "generation", "prediction", "repository", "validation"
  ].filter((word) => word.length >= 4 && word.length <= 10);
  const COMPANIES = [
    "SK-hynix", "Samsung", "Tesla", "Inception", "OpenAI", "NVIDIA", "Apple", "Google", "Microsoft",
    "Anthropic", "SpaceX", "Meta", "Amazon", "DeepMind", "Intel", "AMD", "IBM", "Oracle"
  ];

  const elements = {
    nickname: root.querySelector("[data-game-nickname]"),
    date: root.querySelector("[data-game-date]"),
    attempts: root.querySelector("[data-game-attempts]"),
    progress: root.querySelector("[data-game-progress]"),
    grid: root.querySelector("[data-mask-grid]"),
    output: root.querySelector("[data-game-output]"),
    form: root.querySelector("[data-guess-form]"),
    input: root.querySelector("[data-guess-input]"),
    used: root.querySelector("[data-game-used]"),
    leaderboard: root.querySelector("[data-leaderboard-list]")
  };

  const today = new Date().toISOString().slice(0, 10);
  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (_) { /* Private browsing fallback. */ }
    }
  };

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomDigits() {
    if (window.crypto?.getRandomValues) {
      const buffer = new Uint16Array(1);
      window.crypto.getRandomValues(buffer);
      return String(1000 + (buffer[0] % 9000));
    }
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  function getIdentity() {
    let deviceId = storage.get("diffusionHangmanDeviceId");
    if (!deviceId) {
      deviceId = window.crypto?.randomUUID?.() || "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) => (
        Number(character) ^ (Math.random() * 16 >> Number(character) / 4)
      ).toString(16));
      storage.set("diffusionHangmanDeviceId", deviceId);
    }

    let nickname = storage.get("diffusionHangmanNickname");
    if (!nickname) {
      const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
      nickname = `${company}-${randomDigits()}`;
      storage.set("diffusionHangmanNickname", nickname);
    }
    return { deviceId, nickname };
  }

  const identity = getIdentity();
  const word = WORDS[hashText(`uisang-diffusion-${today}`) % WORDS.length].toUpperCase();
  const stateKey = `diffusionHangman:${today}`;
  const savedState = (() => {
    try { return JSON.parse(storage.get(stateKey) || "null"); } catch (_) { return null; }
  })();
  const state = savedState && savedState.word === word ? savedState : {
    word,
    attempts: 0,
    letters: [],
    wordGuesses: [],
    solved: false,
    submitted: false
  };

  function persist() {
    storage.set(stateKey, JSON.stringify(state));
  }

  function revealedAt(index) {
    return state.solved || state.letters.includes(word[index]);
  }

  function setOutput(message, type) {
    elements.output.textContent = message;
    elements.output.classList.toggle("is-error", type === "error");
    elements.output.classList.toggle("is-success", type === "success");
  }

  function renderTokens(animatedIndices) {
    const animated = new Set(animatedIndices || []);
    elements.grid.style.setProperty("--token-count", word.length);
    elements.grid.replaceChildren(...word.split("").map((letter, index) => {
      const token = document.createElement("span");
      token.className = "mask-token";
      const isRevealed = revealedAt(index);
      token.textContent = isRevealed ? `[${letter}]` : "[MASK]";
      token.setAttribute("aria-label", isRevealed ? `Letter ${index + 1}: ${letter}` : `Letter ${index + 1}: masked`);
      if (isRevealed) token.classList.add("is-revealed");
      if (animated.has(index)) {
        token.classList.add("is-revealing");
        token.style.animationDelay = `${Math.random() * .32}s`;
      }
      return token;
    }));
  }

  function renderState(animatedIndices) {
    elements.nickname.textContent = identity.nickname;
    elements.date.textContent = today;
    const completedBlocks = Math.min(10, Math.floor(state.attempts / 10));
    elements.progress.textContent = `${"█".repeat(completedBlocks)}${"░".repeat(10 - completedBlocks)}`;
    elements.attempts.textContent = `${state.attempts}/${MAX_ATTEMPTS}`;
    elements.progress.classList.toggle("is-warning", state.attempts >= 70);
    elements.progress.classList.toggle("is-critical", state.attempts >= 90);
    elements.used.textContent = state.letters.length ? state.letters.join(" ") : "—";
    elements.input.disabled = state.solved || state.attempts >= MAX_ATTEMPTS;
    renderTokens(animatedIndices);
  }

  async function rpc(name, payload) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : null;
  }

  function renderLeaderboard(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-loading";
      empty.textContent = "No successful denoising yet.";
      elements.leaderboard.replaceChildren(empty);
      return;
    }

    elements.leaderboard.replaceChildren(...rows.map((row) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const score = document.createElement("span");
      name.textContent = row.nickname;
      score.className = "leaderboard-score";
      score.textContent = `${row.attempts} guess${Number(row.attempts) === 1 ? "" : "es"}`;
      if (row.nickname === identity.nickname) item.classList.add("is-current-player");
      item.append(name, score);
      return item;
    }));
  }

  async function loadLeaderboard() {
    try {
      renderLeaderboard(await rpc("get_diffusion_hangman_leaderboard"));
    } catch (_) {
      const offline = document.createElement("li");
      offline.className = "leaderboard-loading";
      offline.textContent = "Leaderboard is temporarily offline.";
      elements.leaderboard.replaceChildren(offline);
    }
  }

  async function submitScore() {
    if (!state.solved || state.submitted) return;
    try {
      await rpc("submit_diffusion_hangman_score", {
        p_device_id: identity.deviceId,
        p_nickname: identity.nickname,
        p_attempts: state.attempts
      });
      state.submitted = true;
      persist();
      await loadLeaderboard();
    } catch (_) {
      setOutput(`DENOISED in ${state.attempts} guesses. Score sync will retry later.`, "success");
    }
  }

  function completeIfSolved(animatedIndices) {
    const solved = word.split("").every((letter) => state.letters.includes(letter));
    if (!solved) return false;
    state.solved = true;
    persist();
    renderState(animatedIndices || word.split("").map((_, index) => index));
    setOutput(`DENOISED: ${word} in ${state.attempts} guesses.`, "success");
    submitScore();
    return true;
  }

  function processGuess(rawGuess) {
    if (state.solved || state.attempts >= MAX_ATTEMPTS) return;
    const guess = String(rawGuess || "").trim().toUpperCase();
    if (!/^[A-Z]+$/.test(guess)) {
      setOutput("Enter letters A–Z only.", "error");
      return;
    }

    if (guess.length !== 1 && guess.length !== word.length) {
      setOutput(`Enter one letter or a ${word.length}-letter word.`, "error");
      return;
    }

    if ((guess.length === 1 && state.letters.includes(guess)) || state.wordGuesses.includes(guess)) {
      setOutput(`${guess} was already sampled.`, "error");
      return;
    }

    state.attempts += 1;
    const newlyRevealed = [];
    if (guess.length === 1) {
      state.letters.push(guess);
      word.split("").forEach((letter, index) => {
        if (letter === guess) newlyRevealed.push(index);
      });
    } else {
      state.wordGuesses.push(guess);
      if (guess === word) {
        word.split("").forEach((letter) => {
          if (!state.letters.includes(letter)) state.letters.push(letter);
        });
        word.split("").forEach((_, index) => newlyRevealed.push(index));
      }
    }

    persist();
    elements.input.value = "";
    if (completeIfSolved(newlyRevealed)) return;

    renderState(newlyRevealed);
    if (state.attempts >= MAX_ATTEMPTS) {
      setOutput(`NOISE LIMIT reached. Today's word was ${word}.`, "error");
    } else if (newlyRevealed.length) {
      setOutput(`${guess} restored ${newlyRevealed.length} token${newlyRevealed.length === 1 ? "" : "s"}.`, "success");
    } else {
      setOutput(`${guess} remained noise. Continue sampling.`, "error");
    }
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    processGuess(elements.input.value);
  });

  renderState();
  if (state.solved) {
    setOutput(`DENOISED: ${word} in ${state.attempts} guesses.`, "success");
    submitScore();
  } else if (state.attempts >= MAX_ATTEMPTS) {
    setOutput(`NOISE LIMIT reached. Today's word was ${word}.`, "error");
  } else {
    setOutput(`Daily sample loaded: ${word.length} masked tokens.`, "success");
  }
  loadLeaderboard();
})();
