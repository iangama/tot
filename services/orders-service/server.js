import express from "express";
import jwt from "jsonwebtoken";
const app = express();
app.use(express.json());

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ISS = process.env.JWT_ISS || "tot-app";
const AUD = process.env.JWT_AUD || "tot-users";

function verifyAccess(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });
  try {
    const payload = jwt.verify(token, ACCESS_SECRET, { issuer: ISS, audience: AUD });
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "invalid/expired token" });
  }
}

app.get("/orders/health", (_, res) => res.json({ ok: true }));

// cria pedido aceitando itemId opcional
app.post("/orders", verifyAccess, (req, res) => {
  const { itemId } = req.body ?? {};
  const id = `ord_${Math.random().toString(36).slice(2)}`;
  res.status(201).json({ id, userId: req.userId, itemId: itemId || null, status: "CREATED" });
});

const port = process.env.PORT || 4003;
app.listen(port, () => console.log(`orders-service on :${port}`));
