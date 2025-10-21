import express from "express";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ISS = process.env.JWT_ISS || "tot-app";
const AUD = process.env.JWT_AUD || "tot-users";

let items = [
  { id: "p1", name: "Cadeira Pro",      price:  499.90 },
  { id: "p2", name: "Teclado Mecânico", price:  299.90 },
  { id: "p3", name: "Monitor 27\"",     price: 1299.90 },
  { id: "p4", name: "Mouse Ergo",       price:  159.90 },
  { id: "p5", name: "Headset Studio",   price:  699.00 },
  { id: "p6", name: "Notebook 14\"",    price: 3899.00 },
  { id: "p7", name: "Hub USB-C",        price:   89.90 },
  { id: "p8", name: "SSD NVMe 1TB",     price:  399.00 }
];

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

app.get("/catalog/health", (_, res) => res.json({ ok: true }));
app.get("/catalog/items", verifyAccess, (_, res) => res.json(items));
app.post("/catalog/items", verifyAccess, (req, res) => {
  const { name, price } = req.body || {};
  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "name and numeric price are required" });
  }
  const id = "p" + (items.length + 1);
  const product = { id, name: String(name).trim(), price: Number(price) };
  items = [ ...items, product ];
  return res.status(201).json(product);
});

const port = process.env.PORT || 4002;
app.listen(port, () => console.log(`catalog-service on :${port}`));
