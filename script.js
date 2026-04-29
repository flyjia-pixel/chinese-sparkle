(() => {
  // Data for the mini learning game.
  const ITEMS = [
    { hanzi: "山", pinyin: "shān", meaning: "mountain", emoji: "⛰️" },
    { hanzi: "水", pinyin: "shuǐ", meaning: "water", emoji: "💧" },
    { hanzi: "火", pinyin: "huǒ", meaning: "fire", emoji: "🔥" },
    { hanzi: "月", pinyin: "yuè", meaning: "moon", emoji: "🌙" },
    { hanzi: "日", pinyin: "rì", meaning: "sun / day", emoji: "☀️" },
    { hanzi: "木", pinyin: "mù", meaning: "wood / tree", emoji: "🌳" },
    { hanzi: "土", pinyin: "tǔ", meaning: "earth / soil", emoji: "🌍" },
    { hanzi: "人", pinyin: "rén", meaning: "person", emoji: "🧑" },
    { hanzi: "大", pinyin: "dà", meaning: "big / large", emoji: "🔭" },
    { hanzi: "小", pinyin: "xiǎo", meaning: "small / little", emoji: "🐜" },
    { hanzi: "鸟", pinyin: "niǎo", meaning: "bird", emoji: "🐦" },
    { hanzi: "鱼", pinyin: "yú", meaning: "fish", emoji: "🐟" },
    { hanzi: "花", pinyin: "huā", meaning: "flower", emoji: "🌸" },
    { hanzi: "雨", pinyin: "yǔ", meaning: "rain", emoji: "🌧️" },
    { hanzi: "风", pinyin: "fēng", meaning: "wind", emoji: "💨" }
  ];

  const starsCountEl = document.getElementById("starsCount");
  const levelCountEl = document.getElementById("levelCount");
  const characterHanziEl = document.getElementById("characterHanzi");
  const pinyinTextEl = document.getElementById("pinyinText");
  const emojiHintEl = document.getElementById("emojiHint");
  const buttonsGridEl = document.getElementById("buttonsGrid");
  const feedbackEl = document.getElementById("feedback");
  const answerRevealedEl = document.getElementById("answerRevealed");
  const speakBtnEl = document.getElementById("speakBtn");
  const nextBtnEl = document.getElementById("nextBtn");
  const nextHelpEl = document.getElementById("nextHelp");
  const progressTextEl = document.getElementById("progressText");

  let stars = 0;
  let level = 1;
  let currentItem = null;
  let answeredCorrectly = false;
  let order = [];
  let orderIndex = 0;
  let roundNumber = 0;

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

  function shuffle(arr) {
    // Fisher-Yates shuffle
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

  function createButton(label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answerBtn";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (!currentItem || answeredCorrectly) return;
      const selectedMeaning = btn.dataset.meaning;
      const isCorrect = selectedMeaning === currentItem.meaning;

      if (isCorrect) {
        answeredCorrectly = true;
        btn.classList.add("correct");
        playCorrectSound();
        setFeedback("Great job!", "good");
        stars += 1;
        starsCountEl.textContent = String(stars);
        if (stars % 5 === 0) {
          level += 1;
          levelCountEl.textContent = String(level);
          setFeedback(`Level ${level}! Keep going! 🎉`, "good");
        }
        setAnswerRevealed(`Answer: ${currentItem.meaning}`);
        setNextState(true);
        setAnswerButtonsDisabled(true);
      } else {
        btn.classList.add("wrong");
        playWrongSound();
        setFeedback("Try again!", "bad");
        setAnswerRevealed("");
        setNextState(false);
        window.setTimeout(() => btn.classList.remove("wrong"), 450);
      }
    });
    btn.dataset.meaning = label;
    return btn;
  }

  function setAnswerButtonsDisabled(disabled) {
    const allBtns = buttonsGridEl.querySelectorAll("button.answerBtn");
    allBtns.forEach((button) => {
      button.disabled = disabled;
    });
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

    characterHanziEl.textContent = item.hanzi;
    pinyinTextEl.textContent = item.pinyin;
    emojiHintEl.textContent = item.emoji;
    if (progressTextEl) {
      const cardIndex = ((roundNumber - 1) % ITEMS.length) + 1;
      progressTextEl.textContent = `Card ${cardIndex} of ${ITEMS.length}`;
    }
    setFeedback("", null);
    setAnswerRevealed("");
    setNextState(false);

    // Create 3 unique meaning options (1 correct + 2 distractors).
    const meanings = ITEMS.map((x) => x.meaning);
    const distractors = meanings.filter((m) => m !== item.meaning);
    const pickedDistractors = shuffle(distractors).slice(0, 2);
    const options = shuffle([item.meaning, ...pickedDistractors]);

    buttonsGridEl.innerHTML = "";
    options.forEach((meaning) => {
      const btn = createButton(meaning);
      btn.textContent = meaning;
      buttonsGridEl.appendChild(btn);
    });
  }

  function speakCurrentItem() {
    if (!currentItem || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const hanziUtterance = new SpeechSynthesisUtterance(currentItem.hanzi);
    hanziUtterance.lang = "zh-CN";
    hanziUtterance.rate = 0.85;

    const pinyinUtterance = new SpeechSynthesisUtterance(currentItem.pinyin);
    pinyinUtterance.lang = "zh-CN";
    pinyinUtterance.rate = 0.85;

    window.speechSynthesis.speak(hanziUtterance);
    window.speechSynthesis.speak(pinyinUtterance);
  }

  function nextQuestion() {
    const item = getNextItem();
    renderQuestion(item);
  }

  const startScreenEl = document.getElementById("viewStart");
  const gameCardEl = document.getElementById("viewGame");
  const startBtnEl = document.getElementById("startBtn");
  const homeBtnEl = document.getElementById("homeBtn");

  speakBtnEl.addEventListener("click", speakCurrentItem);
  nextBtnEl.addEventListener("click", () => {
    if (!answeredCorrectly) return;
    nextQuestion();
  });

  homeBtnEl.addEventListener("click", () => {
    gameCardEl.style.display = "none";
    startScreenEl.style.display = "";
  });

  startBtnEl.addEventListener("click", () => {
    startScreenEl.style.display = "none";
    gameCardEl.style.display = "";
    stars = 0;
    level = 1;
    starsCountEl.textContent = "0";
    levelCountEl.textContent = "1";
    nextQuestion();
  });
})();

