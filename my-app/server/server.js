// server.js
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "festival_judging",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =======================
// ROUTES
// =======================

// GET /api/judges
app.get("/api/judges", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM judges ORDER BY name");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// POST /api/judges
app.post("/api/judges", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name required" });

    const [result] = await pool.query("INSERT INTO judges (name) VALUES (?)", [name.trim()]);
    const insertId = result.insertId;
    const [rows] = await pool.query("SELECT id, name FROM judges WHERE id = ?", [insertId]);

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Judge exists" });
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// GET /api/scores?category=0
app.get("/api/scores", async (req, res) => {
  try {
    const category = Number(req.query.category ?? 0);
    const [rows] = await pool.query(
      "SELECT contestant_id, criteria, score, judgeName, category FROM scores WHERE category = ? ORDER BY contestant_id, judgeName",
      [category]
    );

    const out = {};
    rows.forEach((r) => {
      const id = r.contestant_id;
      if (!out[id]) out[id] = { total: 0, scores: [] };
      out[id].scores.push({ criteria: r.criteria, score: r.score, judgeName: r.judgeName });
      out[id].total += r.score;
    });

    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// POST /api/scores  (upsert)
app.post("/api/scores", async (req, res) => {
  try {
    const { contestant, category, judgeName, criteria, score } = req.body;
    if ([contestant, category, judgeName, criteria, score].some((v) => v === undefined)) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const sql = `
      INSERT INTO scores (contestant_id, category, judgeName, criteria, score)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score)
    `;
    await pool.execute(sql, [contestant, category, judgeName, criteria, Number(score)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// =======================
// NEW: GET /api/raw-scores
// =======================
// GET /api/raw-scores
app.get("/api/raw-scores", async (req, res) => {
  try {
    const sql = `
      SELECT 
        contestant_id,
        judgeName,
        SUM(CASE WHEN category = 0 THEN score ELSE 0 END) AS street_total,
        SUM(CASE WHEN category = 1 THEN score ELSE 0 END) AS festival_total
      FROM scores
      GROUP BY contestant_id, judgeName
      ORDER BY contestant_id, judgeName
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// GET /api/contestant-totals
app.get("/api/contestant-totals", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM contestant_totals ORDER BY final_score DESC, contestant_id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on port ${PORT}`));