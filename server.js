const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔐 Read Firebase key from environment (Render)
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (err) {
  console.error("❌ Failed to parse FIREBASE_KEY");
  process.exit(1);
}

// 🔥 Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://laptop-tracker-ed5f3-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// ✅ Health check
app.get("/", (req, res) => {
  res.send("OK");
});

// 📡 ESP32 → Send GPS data
app.post("/update", async (req, res) => {
  try {
    const data = req.body;

    // Basic validation
    if (!data || data.lat === undefined || data.lon === undefined) {
      return res.status(400).send("Invalid data");
    }

    // Save current data
    await db.ref("device/current").set(data);

    // Save history
    await db.ref("device/history").push({
      ...data,
      time: Date.now()
    });

    console.log("📍 Data received:", data);

    res.send("OK");
  } catch (err) {
    console.error("❌ Error saving data:", err);
    res.status(500).send("ERROR");
  }
});

// 📲 App → Control ESP32
app.get("/control", async (req, res) => {
  try {
    const snapshot = await db.ref("device/control").once("value");
    res.json(snapshot.val() || { tracking: false });
  } catch (err) {
    console.error("❌ Control error:", err);
    res.status(500).send("ERROR");
  }
});

// 🔁 Optional: reset command after reading
app.post("/control", async (req, res) => {
  try {
    const command = req.body;
    await db.ref("device/control").set(command);
    res.send("Command updated");
  } catch (err) {
    console.error("❌ Control set error:", err);
    res.status(500).send("ERROR");
  }
});

// 🚀 Start server (Render uses dynamic port)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
