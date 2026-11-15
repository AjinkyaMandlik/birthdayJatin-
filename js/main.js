"use strict";
const data = window.PAPA_DATA;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let muted = false;
let audioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function shutterSound() {
  if (muted) return;
  const context = getAudioContext();
  if (!context) return;
  const length = context.sampleRate * 0.09;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.38, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.09);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

function flash() {
  if (reducedMotion) return;
  const element = $("#flash");
  element.classList.remove("flash-on");
  void element.offsetWidth;
  element.classList.add("flash-on");
}

function celebrate(count = 150) {
  if (typeof confetti === "function") {
    confetti({ particleCount: count, spread: 85, origin: { y: 0.58 }, colors: ["#e1c47a", "#8fb6d8", "#fffaf0", "#6b7db3"] });
  }
}

function initStars() {
  const canvas = $("#stars");
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  let stars = [];

  function resize() {
    canvas.width = innerWidth * pixelRatio;
    canvas.height = innerHeight * pixelRatio;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    const count = innerWidth < 700 ? 65 : 170;
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: (Math.random() * 1.2 + 0.35) * pixelRatio,
      phase: Math.random() * 6.28,
      speed: Math.random() * 0.02 + 0.006
    }));
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((star) => {
      star.phase += star.speed;
      context.globalAlpha = 0.35 + Math.abs(Math.sin(star.phase)) * 0.65;
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
    if (!reducedMotion) requestAnimationFrame(draw);
  }

  addEventListener("resize", resize);
  resize();
  draw();
}

function setupIntro() {
  const focusBox = $(".focus-box");
  setTimeout(() => {
    focusBox.classList.add("locked");
    $("#ready-status").textContent = "READY";
  }, 1800);

  $("#shutter").addEventListener("click", () => {
    getAudioContext();
    shutterSound();
    flash();
    setTimeout(() => {
      $("#camera-intro").classList.add("hidden");
      $("#main-content").hidden = false;
      $("#persistent-hud").classList.add("visible");
      $("#corner-player").classList.add("visible");
      $("#secret-star").hidden = false;
      $("#secret-star").classList.add("visible");
      setupTitle();
      celebrate(180);
    }, 260);
  }, { once: true });
}

function setupTitle() {
  const heading = $("#title-heading");
  const text = `वाढदिवसाच्या हार्दिक शुभेच्छा, ${data.name}!`;
  if (reducedMotion) {
    heading.textContent = text;
  } else {
    let index = 0;
    const timer = setInterval(() => {
      heading.textContent = text.slice(0, ++index);
      if (index >= text.length) clearInterval(timer);
    }, 90);
  }
  $("#title-line").textContent = data.titleLine;
  $("#final-thank").textContent = data.titleLine;
}

function setupGallery() {
  $("#gallery").innerHTML = data.gallery.map((item) => `
    <button class="polaroid" type="button" data-full="${item.image}" data-caption="${item.caption}">
      <img class="${item.fit === "contain" ? "photo-full" : ""}" src="${item.image}" alt="${item.alt}" onerror="this.onerror=null;this.src='assets/images/placeholder.svg'">
      <span>${item.caption}</span>
    </button>`).join("");
  $$(".polaroid").forEach((button) => button.addEventListener("click", () => openLightbox(button.dataset.full, button.dataset.caption)));
}

function openLightbox(src, caption) {
  const image = $("#lightbox-image");
  image.src = src;
  image.alt = caption;
  image.onerror = () => { image.onerror = null; image.src = "assets/images/placeholder.svg"; };
  $("#lightbox-caption").textContent = caption;
  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  $("#lightbox").hidden = true;
  document.body.style.overflow = "";
}

function setupReasons() {
  const reasons = Array.from({ length: data.age }, (_, index) => data.reasonTemplates[index] || data.reasonTemplates[index % data.reasonTemplates.length]);
  $("#reasons-grid").innerHTML = reasons.map((reason, index) => `
    <button class="reason-card" type="button" aria-label="कारण ${index + 1}">
      <span class="reason-inner"><span class="reason-face reason-front">${index + 1}</span><span class="reason-face reason-back">${reason}</span></span>
    </button>`).join("");
  $$(".reason-card").forEach((card) => card.addEventListener("click", () => card.classList.toggle("flipped")));
}

