document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const messageBox = document.getElementById("login-message");

  if (!email || !password) {
    showAlert("⚠️ Please enter both fields.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      localStorage.setItem("token", data.token);
      showAlert("✅ Login successful! Redirecting...", "success");
      setTimeout(() => window.location.href = "index.html", 1500);
    } else {
      showAlert(`❌ ${data.message || "Login failed."}`);
    }
  } catch (error) {
    console.error("Login error:", error);
    showAlert("❌ Server error during login.");
  }
});

function showAlert(message, type = "error", duration = 3000) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.classList.remove("hidden");

  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, duration);
}
