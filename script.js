// LOCAL LOOP
// Six small browser-only tools. Data is intentionally local so the demo works from index.html.

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  // Draw a lightweight connected network behind the page. It reacts to pointer and touch movement.
  const networkCanvas = $("#ambient-network");
  const networkContext = networkCanvas.getContext("2d");
  const networkNodes = [];
  const networkPointer = { x: -1000, y: -1000 };
  const networkReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resizeNetwork = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    networkCanvas.width = window.innerWidth * ratio;
    networkCanvas.height = window.innerHeight * ratio;
    networkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!networkNodes.length) {
      const count = window.innerWidth < 640 ? 28 : 54;
      for (let index = 0; index < count; index += 1) networkNodes.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - .5) * .38, vy: (Math.random() - .5) * .38, radius: 1.6 + Math.random() * 2.4 });
    }
  };
  const drawNetwork = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    networkContext.clearRect(0, 0, width, height);
    const light = document.body.classList.contains("light-theme");
    const nodeColor = light ? "rgba(28,28,28,.52)" : "rgba(255,255,255,.62)";
    const lineColor = light ? "rgba(28,28,28,.18)" : "rgba(255,255,255,.20)";
    networkNodes.forEach((node) => {
      if (!networkReduced && !document.body.classList.contains("motion-off")) {
        node.x += node.vx; node.y += node.vy;
        if (node.x < -30 || node.x > width + 30) node.vx *= -1;
        if (node.y < -30 || node.y > height + 30) node.vy *= -1;
        const dx = networkPointer.x - node.x; const dy = networkPointer.y - node.y; const distance = Math.hypot(dx, dy);
        if (distance < 220 && distance > 0) { node.x -= dx / distance * .45; node.y -= dy / distance * .45; }
      }
    });
    networkNodes.forEach((node, index) => {
      networkNodes.slice(index + 1).forEach((other) => {
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance < 190) {
          networkContext.strokeStyle = lineColor; networkContext.lineWidth = distance < 95 ? 1.4 : .8; networkContext.beginPath(); networkContext.moveTo(node.x, node.y); networkContext.lineTo(other.x, other.y); networkContext.stroke();
        }
      });
      networkContext.fillStyle = nodeColor; networkContext.beginPath(); networkContext.arc(node.x, node.y, node.radius, 0, Math.PI * 2); networkContext.fill();
    });
    if (!networkReduced) requestAnimationFrame(drawNetwork);
  };
  resizeNetwork();
  window.addEventListener("resize", resizeNetwork);
  window.addEventListener("pointermove", (event) => { networkPointer.x = event.clientX; networkPointer.y = event.clientY; }, { passive: true });
  window.addEventListener("pointerleave", () => { networkPointer.x = -1000; networkPointer.y = -1000; });
  drawNetwork();

  // Give each action a small pulse and a few particles travelling toward the dashboard.
  const emitAction = (source) => {
    if (!source || document.body.classList.contains("motion-off") || networkReduced) return;
    source.classList.remove("module-pulse"); void source.offsetWidth; source.classList.add("module-pulse");
    const rect = source.getBoundingClientRect();
    for (let index = 0; index < 5; index += 1) {
      const particle = document.createElement("span");
      particle.className = "ambient-particle";
      particle.style.left = `${rect.left + rect.width * (.35 + Math.random() * .3)}px`;
      particle.style.top = `${rect.top + rect.height * (.35 + Math.random() * .3)}px`;
      particle.style.setProperty("--particle-x", `${(window.innerWidth * .72) - rect.left + (Math.random() * 60 - 30)}px`);
      particle.style.setProperty("--particle-y", `${60 - rect.top + (Math.random() * 40 - 20)}px`);
      particle.style.animationDelay = `${index * 40}ms`;
      document.body.appendChild(particle);
      window.setTimeout(() => particle.remove(), 950);
    }
  };

  const updateSummary = () => {
    const setMetric = (name, value, detail) => {
      const metric = $(`[data-summary="${name}"]`);
      const note = $(`[data-summary-detail="${name}"]`);
      if (metric) metric.textContent = value;
      if (note) note.textContent = detail;
    };
    const lostItems = $$(".tool-lost .item-row");
    setMetric("lost", String(lostItems.length).padStart(2, "0"), "items waiting");
    const lunchOptions = $$('[data-vote-count]').map((item) => ({ name: item.dataset.voteCount, count: Number(item.textContent) }));
    const topLunch = lunchOptions.sort((a, b) => b.count - a.count)[0];
    setMetric("lunch", topLunch ? topLunch.name : "NONE", topLunch ? `${topLunch.count} votes` : "no votes yet");
    const booking = read("local-loop-booking", null);
    setMetric("room", booking ? "BOOKED" : "OPEN", booking ? booking.room : "no room reserved");
    const homework = read("local-loop-homework", []);
    const openHomework = homework.filter((task) => !task.done).length;
    setMetric("homework", String(openHomework).padStart(2, "0"), openHomework === 1 ? "open task" : "open tasks");
    const issues = read("local-loop-issues", []);
    setMetric("issues", String(issues.length).padStart(2, "0"), issues.length === 1 ? "report nearby" : "reports nearby");
    const cafe = read("local-loop-cafe-order", []);
    const cafeCount = cafe.reduce((total, item) => total + Number(item.quantity || 0), 0);
    setMetric("cafe", cafeCount ? String(cafeCount).padStart(2, "0") : "EMPTY", cafeCount ? "items to pick up" : "nothing selected");
  };

  // Hide the header on downward scroll, then reveal it when the user scrolls back up.
  const header = $("[data-header]");
  let lastScroll = window.scrollY;
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    header.classList.toggle("is-hidden", current > 48 && current > lastScroll);
    header.classList.toggle("is-visible", current < 48 || current <= lastScroll);
    lastScroll = current;
  }, { passive: true });

  // Theme preference is stored locally so the page reopens in the user's chosen mode.
  const themeToggle = $("[data-theme-toggle]");
  const themeLabel = $("[data-theme-label]");
  const themeIcon = $("[data-theme-icon]");
  const savedTheme = localStorage.getItem("local-loop-theme");
  const applyTheme = (light) => {
    document.body.classList.toggle("light-theme", light);
    themeToggle.setAttribute("aria-pressed", String(light));
    themeLabel.textContent = light ? "Dark mode" : "Light mode";
    themeIcon.textContent = light ? "☾" : "☼";
  };
  applyTheme(savedTheme === "light");
  themeToggle.addEventListener("click", () => {
    const light = !document.body.classList.contains("light-theme");
    localStorage.setItem("local-loop-theme", light ? "light" : "dark");
    applyTheme(light);
  });

  // One search field filters every module card by its visible text.
  const searchInput = $("[data-global-search]");
  const searchStatus = $("[data-search-status]");
  const moduleCards = $$(".tool-card");
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let matches = 0;
    moduleCards.forEach((card) => {
      const found = !query || card.textContent.toLowerCase().includes(query);
      card.classList.toggle("search-hidden", !found);
      if (found) matches += 1;
    });
    searchStatus.textContent = query ? `${matches} module${matches === 1 ? "" : "s"} match` : "6 modules available";
  });

  // Mobile menu.
  const menuButton = $("[data-menu-button]");
  const mobileMenu = $("[data-mobile-menu]");
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    mobileMenu.classList.toggle("is-open", !open);
  });
  $$('[data-mobile-menu] a').forEach((link) => link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    mobileMenu.classList.remove("is-open");
  }));

  // Toggle motion labels while respecting the user's reduced-motion preference.
  const motionButtons = $$('[data-motion-toggle]');
  const motionLabel = $("[data-motion-label]");
  motionButtons.forEach((button) => button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") === "true";
    motionButtons.forEach((item) => {
      item.setAttribute("aria-pressed", String(!active));
      item.classList.toggle("is-active", !active);
      item.classList.toggle("is-off", active);
    });
    document.body.classList.toggle("motion-off", active);
    if (motionLabel) motionLabel.textContent = active ? "Motion / off" : "Motion / on";
  }));

  // Pointer spotlight on the large opening card.
  const spotlight = $("[data-spotlight]");
  if (spotlight) spotlight.addEventListener("pointermove", (event) => {
    const rect = spotlight.getBoundingClientRect();
    spotlight.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    spotlight.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  });

  // Scroll progress line.
  const focusSection = $(".focus-section");
  const progress = $("[data-progress-bar]");
  const updateProgress = () => {
    if (!focusSection || !progress) return;
    const rect = focusSection.getBoundingClientRect();
    const amount = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (rect.height + window.innerHeight)));
    progress.style.width = `${Math.round(18 + amount * 62)}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // Reveal content as it enters the viewport so long pages feel structured while scrolling.
  const revealTargets = $$(".facts-strip, .section, .tool-card, .track-card, .prize-orbit, .details-card, .rsvp-frame");
  revealTargets.forEach((element, index) => {
    element.classList.add("reveal-target");
    element.style.setProperty("--reveal-delay", `${Math.min(index * 35, 240)}ms`);
  });
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  revealTargets.forEach((element) => revealObserver.observe(element));

  // Move the hero/network layer gently with page scroll; this is the cursor-like depth cue on touch devices too.
  const updateParallax = () => {
    const scrollY = window.scrollY;
    const shift = Math.min(scrollY * -0.12, 0);
    const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = pageHeight > 0 ? (scrollY / pageHeight) * 100 : 0;
    document.documentElement.style.setProperty("--hero-shift", `${shift}px`);
    document.documentElement.style.setProperty("--network-shift", `${scrollY * 0.08}px`);
    document.documentElement.style.setProperty("--page-progress", `${pageProgress}%`);
    document.documentElement.style.setProperty("--card-drift", `${Math.sin(scrollY / 160) * 3}px`);
  };
  window.addEventListener("scroll", updateParallax, { passive: true });
  updateParallax();

  // Shared tab behavior for the information section.
  const tabs = $$('[data-tab]');
  const panels = $$('[data-panel]');
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    panels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== target));
  }));

  // 1. Lost and found: claim buttons update the item label locally.
  $$('[data-claim]').forEach((button) => button.addEventListener("click", () => {
    button.textContent = button.textContent === "Claim" ? "Claimed" : "Claim";
    button.classList.toggle("is-claimed");
    emitAction(button.closest(".tool-card"));
    updateSummary();
  }));

  // 2. Lunch poll: one vote per browser, with visible counts.
  const pollKey = "local-loop-lunch-vote";
  const savedVote = localStorage.getItem(pollKey);
  const pollStatus = $("[data-poll-status]");
  $$('[data-vote]').forEach((button) => {
    if (button.dataset.vote === savedVote) button.classList.add("is-voted");
    button.addEventListener("click", () => {
      const previous = localStorage.getItem(pollKey);
      if (previous === button.dataset.vote) return;
      if (previous) {
        const oldCount = $(`[data-vote-count="${previous}"]`);
        oldCount.textContent = Math.max(0, Number(oldCount.textContent) - 1);
      }
      const count = $(`[data-vote-count="${button.dataset.vote}"]`);
      count.textContent = Number(count.textContent) + 1;
      localStorage.setItem(pollKey, button.dataset.vote);
      $$('[data-vote]').forEach((item) => item.classList.remove("is-voted"));
      button.classList.add("is-voted");
      pollStatus.textContent = `Your vote: ${button.dataset.vote}`;
      emitAction(button.closest(".tool-card"));
      updateSummary();
    });
  });
  if (savedVote) pollStatus.textContent = `Your vote: ${savedVote}`;

  // 3. Room booking: save the latest local booking and show confirmation.
  const bookingForm = $("[data-booking-form]");
  const bookingStatus = $("[data-booking-status]");
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const room = $("#room").value;
    const slot = $("#slot").value;
    write("local-loop-booking", { room, slot });
    bookingStatus.textContent = `${room} reserved / ${slot}`;
    emitAction(bookingForm.closest(".tool-card"));
    updateSummary();
  });
  const savedBooking = read("local-loop-booking", null);
  if (savedBooking) bookingStatus.textContent = `${savedBooking.room} reserved / ${savedBooking.slot}`;

  // 4. Homework tracker: add tasks and toggle completed state.
  const homeworkKey = "local-loop-homework";
  const homeworkForm = $("[data-homework-form]");
  const homeworkList = $("[data-homework-list]");
  let homework = read(homeworkKey, []);
  const renderHomework = () => {
    homeworkList.innerHTML = homework.length ? homework.map((task, index) => `<label class="homework-item ${task.done ? "done" : ""}"><input type="checkbox" data-homework-index="${index}" ${task.done ? "checked" : ""}><span><strong>${escapeHtml(task.title)}</strong><small>Due ${escapeHtml(task.due)}</small></span></label>`).join("") : '<span class="tool-note mono">No tasks yet</span>';
    $$('[data-homework-index]', homeworkList).forEach((checkbox) => checkbox.addEventListener("change", () => {
      homework[Number(checkbox.dataset.homeworkIndex)].done = checkbox.checked;
      write(homeworkKey, homework);
      renderHomework();
      updateSummary();
    }));
  };
  homeworkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    homework.push({ title: $("#homework-title").value.trim(), due: $("#homework-due").value, done: false });
    write(homeworkKey, homework);
    homeworkForm.reset();
    emitAction(homeworkForm.closest(".tool-card"));
    renderHomework();
    updateSummary();
  });
  renderHomework();

  // 5. Community issues: add a local report and allow simple upvotes.
  const issueKey = "local-loop-issues";
  const issueForm = $("[data-issue-form]");
  const issueList = $("[data-issue-list]");
  let issues = read(issueKey, []);
  const renderIssues = () => {
    issueList.innerHTML = issues.length ? issues.map((issue, index) => `<div class="issue-item"><div><strong>${escapeHtml(issue.text)}</strong><small>${escapeHtml(issue.place)}</small></div><button class="mini-button issue-vote" type="button" data-issue-index="${index}">▲ ${issue.votes}</button></div>`).join("") : '<span class="tool-note mono">No reports yet</span>';
    $$('[data-issue-index]', issueList).forEach((button) => button.addEventListener("click", () => {
      issues[Number(button.dataset.issueIndex)].votes += 1;
      write(issueKey, issues);
      renderIssues();
    }));
  };
  issueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    issues.push({ text: $("#issue-text").value.trim(), place: $("#issue-place").value.trim(), votes: 1 });
    write(issueKey, issues);
    issueForm.reset();
    emitAction(issueForm.closest(".tool-card"));
    renderIssues();
    updateSummary();
  });
  renderIssues();

  // 6. Cafe preorder: select menu items and save a local order confirmation.
  const cafeKey = "local-loop-cafe-order";
  const cafeItems = {};
  const cafeOrder = $("[data-cafe-order]");
  const cafeStatus = $("[data-cafe-status]");
  const renderOrder = () => {
    const entries = Object.entries(cafeItems);
    if (!entries.length) { cafeOrder.textContent = "No items selected"; return; }
    const total = entries.reduce((sum, [, item]) => sum + item.price * item.quantity, 0);
    cafeOrder.textContent = `${entries.map(([, item]) => `${item.name} ×${item.quantity}`).join(" / ")} — £${total.toFixed(2)}`;
    updateSummary();
  };
  $$('[data-cafe-item]').forEach((button) => button.addEventListener("click", () => {
    const name = button.dataset.cafeItem;
    const price = Number(button.dataset.price);
    cafeItems[name] = cafeItems[name] || { name, price, quantity: 0 };
    cafeItems[name].quantity += 1;
    emitAction(button.closest(".tool-card"));
    button.classList.add("is-selected");
    renderOrder();
  }));
  $("[data-cafe-submit]").addEventListener("click", () => {
    if (!Object.keys(cafeItems).length) { cafeStatus.textContent = "Choose an item first"; return; }
    const order = Object.values(cafeItems);
    write(cafeKey, order);
    cafeStatus.textContent = "Preorder saved for pickup";
  });
  if (read(cafeKey, null)) cafeStatus.textContent = "Previous preorder saved locally";

  updateSummary();

  // Export a single CSV containing the current state of every module.
  const exportAllButton = $("[data-export-all]");
  const exportStatus = $("[data-export-status]");
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  exportAllButton.addEventListener("click", () => {
    const rows = [["Module", "Record", "Details", "Status", "Saved at"]];

    // Lost and found records are read from the visible board, including claim state.
    $$(".tool-lost .item-row").forEach((row) => {
      rows.push(["Lost and found", $("strong", row).textContent, $("small", row).textContent, $("[data-claim]", row).textContent, ""]);
    });

    // Lunch includes each current option's visible tally and this browser's vote.
    $$('[data-vote]').forEach((option) => {
      rows.push(["Lunch poll", option.dataset.vote, "Votes", $("[data-vote-count]", option).textContent, ""]);
    });
    rows.push(["Lunch poll", "Your vote", "Selected on this browser", localStorage.getItem("local-loop-lunch-vote") || "None", ""]);

    const booking = read("local-loop-booking", null);
    if (booking) rows.push(["Room booking", booking.room, booking.slot, "Reserved", ""]);
    else rows.push(["Room booking", "No booking", "", "Not reserved", ""]);

    const homeworkRows = read("local-loop-homework", []);
    homeworkRows.forEach((task) => rows.push(["Homework", task.title, `Due ${task.due}`, task.done ? "Complete" : "Open", ""]));
    if (!homeworkRows.length) rows.push(["Homework", "No tasks", "", "Empty", ""]);

    const issueRows = read("local-loop-issues", []);
    issueRows.forEach((issue) => rows.push(["Community issue", issue.text, issue.place, `${issue.votes} votes`, ""]));
    if (!issueRows.length) rows.push(["Community issue", "No reports", "", "Empty", ""]);

    const cafeRows = read("local-loop-cafe-order", []);
    cafeRows.forEach((item) => rows.push(["Cafe preorder", item.name, `Quantity ${item.quantity}`, `£${(item.price * item.quantity).toFixed(2)}`, ""]));
    if (!cafeRows.length) rows.push(["Cafe preorder", "No items", "", "Empty", ""]);

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "local-loop-all-data.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    exportStatus.textContent = `${rows.length - 1} records exported`;
  });

  // Prevent user-entered text from being interpreted as HTML when it is rendered back.
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }
});
