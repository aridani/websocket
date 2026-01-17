const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);

// === WebSocket Server ===
const wss = new WebSocket.Server({ server });

// Menyimpan subscriber berdasarkan sesi_id
let subscribers = {};

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Jika client ingin subscribe sesi_id
      if (data.action === 'subscribe' && data.sesi_id) {
        ws.sesi_id = data.sesi_id;

        if (!subscribers[data.sesi_id]) {
          subscribers[data.sesi_id] = new Set();
        }
        subscribers[data.sesi_id].add(ws);
        console.log(`Client subscribed sesi_id: ${data.sesi_id}`);
      }

    } catch (err) {
      console.error('Invalid message', err);
    }
  });

  ws.on('close', () => {
    // Hapus ws dari subscribers
    if (ws.sesi_id && subscribers[ws.sesi_id]) {
      subscribers[ws.sesi_id].delete(ws);
      if (subscribers[ws.sesi_id].size === 0) {
        delete subscribers[ws.sesi_id];
      }
    }
    console.log('Client disconnected');
  });
});

// === Endpoint untuk menerima data dari ESP32 / PHP ===
app.use(express.json());
app.post('/update', (req, res) => {
  const data = req.body; // expect JSON { sesi_id, tinggi, berat, status, bbi, kalori, tujuan, durasi }
  console.log("ada data masuk",data.sesi_id)
  if (!data.sesi_id) return res.status(400).send('sesi_id required');

  const clients = subscribers[data.sesi_id];
  if (clients) {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  res.send({ ok: true });
});

// === Test endpoint biasa ===
app.get('/', (req, res) => {
  res.send('<h1>Server WebSocket Ready</h1>');
});

// === Listen server ===
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