function setupMessages() {
  $("#messages-grid").innerHTML = data.messages.map((message) => `
    <article class="message-card"><h3>${message.name}</h3><small>${message.relation}</small><p>“${message.message}”</p></article>`).join("");
}

function setupSongs() {
  const audio = $("#corner-song-audio");
  const toggle = $("#corner-song-toggle");
  const select = $("#corner-song-select");
  const cornerProgress = $("#corner-song-progress");
  const cornerStatus = $("#corner-song-status");
  const cornerPrev = $("#corner-song-prev");
  const cornerNext = $("#corner-song-next");
  const cornerStop = $("#corner-song-stop");
  const cornerVolumeDown = $("#corner-volume-down");
  const cornerVolumeUp = $("#corner-volume-up");
  const boardPlay = $("#board-play");
  const boardPrev = $("#board-prev");
  const boardNext = $("#board-next");
  const boardProgress = $("#board-song-progress");
  const boardStatus = $("#board-song-status");
  let currentIndex = 0;
  let startAt = 0;
  let introSkipPending = false;

  select.innerHTML = data.songs.map((song, index) => `<option value="${index}">${song.title} — ${song.singer}</option>`).join("");
  audio.volume = 0.7;

  function load(index) {
    currentIndex = index;
    const song = data.songs[index];
    startAt = song.startAt || 0;
    introSkipPending = false;
    audio.pause();
    audio.muted = false;
    audio.src = song.file;
    select.value = String(index);
    $("#board-song-title").textContent = song.title;
    $("#board-song-singer").textContent = song.singer;
    cornerStatus.textContent = `${song.title} — ${song.singer}`;
    boardStatus.textContent = "";
    cornerProgress.value = 0;
    boardProgress.value = 0;
    toggle.textContent = "♪";
    boardPlay.textContent = "▶";
  }

  function setPlayState(playing) {
    toggle.textContent = playing ? "❚❚" : "♪";
    boardPlay.textContent = playing ? "❚❚" : "▶";
    toggle.setAttribute("aria-label", playing ? "गाणे थांबवा" : "गाणे प्ले करा");
    boardPlay.setAttribute("aria-label", playing ? "गीत थांबवा" : "गीत प्ले करा");
  }

  function changeTrack(index) {
    const wasPlaying = !audio.paused;
    load(index);
    if (wasPlaying) playPause();
  }

  function stopPlayback() {
    audio.pause();
    introSkipPending = false;
    audio.muted = false;
    if (audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(startAt, Math.max(0, audio.duration - 0.05));
    }
    cornerProgress.value = 0;
    boardProgress.value = 0;
    setPlayState(false);
  }

  function adjustVolume(change) {
    audio.volume = Math.max(0, Math.min(1, Math.round((audio.volume + change) * 10) / 10));
    const percent = Math.round(audio.volume * 100);
    cornerVolumeDown.setAttribute("aria-label", `आवाज कमी करा (${percent}%)`);
    cornerVolumeUp.setAttribute("aria-label", `आवाज वाढवा (${percent}%)`);
  }

  function applyStartOffset() {
    if (!startAt || !Number.isFinite(audio.duration)) return;
    const target = Math.min(startAt, Math.max(0, audio.duration - 0.05));
    if (audio.currentTime < target) {
      introSkipPending = true;
      audio.muted = true;
      audio.currentTime = target;
    }
  }

  async function waitForMetadata() {
    if (audio.readyState >= 1) return;
    await new Promise((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error("Audio metadata unavailable")); };
      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("error", onError);
      };
      audio.addEventListener("loadedmetadata", onLoaded, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });
  }

  async function playPause() {
    if (audio.paused) {
      try {
        await waitForMetadata();
        applyStartOffset();
        await audio.play();
        setPlayState(true);
        getAudioContext();
      } catch (error) {
        introSkipPending = false;
        audio.muted = false;
        cornerStatus.textContent = "MP3 फाइल अजून उपलब्ध नाही";
        boardStatus.textContent = "MP3 फाइल अजून उपलब्ध नाही";
      }
    } else {
      audio.pause();
      setPlayState(false);
    }
  }

  load(0);
  select.addEventListener("change", () => load(Number(select.value)));
  toggle.addEventListener("click", playPause);
  boardPlay.addEventListener("click", playPause);
  cornerPrev.addEventListener("click", () => changeTrack((currentIndex - 1 + data.songs.length) % data.songs.length));
  boardPrev.addEventListener("click", () => changeTrack((currentIndex - 1 + data.songs.length) % data.songs.length));
  cornerNext.addEventListener("click", () => changeTrack((currentIndex + 1) % data.songs.length));
  boardNext.addEventListener("click", () => changeTrack((currentIndex + 1) % data.songs.length));
  cornerStop.addEventListener("click", stopPlayback);
  cornerVolumeDown.addEventListener("click", () => adjustVolume(-0.1));
  cornerVolumeUp.addEventListener("click", () => adjustVolume(0.1));
  audio.addEventListener("timeupdate", () => {
    if (introSkipPending) {
      const lastRange = audio.seekable.length - 1;
      if (audio.currentTime >= startAt) {
        introSkipPending = false;
        audio.muted = false;
      } else if (lastRange >= 0 && audio.seekable.end(lastRange) >= startAt) {
        applyStartOffset();
      }
    }
    if (audio.duration) {
      const playableDuration = Math.max(0.01, audio.duration - startAt);
      const value = Math.max(0, Math.min(100, (audio.currentTime - startAt) / playableDuration * 100));
      cornerProgress.value = value;
      boardProgress.value = value;
    }
  });
  audio.addEventListener("seeked", () => {
    if (introSkipPending && audio.currentTime >= startAt) {
      introSkipPending = false;
      audio.muted = false;
    }
  });
  audio.addEventListener("loadedmetadata", applyStartOffset);
  audio.addEventListener("error", () => {
    cornerStatus.textContent = "MP3 फाइल अजून उपलब्ध नाही";
    boardStatus.textContent = "MP3 फाइल अजून उपलब्ध नाही";
  });
  audio.addEventListener("ended", () => {
    setPlayState(false);
  });
  function seek(value) {
    if (audio.duration) audio.currentTime = startAt + value / 100 * Math.max(0, audio.duration - startAt);
  }
  cornerProgress.addEventListener("input", () => seek(Number(cornerProgress.value)));
  boardProgress.addEventListener("input", () => seek(Number(boardProgress.value)));
}

