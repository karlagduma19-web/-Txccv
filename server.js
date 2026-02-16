require("dotenv").config();
const express = require("express");
const http = require("http");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const multer = require("multer");
const { Server } = require("socket.io");
const OpenAI = require("openai");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ FIX 1: correct env variable name
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ keep this ONLY if your files are in /public
app.use(express.static("public"));

app.use("/uploads", express.static("uploads"));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// ------------------------
// DATABASE MODELS
// ------------------------
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const MessageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const MediaSchema = new mongoose.Schema({
  path: String,
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);
const Media = mongoose.model("Media", MediaSchema);

// ------------------------
// KARLO PROFILE FOR AI
// ------------------------
const karloProfile = `
You are Glaze AI inside Karssie’s World.

Profile:
Name: Karlo
Height: 5'5
Plays football (not very skilled but loves it)
Loves coding
Confident, friendly, funny

When Cassie asks about Karlo:
- Supportive
- Slightly flattering
- Confident wingman tone
- Never insult Karlo
`;

// ------------------------
// LOGIN SYSTEM
// ------------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "karlo" && password === "karlo123") {
    req.session.user = "karlo";
    return res.json({ success: true, admin: true });
  }

  if (username === "Cassie") {
    let user = await User.findOne({ username: "Cassie" });
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      await User.create({ username: "Cassie", password: hashed });
      req.session.user = "Cassie";
      return res.json({ success: true, admin: false });
    }
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = "Cassie";
      return res.json({ success: true, admin: false });
    }
  }

  res.json({ success: false });
});

// ------------------------
// AI CHAT
// ------------------------
app.post("/glaze", async (req, res) => {
  if (!req.session.user) return res.status(403).send("Unauthorized");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: karloProfile },
      { role: "user", content: req.body.message }
    ]
  });

  res.json({ reply: response.choices[0].message.content });
});

// ------------------------
// ADMIN MEDIA UPLOAD
// ------------------------
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

app.post("/upload", upload.single("media"), async (req, res) => {
  if (req.session.user !== "karlo")
    return res.status(403).send("Not admin");

  await Media.create({ path: "/uploads/" + req.file.filename });
  res.json({ success: true });
});

// ------------------------
// SOCKET.IO CHAT
// ------------------------
io.on("connection", socket => {

  socket.on("chat message", async (data) => {
    const message = await Message.create({
      user: data.user,
      text: data.text
    });

    io.emit("chat message", {
      user: message.user,
      text: message.text,
      time: message.timestamp.toLocaleString()
    });
  });

  socket.on("load history", async () => {
    const messages = await Message.find().sort({ timestamp: 1 });
    messages.forEach(msg => {
      socket.emit("chat message", {
        user: msg.user,
        text: msg.text,
        time: msg.timestamp.toLocaleString()
      });
    });
  });

});

// ✅ FIX 2: dynamic port for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Karssie’s World running on port " + PORT);
});
