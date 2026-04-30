(() => {
  const ITEMS = [
    { hanzi: "山", pinyin: "shān", meaning: "mountain", emoji: "⛰️" },
    { hanzi: "水", pinyin: "shuǐ", meaning: "water",      emoji: "💧" },
    { hanzi: "火", pinyin: "huǒ",  meaning: "fire",       emoji: "🔥" },
    { hanzi: "月", pinyin: "yuè",  meaning: "moon",       emoji: "🌙" },
    { hanzi: "日", pinyin: "rì",   meaning: "sun / day",  emoji: "☀️" },
    { hanzi: "木", pinyin: "mù",   meaning: "wood / tree",emoji: "🌳" },
    { hanzi: "土", pinyin: "tǔ",   meaning: "earth / soil",emoji:"🌍" },
    { hanzi: "人", pinyin: "rén",  meaning: "person",     emoji: "🧑" },
    { hanzi: "大", pinyin: "dà",   meaning: "big / large", emoji:"🔭" },
    { hanzi: "小", pinyin: "xiǎo", meaning: "small / little",emoji:"🐜"},
    { hanzi: "鸟", pinyin: "niǎo", meaning: "bird",       emoji: "🐦" },
    { hanzi: "鱼", pinyin: "yú",   meaning: "fish",       emoji: "🐟" },
    { hanzi: "花", pinyin: "huā",  meaning: "flower",     emoji: "🌸" },
    { hanzi: "雨", pinyin: "yǔ",   meaning: "rain",       emoji: "🌧️" },
    { hanzi: "风", pinyin: "fēng", meaning: "wind",       emoji: "💨" }
  ];

  const starsCountEl   = document.getElementById("starsCount");
  const levelCountEl   = document.getElementById("levelCount");
  const pinyinTextEl   = document.getElementById("pinyinText");
  const emojiHintEl    = document.getElementById("emojiHint");
  const buttonsGridEl  = document.getElementById("buttonsGrid");
  const feedbackEl     = document.getElementById("feedback");
  const answerRevealedEl = document.getElementById("answerRevealed");
  const speakBtnEl         = document.getElementById("speakBtn");
  const pinyinSpeakBtnEl   = document.getElementById("pinyinSpeakBtn");
  const nextBtnEl      = document.getElementById("nextBtn");
  const nextHelpEl     = document.getElementById("nextHelp");
  const progressTextEl = document.getElementById("progressText");

  let stars = 0;
  let level = 1;
  let currentItem = null;
  let answeredCorrectly = false;
  let order = [];
  let orderIndex = 0;
  let roundNumber = 0;

  // ── Audio ──────────────────────────────────────────────────────

  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playCorrectSound() {
    const ctx = getAudioCtx();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  function playWrongSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  // ── Helpers ────────────────────────────────────────────────────

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setFeedback(message, tone) {
    feedbackEl.textContent = message;
    feedbackEl.classList.remove("good", "bad");
    if (tone) feedbackEl.classList.add(tone);
  }

  function setAnswerRevealed(text) {
    answerRevealedEl.textContent = text;
  }

  function setNextState(enabled) {
    nextBtnEl.disabled = !enabled;
    if (nextHelpEl) {
      nextHelpEl.textContent = enabled
        ? "Great! Tap Next for a new character."
        : "Answer correctly to unlock Next.";
    }
  }

  function setAnswerButtonsDisabled(disabled) {
    buttonsGridEl.querySelectorAll("button.answerBtn").forEach(b => { b.disabled = disabled; });
  }

  // ── Reward animation ────────────────────────────────────────────
  // Sequence: snowman visible → cat slides out → snowball flies → cat hit reaction

  function playRewardAnimation(onDone) {
    const scene    = document.getElementById("rewardScene");
    const cat      = document.getElementById("sceneCat");
    const snowball = document.getElementById("sceneSnowball");

    // Reset to initial state
    cat.src = "assets/cat.svg";
    cat.classList.remove("catHitAnim");
    cat.style.transition = "none";
    cat.style.left    = "28%";
    cat.style.opacity = "0";
    cat.style.zIndex  = "1";
    snowball.style.transition = "none";
    snowball.style.left    = "-60px";
    snowball.style.bottom  = "20px";
    snowball.style.opacity = "0";
    scene.style.transition = "";
    scene.style.opacity    = "1";
    scene.style.display    = "block";

    // Re-enable transitions after reset frame
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cat.style.transition      = "left 0.55s cubic-bezier(0.34,1.4,0.64,1), opacity 0.25s ease";
      snowball.style.transition = "left 0.40s ease-in, bottom 0.40s ease-out, opacity 0.08s ease";

      // Step 1 (80ms): cat slides out from behind snowman to the right
      setTimeout(() => {
        cat.style.opacity = "1";
        cat.style.zIndex  = "3";
        cat.style.left    = "66%";
      }, 80);

      // Step 2 (760ms): snowball flies from left toward cat
      setTimeout(() => {
        snowball.style.opacity = "1";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          snowball.style.left   = "62%";
          snowball.style.bottom = "72px";
        }));
      }, 760);

      // Step 3 (1 200ms): snowball hits — swap to hit image, bounce cat
      setTimeout(() => {
        snowball.style.opacity = "0";
        cat.src = "assets/cat-hit.svg";
        cat.classList.add("catHitAnim");
      }, 1200);

      // Step 4 (2 100ms): fade scene out
      setTimeout(() => {
        scene.style.transition = "opacity 0.35s ease";
        scene.style.opacity    = "0";
      }, 2100);

      // Step 5 (2 450ms): hide completely, reset, fire callback
      setTimeout(() => {
        scene.style.display    = "none";
        scene.style.transition = "";
        cat.classList.remove("catHitAnim");
        if (onDone) onDone();
      }, 2450);
    }));
  }

  // ── Game logic ─────────────────────────────────────────────────

  function createButton(hanzi) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answerBtn";
    btn.textContent = hanzi;
    btn.dataset.hanzi = hanzi;

    btn.addEventListener("click", () => {
      if (!currentItem || answeredCorrectly) return;
      const isCorrect = btn.dataset.hanzi === currentItem.hanzi;

      if (isCorrect) {
        answeredCorrectly = true;
        btn.classList.add("correct");
        playCorrectSound();
        stars += 1;
        starsCountEl.textContent = String(stars);
        const leveledUp = stars % 5 === 0;
        if (leveledUp) {
          level += 1;
          levelCountEl.textContent = String(level);
        }
        setAnswerButtonsDisabled(true);

        playRewardAnimation(() => {
          setFeedback(
            leveledUp ? `Level ${level}! Keep going! 🎉` : "Great job!",
            "good"
          );
          setAnswerRevealed(`${currentItem.hanzi} = ${currentItem.meaning}`);
          setNextState(true);
        });
      } else {
        btn.classList.add("wrong");
        playWrongSound();
        setFeedback("Try again!", "bad");
        setAnswerRevealed("");
        setNextState(false);
        window.setTimeout(() => btn.classList.remove("wrong"), 450);
      }
    });

    return btn;
  }

  function getNextItem() {
    if (order.length === 0 || orderIndex >= order.length) {
      order = shuffle([...ITEMS]);
      orderIndex = 0;
    }
    const item = order[orderIndex];
    orderIndex += 1;
    return item;
  }

  function renderQuestion(item) {
    currentItem = item;
    answeredCorrectly = false;
    roundNumber += 1;

    pinyinTextEl.textContent = item.pinyin;
    emojiHintEl.textContent  = item.emoji;

    if (progressTextEl) {
      const cardIndex = ((roundNumber - 1) % ITEMS.length) + 1;
      progressTextEl.textContent = `Card ${cardIndex} of ${ITEMS.length}`;
    }

    setFeedback("", null);
    setAnswerRevealed("");
    setNextState(false);

    // Build 3 hanzi choices: 1 correct + 2 random distractors
    const allHanzi    = ITEMS.map(x => x.hanzi);
    const distractors = shuffle(allHanzi.filter(h => h !== item.hanzi)).slice(0, 2);
    const options     = shuffle([item.hanzi, ...distractors]);

    buttonsGridEl.innerHTML = "";
    options.forEach(hanzi => buttonsGridEl.appendChild(createButton(hanzi)));

    // Auto-speak the pronunciation after a short render delay
    setTimeout(speakCurrentItem, 300);
  }

  function speakCurrentItem() {
    if (!currentItem || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(currentItem.hanzi);
    utt.lang = "zh-CN";
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  }

  function nextQuestion() {
    renderQuestion(getNextItem());
  }

  // ── Event wiring ───────────────────────────────────────────────

  const startScreenEl = document.getElementById("viewStart");
  const gameCardEl    = document.getElementById("viewGame");
  const startBtnEl    = document.getElementById("startBtn");
  const homeBtnEl     = document.getElementById("homeBtn");

  speakBtnEl.addEventListener("click", speakCurrentItem);
  pinyinSpeakBtnEl.addEventListener("click", speakCurrentItem);

  nextBtnEl.addEventListener("click", () => {
    if (!answeredCorrectly) return;
    nextQuestion();
  });

  homeBtnEl.addEventListener("click", () => {
    gameCardEl.style.display  = "none";
    startScreenEl.style.display = "";
  });

  startBtnEl.addEventListener("click", () => {
    startScreenEl.style.display = "none";
    gameCardEl.style.display    = "";
    stars = 0; level = 1;
    starsCountEl.textContent  = "0";
    levelCountEl.textContent  = "1";
    nextQuestion();
  });
})();
