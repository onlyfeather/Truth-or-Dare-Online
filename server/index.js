require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// === 数据库连接部分 (Turso/SQLite) ===
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const AdapterClass = PrismaLibSQL.default || PrismaLibSQL;
const adapter = new AdapterClass(turso);
const prisma = new PrismaClient({ adapter });

const app = express();
const rooms = {}; 

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin666";

// 🟢 辅助函数：统一生成东八区时间
const getChinaTime = () => {
  return new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit'
  });
};

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

const server = http.createServer(app);
// 1. 初始化增强
const io = new Server(server, {
  cors: { origin: CLIENT_URL },
  pingTimeout: 5000,
  pingInterval: 10000
});

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization; 
  if (authHeader) {
    const token = authHeader.split(' ')[1]; 
    if (token === ADMIN_PASSWORD) return next();
  }
  res.status(401).json({ error: "无权访问" });
};

// --- API 接口保持不变 ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms)
    .filter(r => 
      r.mode === 'public' &&          // 必须是公开房
      r.players &&                    // 确保 players 数组存在
      r.players.length > 0            // 🟢 关键：只返回当前有人的房间
    )
    .map(r => ({ 
      id: r.id, 
      name: r.name, 
      count: r.players.length, 
      mode: r.mode 
    }));
  res.json(roomList);
});

app.post('/api/penalties', async (req, res) => {
  const { content, type, level, categoryId, creator } = req.body;
  try {
    const newPenalty = await prisma.penalty.create({
      data: { content, type, level: parseInt(level), categoryId: parseInt(categoryId), creator: creator || '匿名', status: 'PENDING' }
    });
    res.json({ success: true, data: newPenalty });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ success: true, token: ADMIN_PASSWORD });
  else res.status(401).json({ error: "密码错误" });
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await prisma.penalty.count();
    const pending = await prisma.penalty.count({ where: { status: 'PENDING' } });
    const approved = await prisma.penalty.count({ where: { status: 'APPROVED' } });
    const roomCount = Object.keys(rooms).length; 
    res.json({ total, pending, approved, rooms: roomCount });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/admin/active-rooms', adminAuth, (req, res) =>{
  const data = Object.values(rooms).map(r => ({
    id: r.id, name: r.name, mode: r.mode, password: r.password,
    hostName: r.players.find(p => p.isHost)?.nickname || '未知',
    playerCount: r.players.length, poolSize: r.activePenaltyIds.length,
    createdAt: r.createdAt || Date.now()
  }));
  res.json({ data });
});

