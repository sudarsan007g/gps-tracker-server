const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://laptop-tracker-ed5f3-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// health
app.get("/", (req, res) => res.send("OK"));

// ESP32 → send GPS data
app.post("/update", async (req, res) => {
  try {
    const data = req.body;

    await db.ref("device/current").set(data);
    await db.ref("device/history").push({
      ...data,
      time: Date.now()
    });

    res.send("OK");
  } catch (e) {
    res.status(500).send("ERR");
  }
});

// ESP32 → read control (App button)
app.get("/control", async (req, res) => {
  const snap = await db.ref("device/control").once("value");
  res.json(snap.val() || { tracking: false });
});

app.listen(3000, () => console.log("Server running"));