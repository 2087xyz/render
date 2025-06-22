const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const PORT = 3000;
const PANEL_URL = "https://pannnel.onrender.com";
const PANEL_PASSWORD = "Jamie2006"; // Ändere das Passwort!

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: "geheimes-session-secret",
  resave: false,
  saveUninitialized: true
}));

// Middleware für Passwortschutz
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Login-Seite
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === PANEL_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.render("login", { error: "Falsches Passwort!" });
  }
});

// Lizenzprüfung (API)
app.get("/check", async (req, res) => {
  const key = req.query.key;
  try {
    const response = await axios.get(`${PANEL_URL}/check`, { params: { key } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ valid: false, error: "Fehler bei der Lizenzprüfung" });
  }
});

// Web-Oberfläche (nur mit Login)
app.get("/", requireLogin, async (req, res) => {
  try {
    const response = await axios.get(`${PANEL_URL}/licenses`);
    const licenses = response.data.licenses || [];
    res.render("index", { licenses });
  } catch (err) {
    res.render("index", { licenses: [], error: "Fehler beim Laden der Lizenzen" });
  }
});

app.post("/add", requireLogin, async (req, res) => {
  const newKey = req.body.key;
  if (!newKey) return res.redirect("/");
  try {
    await axios.post(`${PANEL_URL}/add`, { key: newKey });
  } catch (err) {
    // Fehlerbehandlung optional
  }
  res.redirect("/");
});

app.post("/remove", requireLogin, async (req, res) => {
  const delKey = req.body.key;
  try {
    await axios.post(`${PANEL_URL}/remove`, { key: delKey });
  } catch (err) {
    // Fehlerbehandlung optional
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`🔐 Lizenzserver & Panel auf http://localhost:${PORT}`);
});

app.post("/generate", requireLogin, async (req, res) => {
  // Zufälligen Key generieren (z.B. 24 Zeichen, hex)
  const newKey = crypto.randomBytes(12).toString("hex");
  try {
    await axios.post(`${PANEL_URL}/add`, { key: newKey });
    // Nach dem Hinzufügen Panel neu laden und den Key anzeigen
    const response = await axios.get(`${PANEL_URL}/licenses`);
    const licenses = response.data.licenses || [];
    res.render("index", { licenses, generatedKey: newKey });
  } catch (err) {
    res.render("index", { licenses: [], error: "Fehler beim Generieren/Hinzufügen", generatedKey: null });
  }
});