function setupCake() {
  const candles = $("#candles");
  const cake = $("#cake");
  const light = $("#light-candles");
  const mic = $("#mic-button");
  const fallback = $("#fallback-blow");
  const status = $("#cake-status");
  candles.innerHTML = Array.from({ length: 5 }, () => '<span class="candle"><span class="flame"></span></span>').join("");
  let lit = false;

  light.addEventListener("click", () => {
    lit = true;
    candles.className = "candles lit";
    status.textContent = "मेणबत्त्या पेटल्या — इच्छा धरून फुंक मारूया.";
    light.disabled = true;
    fallback.disabled = false;
    mic.disabled = !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  });

  function blow() {
    if (!lit) return;
    lit = false;
    candles.className = "candles blown";
    status.textContent = "तुमची इच्छा आकाशात निघून गेली! वाढदिवसाच्या शुभेच्छा! 🎉";
    mic.disabled = true;
    fallback.disabled = true;
    light.disabled = false;
    light.textContent = "परत पेटवा";
    cake.setAttribute("aria-label", "मेणबत्त्या विझलेला वाढदिवसाचा केक");
    celebrate(260);
  }

  fallback.addEventListener("click", blow);
  mic.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = getAudioContext();
      if (!context) return;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      status.textContent = "आता फुंक मारा...";
      mic.disabled = true;
      let strong = 0;

      function detect() {
        if (!lit) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        analyser.getByteFrequencyData(values);
        const volume = values.reduce((sum, value) => sum + value, 0) / values.length;
        strong = volume > 42 ? strong + 1 : Math.max(0, strong - 1);
        if (strong >= 4) {
          stream.getTracks().forEach((track) => track.stop());
          blow();
        } else {
          requestAnimationFrame(detect);
        }
      }
      detect();
    } catch (error) {
      status.textContent = "माइकची परवानगी नाही — फुंकाचा बटण वापरा.";
      fallback.focus();
    }
  });
}

