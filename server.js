const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// ✅ Read Firebase key from Render Environment Variable
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (err) {
  console.error("❌ Firebase key error:", err);
  process.exit(1);
}

// ✅ Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://laptop-tracker-ed5f3-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// ✅ Health check (important for Render)
app.get("/", (req, res) => {
  res.send("OK");
});

// ✅ Receive GPS data from ESP32
app.post("/update", async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.lat || !data.lon) {
      return res.status(400).send("Invalid data");
    }

    // Save current data
    await db.ref("device/current").set(data);

    // Save history
    await db.ref("device/history").push({
      ...data,
      time: Date.now()
    });

    console.log("📍 Data saved:", data);

    res.send("OK");
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).send("ERROR");
  }
});

// ✅ Send control command to ESP32
app.get("/control", async (req, res) => {
  try {
    const snap = await db.ref("device/control").once("value");
    res.json(snap.val() || { tracking: false });
  } catch (err) {
    console.error("❌ Control error:", err);
    res.status(500).send("ERROR");
  }
});

// ✅ Use dynamic port (RENDER FIX)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
