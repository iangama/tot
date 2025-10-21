import http from "http";
import { WebSocketServer } from "ws";

const port = process.env.PORT || 4004;

const server = http.createServer((req, res) => {
  if (req.url === "/ws/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(200); res.end("ws service");
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  if (!req.url.startsWith("/ws")) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.send(JSON.stringify({ type: "hello", msg: "connected to tot notifications" }));
  });
});

server.listen(port, () => console.log(`notifications-service on :${port}`));