app.get('/api/admin/penalties', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, status, deleted } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (deleted === 'true') where.isDeleted = true;
  else { where.isDeleted = false; if (status) where.status = status; }
  try {
    const list = await prisma.penalty.findMany({ where, orderBy: { id: 'desc' }, skip, take: parseInt(limit), include: { category: true } });
    const total = await prisma.penalty.count({ where });
    res.json({ list, total });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id/restore', adminAuth, async (req, res) => {
  try {
    await prisma.penalty.update({ where: { id: parseInt(req.params.id) }, data: { isDeleted: false } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/admin/penalties/:id/hard', adminAuth, async (req, res) => {
  try {
    await prisma.penalty.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  try {
    await prisma.penalty.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  try {
    await prisma.penalty.update({ where: { id: parseInt(req.params.id) }, data: { isDeleted: true } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/categories', adminAuth, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: { name: req.body.name, description: req.body.description } });
    res.json({ success: true, data: category });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/penalties/batch', adminAuth, async (req, res) => {
  const { items, categoryId, type, level } = req.body;
  try {
    const createPromises = items.map(content => prisma.penalty.create({
      data: { content: content.trim(), type: type || 'truth', level: parseInt(level) || 3, categoryId: parseInt(categoryId), creator: '管理员', status: 'APPROVED', isDeleted: false }
    }));
    await Promise.all(createPromises);
    res.json({ success: true, count: items.length });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/admin/categories-stats', adminAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    const data = await Promise.all(categories.map(async (c) => {
      const count = await prisma.penalty.count({ where: { categoryId: c.id, isDeleted: false } });
      return { id: c.id, name: c.name, description: c.description || '', count };
    }));
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  try {
    const count = await prisma.penalty.count({ where: { categoryId: parseInt(req.params.id) } });
    if (count > 0) return res.status(400).json({ error: `还有 ${count} 道题` });
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
  try {
    await prisma.category.update({ where: { id: parseInt(req.params.id) }, data: { name: req.body.name, description: req.body.description } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id/info', adminAuth, async (req, res) => {
  try {
    await prisma.penalty.update({
      where: { id: parseInt(req.params.id) },
      data: { content: req.body.content, type: req.body.type, level: parseInt(req.body.level), categoryId: parseInt(req.body.categoryId) }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 18. 解散房间 (管理员专用)
app.delete('/api/admin/rooms/:id', adminAuth, (req, res) => {
  const roomId = req.params.id;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: "房间不存在或已解散" });
  }

  // 🟢 核心逻辑 1：向房间内所有连接的客户端发送“被解散”通知
  io.to(roomId).emit('error_msg', '该房间已被管理员强制解散');
  
  // 🟢 核心逻辑 2：强制所有 Socket 离开该房间频道
  // 注：socket.io v4+ 可以这样操作
  io.in(roomId).socketsLeave(roomId);

  // 🟢 核心逻辑 3：从内存中销毁房间
  delete rooms[roomId];

  console.log(`🚨 [管理操作] 房间 ${roomId} 已被强制解散`);
  res.json({ success: true });
});


// =======================
//     Socket.io 逻辑
// =======================

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('create_room', async ({ nickname, roomName, mode, password, categoryIds }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    let initialPool = [];
    const safeCategoryIds = (Array.isArray(categoryIds) ? categoryIds : []).map(id => parseInt(id)).filter(id => !isNaN(id));

    if (safeCategoryIds.length > 0) {
      try {
        initialPool = await prisma.penalty.findMany({
          where: { categoryId: { in: safeCategoryIds }, status: 'APPROVED', isDeleted: false },
          include: { category: true } 
        });
      } catch (e) { console.error("❌ 读取题库失败:", e); }
    }

    rooms[roomId] = {
      id: roomId, name: roomName || `${nickname}的房间`, hostId: socket.id, mode, password,
      players: [], history: [], fullPool: initialPool, 
      activePenaltyIds: initialPool.map(p => p.id), currentTurnPlayerId: null, createdAt: Date.now()
    };

    socket.join(roomId);
    const hostPlayer = { id: socket.id, nickname, isHost: true, avatar: '👑' };
    rooms[roomId].players.push(hostPlayer);

    socket.emit('room_joined', { 
      roomId, roomName: rooms[roomId].name, isHost: true, players: rooms[roomId].players,
      history: [], poolCount: rooms[roomId].activePenaltyIds.length, currentTurnPlayerId: null
    });
  });

  socket.on('join_room', ({ roomId, nickname, password, isGhost, adminToken }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error_msg', '房间不存在或已关闭');

    if (isGhost) {
      if (adminToken !== ADMIN_PASSWORD) return socket.emit('error_msg', '密钥错误');
      socket.join(roomId);
      socket.emit('room_joined', { 
        roomId, roomName: room.name, isHost: false, players: room.players, 
        history: room.history, poolCount: room.activePenaltyIds.length, 
        currentTurnPlayerId: room.currentTurnPlayerId, isSpectator: true
      });
      return;
    }

    if (room.mode === 'private' && room.password !== password) return socket.emit('error_msg', '密码错误');

    socket.join(roomId);
    let player = room.players.find(p => p.id === socket.id);
    if (!player) {
      player = { id: socket.id, nickname, isHost: false, avatar: '👤' };
      room.players.push(player);
      socket.to(roomId).emit('player_joined', player);
    }

    socket.emit('room_joined', { 
      roomId, roomName: room.name, isHost: player.isHost, players: room.players, 
      history: room.history, poolCount: room.activePenaltyIds.length, 
      currentTurnPlayerId: room.currentTurnPlayerId
    });
  });

  // 🟢 修改点：消息发送逻辑统一时区
  socket.on('send_msg', ({ roomId, msg, nickname, time }) => {
    const room = rooms[roomId];
    if (room) {
      const newMsg = { 
        id: Date.now(), 
        nickname, 
        text: msg, 
        // 优先使用前端传来的时间，如果没有则由后端补齐东八区时间
        time: time || getChinaTime() 
      };
      room.history.push(newMsg);
      if (room.history.length > 50) room.history.shift();
      io.to(roomId).emit('receive_msg', newMsg);
    }
  });

  socket.on('pick_player', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) return;
    io.to(roomId).emit('picking_player_start');
    setTimeout(() => {
      const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
      room.currentTurnPlayerId = randomPlayer.id;
      io.to(roomId).emit('player_selected', { playerId: randomPlayer.id });
    }, 2000);
  });

  socket.on('spin_wheel', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.activePenaltyIds.length === 0) return;
    io.to(roomId).emit('spin_start');
    setTimeout(() => {
      const randomId = room.activePenaltyIds[Math.floor(Math.random() * room.activePenaltyIds.length)];
      const result = room.fullPool.find(p => p.id === randomId);
      io.to(roomId).emit('show_result', { result });
    }, 2000);
  });

  socket.on('reset_turn', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) { room.currentTurnPlayerId = null; io.to(roomId).emit('turn_reset'); }
  });

  socket.on('get_pool_details', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    socket.emit('pool_details', { fullPool: room.fullPool, activeIds: room.activePenaltyIds });
  });

  socket.on('update_pool', ({ roomId, activeIds }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.activePenaltyIds = activeIds;
    io.to(roomId).emit('pool_updated', { count: activeIds.length });
  });

  //handleLeave 增强版
  const handleLeave = () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      
      if (index !== -1) {
        const leaver = room.players[index];
        room.players.splice(index, 1);
        
        // 通知离开
        socket.to(roomId).emit('player_left', { id: socket.id, time: getChinaTime() });

        // 检查房间是否空了
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`[System] Room ${roomId} deleted.`);
        } else {
          // 如果离开的是当前回合的人
          if (room.currentTurnPlayerId === socket.id) {
            room.currentTurnPlayerId = null;
            io.to(roomId).emit('turn_reset');
          }
          // 如果离开的是房主，移交权限
          if (leaver.isHost) {
            const newHost = room.players[0];
            newHost.isHost = true;
            room.hostId = newHost.id; // 🟢 更新引用
            io.to(roomId).emit('host_change', { newHostId: newHost.id });
            io.to(roomId).emit('receive_msg', {
              id: Date.now(),
              nickname: '系统',
              text: `房主离开，${newHost.nickname} 自动成为新房主`,
              time: getChinaTime()
            });
          }
        }
        break; // 一个 Socket 只能在一个房间，找到就跳出循环
      }
    }
  };

  socket.on('leave_room', handleLeave);
  socket.on('disconnect', handleLeave);
});

server.listen(PORT, () => {
  console.log(`🚀 服务器运行中: ${PORT}`);
});