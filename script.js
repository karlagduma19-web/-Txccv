const socket = io();

function go(page) {
  window.location.href = page;
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.success) {
    localStorage.setItem("username", username);
    localStorage.setItem("admin", data.admin);
    window.location.href = "home.html";
  } else {
    alert("Login failed");
  }
}

// AI
async function askAI() {
  const msg = document.getElementById("aiInput").value;
  const res = await fetch("/glaze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  });
  const data = await res.json();
  document.getElementById("aiReplies").innerHTML += `<p>${data.reply}</p>`;
}

// Chat
function sendMessage() {
  const input = document.getElementById("messageInput");
  const username = localStorage.getItem("username");

  if (!input.value) return;

  socket.emit("chat message", {
    user: username,
    text: input.value
  });

  input.value = "";
}

socket.on("chat message", msg => {
  const div = document.createElement("div");
  const isAdmin = msg.user === "karlo";
  div.className = isAdmin ? "bubble admin" : "bubble cassie";
  div.innerHTML = `<strong>${msg.user}</strong><br>${msg.text}<div class="timestamp">${msg.time}</div>`;
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop =
    document.getElementById("messages").scrollHeight;
});

// Load chat history on page load
socket.emit("load history");

// Admin panel
if (localStorage.getItem("admin") === "true") {
  document.getElementById("adminPanel").style.display = "block";
}

async function uploadMedia() {
  const file = document.getElementById("mediaFile").files[0];
  const formData = new FormData();
  formData.append("media", file);

  await fetch("/upload", { method: "POST", body: formData });
  alert("Uploaded!");
}
