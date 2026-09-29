// Serveur sans dépendance : Node 18+ suffit. Temps réel via Server-Sent Events.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TheBlackRoseWheel";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const MAX = 12, DURATION = 5000;

let state = { names: [], spin: null };
try { state = { ...state, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) }; } catch {}
const save = () => fs.writeFile(DATA_FILE, JSON.stringify(state), () => {});

const clients = new Set();
const payload = () => "data: " + JSON.stringify({ ...state, serverTime: Date.now() }) + "\n\n";
const broadcast = () => { const p = payload(); for (const res of clients) res.write(p); };
setInterval(() => { for (const res of clients) res.write(": ping\n\n"); }, 25000);

const okPassword = (pw) => {
  const a = crypto.createHash("sha256").update(String(pw || "")).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
};
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve) => {
  let s = ""; req.on("data", (c) => { s += c; if (s.length > 10000) req.destroy(); });
  req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
});

http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];

  if (req.method === "GET" && url === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write(payload()); clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/")) {
    const body = await readBody(req);
    if (!okPassword(body.password)) { await new Promise((r) => setTimeout(r, 600)); return json(res, 401, { error: "Mot de passe incorrect" }); }

    if (url === "/api/login") return json(res, 200, { ok: true });

    if (url === "/api/names") {
      const list = Array.isArray(body.list) ? body.list.map((x) => String(x).trim().slice(0, 24)).filter(Boolean).slice(0, MAX) : null;
      if (!list) return json(res, 400, { error: "Liste invalide" });
      state.names = list; state.spin = null; save(); broadcast();
      return json(res, 200, { ok: true });
    }

    if (url === "/api/spin") {
      const n = state.names.length;
      if (n < 2) return json(res, 400, { error: "Il faut au moins 2 noms" });
      if (state.spin && Date.now() < state.spin.startedAt + DURATION + 500) return json(res, 409, { error: "La roue tourne déjà" });
      const i = crypto.randomInt(n), seg = 360 / n, jitter = (Math.random() - 0.5) * seg * 0.7;
      state.spin = { id: crypto.randomUUID(), startedAt: Date.now(), winner: i, winnerName: state.names[i], finalAngle: 360 * 6 - (i + 0.5) * seg + jitter, n };
      save(); broadcast();
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: "Introuvable" });
  }

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  }
  res.writeHead(404); res.end("Not found");
}).listen(PORT, () => console.log("Roue en ligne sur le port " + PORT));
