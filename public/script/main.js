// === ELEMENTS ===
const triggerInput = document.getElementById("trigger-input");
const button = document.getElementById("submit-btn");
const textArea = document.getElementById("journal-entry");
const aiResponseBox = document.getElementById("ai-response");

let selectedMood = null;

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mood-option").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".mood-option").forEach(b => b.classList.remove("selected"));
      button.classList.add("selected");
      selectedMood = button.getAttribute("data-mood");
      console.log("✅ Mood selected:", selectedMood);
    });
  });
});

// === 🧠 MEMORY CONTEXT ===
function buildMemoryContext() {
  const history = JSON.parse(localStorage.getItem("journalHistory")) || [];
  return history.slice(0, 5).map(item =>
    `On ${item.date}, you wrote: "${item.entry}" (Mood: ${item.mood})`
  ).join("\n");
}

// === MOOD SELECTION ===
document.querySelectorAll(".emoji").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedMood = btn.getAttribute("data-mood");
    document.querySelectorAll(".emoji").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// === SUBMIT FUNCTION ===
button.addEventListener("click", async () => {
  const entry = textArea.value.trim();
  if (!entry) {
    aiResponseBox.innerText = "📝 Please write something.";
    return;
  }
  if (!selectedMood) {
    aiResponseBox.innerText = "😊 Please select a mood first.";
    return;
  }

  button.disabled = true;
  button.innerText = "Reflecting...";
  aiResponseBox.innerHTML = "💬 Thinking...";

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const memoryContext = buildMemoryContext();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("⚠️ Session expired. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    const trigger = triggerInput.value.trim();

    const reflectRes = await fetch("https://my-diary-1lix.onrender.com/reflect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        entry,
        mood: selectedMood,
        memoryContext
      })
    });

    const reflectData = await reflectRes.json();
    if (!reflectData.choices || !reflectData.choices.length) {
      throw new Error("Invalid reflection response");
    }

    const aiText = reflectData.choices[0].message.content;
    aiResponseBox.innerHTML = `
      <h3>🧠 AI Memory Companion</h3>
      <p>${aiText}</p>
    `;

    const reflection = {
    content: entry, // ✅ match schema field name
    mood: selectedMood,
    trigger: trigger || null,
    response: aiText,
    date: new Date().toLocaleString()
  };

    // Save to server
    const saveRes = await fetch("https://my-diary-1lix.onrender.com/save-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(reflection)
    });

    const saveData = await saveRes.json();
    if (!saveRes.ok) {
      console.error("❌ Save failed:", saveData);
      throw new Error(data.error || "Server save failed");
    }

    console.log("✅ Entry saved successfully:", saveData.message);
    alert("📝 Entry saved!");

    const history = JSON.parse(localStorage.getItem("journalHistory")) || [];
    history.unshift(reflection);
    localStorage.setItem("journalHistory", JSON.stringify(history));

    updateHistoryDisplay();
    updateMoodStats();
    renderJournalEntry(reflection);

    textArea.value = "";
    selectedMood = null;
    document.querySelectorAll(".emoji").forEach(b => b.classList.remove("selected"));
 } catch (error) {
    console.error("🔥 Error:", error);
    aiResponseBox.innerHTML = "❌ Internal client error. Please try again later.";
  }

  button.disabled = false;
  button.innerText = "Reflect with AI";
});

// === UI HELPERS ===
function renderJournalEntry(entry) {
  const historyBox = document.getElementById("history-box");
  const entryDiv = document.createElement("div");

  const mood = entry.mood || "unknown";
  const emoji = moodToEmoji(mood);
  const moodLabel = capitalizeMood(mood) || "Unknown";
  const content = entry.content || "(No content)";
  const date = entry.date || new Date().toLocaleString();

  entryDiv.innerHTML = `
    <div class="mood-tag">Feeling: ${emoji} ${moodLabel}</div>
    <div><strong>🕒 ${date}</strong></div>
    <p><em>✍️ ${content}</em></p>
    <div><strong>AI:</strong> ${entry.response || "(No AI response)"}</div>
    ${entry.trigger ? `<div>🔍 Trigger: <em>${entry.trigger}</em></div>` : ""}
  `;

  historyBox.prepend(entryDiv);
}


function moodToEmoji(mood) {
  return {
    sad: "😔",
    neutral: "😐",
    happy: "😊",
    excited: "🤩",
    angry: "😡"
  }[mood] || "🙂";
}

