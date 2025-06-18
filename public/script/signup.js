document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const messageBox = document.getElementById("signup-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    if (!email || !password) {
      messageBox.innerText = "⚠️ Please enter both fields.";
      return;
    }

    try {
      const response = await fetch("https://my-diary-1lix.onrender.com/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        messageBox.innerText = "✅ Signup successful! Redirecting to login...";
        setTimeout(() => window.location.href = "login.html", 1500);
      } else {
        messageBox.innerText = `❌ ${data.error || "Signup failed."}`;
      }
    } catch (error) {
      console.error("Signup error:", error);
      messageBox.innerText = "❌ Server error during signup.";
    }
  });
});