function setupGift() {
  const gift = $("#gift-box");
  const message = $("#gift-message");
  gift.addEventListener("click", () => {
    const opening = !gift.classList.contains("open");
    gift.classList.toggle("open", opening);
    gift.setAttribute("aria-expanded", String(opening));

    if (opening) {
      const letter = data.letter.replace("{{MY_NAME}}", data.myName);
      message.innerHTML = letter.split("\n\n").map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`).join("");
      message.classList.add("visible");
      celebrate(130);
    } else {
      message.classList.remove("visible");
      setTimeout(() => { message.innerHTML = ""; }, 550);
    }
  });
}

let quizIndex = 0;
let quizAnswers = [];
function setupQuiz() {
  quizIndex = 0;
  quizAnswers = [];
  renderQuiz();
}
function renderQuiz() {
  const card = $("#quiz-card");
  if (quizIndex >= data.quiz.length) {
    const score = quizAnswers.reduce((total, answer, index) => total + (answer === data.quiz[index].answer ? 1 : 0), 0);
    card.innerHTML = `<div class="quiz-result"><p>क्विझ पूर्ण</p><strong>${score}/${data.quiz.length}</strong><p>${score === 5 ? "उत्तम! पप्पांना पूर्णपणे ओळखता!" : "छान प्रयत्न! पप्पांच्या कथा अजून ऐकूया."}</p><button class="camera-button" id="quiz-restart" type="button">पुन्हा खेळा</button></div>`;
    $("#quiz-restart").addEventListener("click", setupQuiz);
    if (score === 5) celebrate(220);
    return;
  }
  const question = data.quiz[quizIndex];
  card.innerHTML = `<div class="quiz-progress">प्रश्न ${quizIndex + 1} / ${data.quiz.length}</div><h3>${question.question}</h3><div class="quiz-options">${question.options.map((option, index) => `<button class="quiz-option" data-index="${index}" type="button">${option}</button>`).join("")}</div><div class="quiz-actions"><button id="quiz-next" class="camera-button" type="button" disabled>पुढे</button></div>`;
  let selected = null;
  $$(".quiz-option", card).forEach((button) => {
    button.addEventListener("click", () => {
      $$(".quiz-option", card).forEach((option) => option.classList.remove("selected"));
      button.classList.add("selected");
      selected = Number(button.dataset.index);
      $("#quiz-next").disabled = false;
    });
  });
  $("#quiz-next").addEventListener("click", () => {
    quizAnswers.push(selected);
    quizIndex++;
    renderQuiz();
  });
}

function setupScrapbook() {
  const scrapbook = data.scrapbook;
  if (!scrapbook) return;

  $("#scrapbook-title").innerHTML = [...scrapbook.title].map((letter, index) => `<span class="ransom-letter letter-${index % 6}" style="--letter-i:${index}">${letter}</span>`).join("");
  const license = scrapbook.license;
  $("#license-name").textContent = license.name;
  $("#license-number").textContent = license.number;
  $("#license-dob").textContent = license.dob;
  $("#license-place").textContent = license.placeOfIssue;
  $("#license-text").textContent = license.text;
  $("#license-photo").src = license.photo;
  $("#license-photo").alt = license.name + " — passport photo";
  $(".void-stamp").textContent = license.voidText;

  let cameraIndex = 0;
  $("#camera-click").addEventListener("click", () => {
    cameraIndex = (cameraIndex + 1) % scrapbook.cameraPhotos.length;
    const photo = scrapbook.cameraPhotos[cameraIndex];
    $("#camera-photo").setAttribute("href", photo.src);
    $("#camera-photo").setAttribute("alt", photo.alt);
    shutterSound();
    if (!reducedMotion) {
      const cameraFlash = $("#camera-flash");
      cameraFlash.classList.remove("flash");
      void cameraFlash.offsetWidth;
      cameraFlash.classList.add("flash");
    }
  });

  $("#music-card-photo").src = scrapbook.musicCard.photo;
  $("#music-card-photo").alt = scrapbook.musicCard.alt;

  const envelope = $(".envelope-card");
  $("#gift-envelopes").addEventListener("click", () => {
    const opening = !envelope.classList.contains("open");
    envelope.classList.toggle("open", opening);
    $("#envelope-note").textContent = scrapbook.envelopeMessage;
    $("#envelope-note").classList.toggle("visible", opening);
  });

  const stickerLayer = $("#sticker-layer");
  stickerLayer.innerHTML = "";
  const fallbacks = { bow: "🎀", star: "★", bunny: "🐰", clip: "📎", washi: "▦", strawberry: "🍓", "star-small": "✦" };

  scrapbook.stickers.forEach((item) => {
    const sticker = document.createElement("button");
    sticker.type = "button";
    sticker.className = `sticker sticker-${item.type} draggable`;
    sticker.style.left = item.x + "%";
    sticker.style.top = item.y + "%";
    sticker.style.setProperty("--stick-rotate", item.rotate + "deg");
    sticker.setAttribute("aria-label", item.label);
    sticker.textContent = fallbacks[item.type] || "★";
    stickerLayer.append(sticker);
  });

  let zIndex = 10;
  $$(".sticker", stickerLayer).forEach((sticker) => {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    sticker.addEventListener("pointerdown", (event) => {
      dragging = true;
      sticker.setPointerCapture(event.pointerId);
      sticker.style.zIndex = String(++zIndex);
      const rect = sticker.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      originLeft = rect.left;
      originTop = rect.top;
    });

    sticker.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const boardRect = $("#scrapbook-board").getBoundingClientRect();
      const left = originLeft - startX + event.clientX - boardRect.left;
      const top = originTop - startY + event.clientY - boardRect.top;
      sticker.style.left = left / boardRect.width * 100 + "%";
      sticker.style.top = top / boardRect.height * 100 + "%";
    });

    sticker.addEventListener("pointerup", () => {
      dragging = false;
      if (!reducedMotion) {
        sticker.classList.remove("wiggle");
        void sticker.offsetWidth;
        sticker.classList.add("wiggle");
      }
    });
  });

  $("#scrapbook-reset").addEventListener("click", () => {
    $$(".sticker", stickerLayer).forEach((sticker, index) => {
      const item = scrapbook.stickers[index];
      sticker.style.left = item.x + "%";
      sticker.style.top = item.y + "%";
      sticker.style.zIndex = "";
    });
  });
}

function setupShots() {
  const total = 9;
  if (reducedMotion) {
    $$(".reveal-shot").forEach((element) => element.classList.add("developed"));
    $$(".letter-line").forEach((element) => element.classList.add("visible"));
    return;
  }
  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const section = entry.target;
      const number = section.dataset.shot;
      if (!seen.has(number)) {
        seen.add(number);
        $("#shot-counter").textContent = `SHOT ${number} / ${total}`;
        shutterSound();
        flash();
      }
      section.querySelectorAll(".reveal-shot").forEach((element, index) => {
        setTimeout(() => element.classList.add("developed"), index * 110);
      });
      section.querySelectorAll(".letter-line").forEach((element, index) => {
        setTimeout(() => element.classList.add("visible"), index * 260);
      });
    });
  }, { threshold: 0.42 });
  $$(".shot").forEach((section) => observer.observe(section));
}

function setupEasterEgg() {
  let clicks = 0;
  $("#secret-star").addEventListener("click", () => {
    clicks++;
    if (clicks >= 5) {
      $("#secret-message").textContent = data.secretMessage;
      $("#secret-message").classList.add("visible");
      const shootingStar = $(".shooting-star");
      shootingStar.classList.remove("fly");
      void shootingStar.offsetWidth;
      shootingStar.classList.add("fly");
      celebrate(300);
      clicks = 0;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initStars();
  setupGallery();
  setupScrapbook();
  setupReasons();
  setupMessages();
  setupSongs();
  setupCake();
  setupGift();
  setupQuiz();
  setupEasterEgg();
  setupIntro();
  setupShots();

  $("#lightbox-close").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
  $("#mute-button").addEventListener("click", (event) => {
    muted = !muted;
    event.currentTarget.textContent = muted ? "🔇" : "🔊";
    event.currentTarget.setAttribute("aria-pressed", String(muted));
  });
  $("#replay").addEventListener("click", () => {
    scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });
});