function capitalizeMood(mood) {
  if (!mood) return "Unknown";
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

function updateHistoryDisplay() {
  const history = JSON.parse(localStorage.getItem("journalHistory")) || [];
  const historyBox = document.getElementById("history-box");
  historyBox.innerHTML = "";
  history.forEach(renderJournalEntry);
}

function updateMoodStats() {
  const history = JSON.parse(localStorage.getItem("journalHistory")) || [];
  const moodCounts = {
    happy: 0,
    sad: 0,
    neutral: 0,
    excited: 0,
    angry: 0
  };
  history.forEach(item => {
    if (item.mood) moodCounts[item.mood]++;
  });
  const chart = document.getElementById("mood-chart");
  chart.innerHTML = "";
  Object.entries(moodCounts).forEach(([mood, count]) => {
    const bar = document.createElement("div");
    bar.className = "mood-bar";

    const fill = document.createElement("div");
    fill.className = "mood-fill";
    fill.style.height = `${count * 15 + 10}px`;
    fill.style.backgroundColor = getMoodColor(mood);

    const emoji = document.createElement("div");
    emoji.textContent = moodToEmoji(mood);

    const label = document.createElement("div");
    label.className = "mood-label";
    label.innerHTML = `<strong>${capitalizeMood(mood)}</strong><br>${count}`;

    bar.appendChild(emoji);
    bar.appendChild(fill);
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

function getMoodColor(mood) {
  return {
    happy: "#c8e6c9",
    sad: "#bbdefb",
    neutral: "#e0e0e0",
    excited: "#ffe082",
    angry: "#ef9a9a"
  }[mood] || "#ccc";
}

function updateTriggerStats() {
  const history = JSON.parse(localStorage.getItem("journalHistory")) || [];
  const triggerCounts = {};
  history.forEach(entry => {
    if (entry.trigger) {
      triggerCounts[entry.trigger] = (triggerCounts[entry.trigger] || 0) + 1;
    }
  });
  const triggerBox = document.getElementById("trigger-stats");
  triggerBox.innerHTML = "<h4>🔥 Common Triggers</h4>";
  Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).forEach(([trigger, count]) => {
    const tag = document.createElement("div");
    tag.className = "trigger-tag";
    tag.innerText = `${trigger} (${count})`;
    triggerBox.appendChild(tag);
  });
}

// === CALMING FEATURE ===
const calmBtn = document.getElementById("calm-btn");
const calmBox = document.getElementById("calm-box");
const calmText = document.getElementById("calm-text");
const calmClose = document.getElementById("calm-close");
const calmAudio = document.getElementById("calm-audio");

const calmingMessages = [
  "🌱 Take a deep breath. You’re doing the best you can.",
  "🌼 It’s okay to feel overwhelmed. Be kind to yourself.",
  "🫧 Breathe in calm, breathe out stress.",
  "💛 You are safe in this moment. Nothing needs to be fixed immediately.",
  "🌈 Small steps are still progress. You’re not alone."
];

calmBtn.addEventListener("click", () => {
  const randomMsg = calmingMessages[Math.floor(Math.random() * calmingMessages.length)];
  calmText.textContent = randomMsg;
  calmBox.classList.add("show");
  if (calmAudio) {
    calmAudio.currentTime = 0;
    calmAudio.play().catch(err => console.warn("Audio play failed:", err));
  }
});

calmClose.addEventListener("click", () => {
  calmBox.classList.remove("show");
  if (calmAudio) calmAudio.pause();
});

// === DARK MODE ===
document.getElementById("theme-toggle").addEventListener("change", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});

// === ON LOAD ===
window.addEventListener("DOMContentLoaded", () => {
  updateHistoryDisplay();
  updateTriggerStats();
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    document.getElementById("theme-toggle").checked = true;
  }

  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
  }

  if (localStorage.getItem("justLoggedIn")) {
    showFlashMessage("✅ Login successful!");
    localStorage.removeItem("justLoggedIn");
  }
});

// === LOGOUT ===
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("token");
  showFlashMessage("👋 Logged out!");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
});

function showFlashMessage(message, isError = false) {
  const flash = document.getElementById("flash-msg");
  flash.textContent = message;
  flash.className = `flash ${isError ? 'error' : ''}`;
  flash.classList.remove("hidden");
  setTimeout(() => flash.classList.add("hidden"), 3000);
}