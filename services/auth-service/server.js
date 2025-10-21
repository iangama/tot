import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import crypto from "crypto";
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

const ISS = process.env.JWT_ISS || "tot-app";
const AUD = process.env.JWT_AUD || "tot-users";
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TTL = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || "900", 10);
const REFRESH_TTL = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_SEC || "1209600", 10);

const signAccess = (sub) => jwt.sign({ sub }, ACCESS_SECRET, { issuer: ISS, audience: AUD, expiresIn: ACCESS_TTL });
const signRefresh = (jti, sub) => jwt.sign({ jti, sub, typ: "refresh" }, REFRESH_SECRET, { issuer: ISS, audience: AUD, expiresIn: REFRESH_TTL });

const storeRefresh = async (jti, sub) => redis.set(`refresh:${jti}`, sub, "EX", REFRESH_TTL);
const revokeRefresh = async (jti) => redis.del(`refresh:${jti}`);
const isRefreshValid = async (jti, sub) => (await redis.get(`refresh:${jti}`)) === sub;

const verifyAccess = (req, res, next) => {
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
};
const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,"0")).join("");

app.get("/auth/health", (_, res) => res.json({ ok: true }));

app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  try {
    const user = await prisma.user.create({ data: { email, password: bcrypt.hashSync(password, 10) } });
    return res.status(201).json({ id: user.id, email: user.email });
  } catch {
    return res.status(409).json({ error: "email already in use" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "invalid credentials" });

  const accessToken = signAccess(user.id);
  const jti = rnd();
  const refreshToken = signRefresh(jti, user.id);
  await storeRefresh(jti, user.id);
  return res.json({ accessToken, refreshToken, expiresIn: ACCESS_TTL });
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET, { issuer: ISS, audience: AUD });
    if (payload.typ !== "refresh") return res.status(400).json({ error: "invalid token type" });
    const { jti, sub } = payload;
    if (!(await isRefreshValid(jti, sub))) return res.status(401).json({ error: "invalid/rotated refresh" });

    await revokeRefresh(jti);
    const newJti = rnd();
    await storeRefresh(newJti, sub);

    const accessToken = signAccess(sub);
    const newRefresh = signRefresh(newJti, sub);
    return res.json({ accessToken, refreshToken: newRefresh, expiresIn: ACCESS_TTL });
  } catch {
    return res.status(401).json({ error: "invalid refresh" });
  }
});

app.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET, { issuer: ISS, audience: AUD });
      await revokeRefresh(payload.jti);
    } catch(_) {}
  }
  return res.json({ ok: true });
});

app.get("/auth/me", verifyAccess, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true }});
  return res.json(user);
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`auth-service on :${port}`));
