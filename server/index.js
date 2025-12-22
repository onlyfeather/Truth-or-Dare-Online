require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// === 数据库连接部分 (Turso/SQLite) ===
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

// 初始化 Turso 客户端
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 兼容性处理：不同版本的适配器导出方式可能不同
const AdapterClass = PrismaLibSQL.default || PrismaLibSQL;
const adapter = new AdapterClass(turso);

// 初始化 Prisma
const prisma = new PrismaClient({ adapter });
// ===================================

const app = express();

// 🔥 关键：定义全局内存房间对象，用于存储实时游戏状态
const rooms = {}; 

// 从环境变量读取配置
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin666";

// 中间件配置
app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});


// === 🛡️ 中间件: 适配 Bearer Token 验证 ===
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization; 
  if (authHeader) {
    const token = authHeader.split(' ')[1]; 
    if (token === ADMIN_PASSWORD) {
      return next();
    }
  }
  res.status(401).json({ error: "无权访问" });
};

// =======================
//       API 接口区域
// =======================

// 1. 获取所有分类 (公开)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 2. 获取活跃房间列表
app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms)
    .filter(r => r.mode === 'public')
    .map(r => ({
      id: r.id, 
      name: r.name, 
      count: r.players.length, 
      mode: r.mode
    }));
  res.json(roomList);
});

// 3. 用户提交题目
app.post('/api/penalties', async (req, res) => {
  const { content, type, level, categoryId, creator } = req.body;
  if (!content || !type || !categoryId) return res.status(400).json({ error: "Missing info" });
  try {
    const newPenalty = await prisma.penalty.create({
      data: {
        content, 
        type, 
        level: parseInt(level), 
        categoryId: parseInt(categoryId), 
        creator: creator || '匿名', 
        status: 'PENDING' 
      }
    });
    res.json({ success: true, data: newPenalty });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// === 👮 管理员接口 ===

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: "密码错误" });
  }
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
    id: r.id, 
    name: r.name, 
    mode: r.mode, 
    password: r.password,
    hostName: r.players.find(p => p.isHost)?.nickname || '未知',
    playerCount: r.players.length, 
    poolSize: r.activePenaltyIds.length,
    createdAt: r.createdAt || Date.now()
  }));
  res.json({ data });
});

app.get('/api/admin/penalties', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, status, deleted } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (deleted === 'true') { where.isDeleted = true; } 
  else { where.isDeleted = false; if (status) where.status = status; }

  try {
    const list = await prisma.penalty.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take: parseInt(limit),
      include: { category: true }
    });
    const total = await prisma.penalty.count({ where });
    res.json({ list, total });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id/restore', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.update({ where: { id: parseInt(id) }, data: { isDeleted: false } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/admin/penalties/:id/hard', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await prisma.penalty.update({ where: { id: parseInt(id) }, data: { status } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.update({ where: { id: parseInt(id) }, data: { isDeleted: true } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/categories', adminAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "分类名称不能为空" });
  try {
    const category = await prisma.category.create({ data: { name, description } });
    res.json({ success: true, data: category });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/penalties/batch', adminAuth, async (req, res) => {
  const { items, categoryId, type, level } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "无数据" });
  try {
    const createPromises = items.map(content => {
      return prisma.penalty.create({
        data: {
          content: content.trim(),
          type: type || 'truth',
          level: parseInt(level) || 3,
          categoryId: parseInt(categoryId),
          creator: '管理员',
          status: 'APPROVED',
          isDeleted: false
        }
      });
    });
    const results = await Promise.all(createPromises);
    res.json({ success: true, count: results.length });
  } catch (e) { res.status(500).json({ error: "导入失败" }); }
});

// 🛠️ 关键修复 1：[Admin] 获取分类列表（避开适配器统计 null 导致的崩溃 Bug）
app.get('/api/admin/categories-stats', adminAuth, async (req, res) => {
  try {
    // 1. 先只查询分类基础信息
    const categories = await prisma.category.findMany();
    
    // 2. 循环每个分类，手动执行 count 统计（count 直接返回数字，不走 _aggr，不会触发 Bug）
    const data = await Promise.all(categories.map(async (c) => {
      const penaltyCount = await prisma.penalty.count({
        where: { 
          categoryId: c.id,
          isDeleted: false 
        }
      });
      
      return {
        id: c.id,
        name: c.name,
        description: c.description || '',
        count: penaltyCount || 0 
      };
    }));

    res.json(data);
  } catch (e) {
    console.error('❌ 获取分类统计失败:', e);
    res.status(500).json({ error: "获取分类失败" });
  }
});

app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const count = await prisma.penalty.count({ where: { categoryId: parseInt(id) } });
    if (count > 0) return res.status(400).json({ error: `该分类下还有 ${count} 道题` });
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "名称不能为空" });
  try {
    await prisma.category.update({ where: { id: parseInt(id) }, data: { name, description } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/admin/penalties/:id/info', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { content, type, level, categoryId } = req.body;
  if (!content) return res.status(400).json({ error: "内容不能为空" });
  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { content, type, level: parseInt(level), categoryId: parseInt(categoryId) }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});


// =======================
//     Socket.io 逻辑
// =======================

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('create_room', async ({ nickname, roomName, mode, password, categoryIds }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // --- 题库加载逻辑 ---
    let initialPool = [];
    const rawIds = Array.isArray(categoryIds) ? categoryIds : [];
    const safeCategoryIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (safeCategoryIds.length > 0) {
      try {
        initialPool = await prisma.penalty.findMany({
          where: { 
            categoryId: { in: safeCategoryIds }, 
            status: 'APPROVED', 
            isDeleted: false 
          },
          include: { category: true } 
        });
      } catch (e) { console.error("❌ 读取题库失败:", e); }
    }

    rooms[roomId] = {
      id: roomId,
      name: roomName || `${nickname}的房间`,
      hostId: socket.id,
      mode,
      password,
      players: [],
      history: [],
      fullPool: initialPool, 
      activePenaltyIds: initialPool.map(p => p.id),
      currentTurnPlayerId: null,
      createdAt: Date.now()
    };

    socket.join(roomId);
    const hostPlayer = { id: socket.id, nickname, isHost: true, avatar: '👑' };
    rooms[roomId].players.push(hostPlayer);

    socket.emit('room_joined', { 
      roomId, 
      roomName: rooms[roomId].name,
      isHost: true, 
      players: rooms[roomId].players,
      history: [],
      poolCount: rooms[roomId].activePenaltyIds.length,
      currentTurnPlayerId: null
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

  socket.on('send_msg', ({ roomId, msg, nickname }) => {
    const room = rooms[roomId];
    if (room) {
      const newMsg = { id: Date.now(), nickname, text: msg, time: new Date().toLocaleTimeString() };
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

  const handleLeave = () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const leaver = room.players[index];
        room.players.splice(index, 1);
        socket.to(roomId).emit('player_left', { id: socket.id });
        if (room.currentTurnPlayerId === socket.id) {
           room.currentTurnPlayerId = null;
           io.to(roomId).emit('turn_reset');
        }
        if (room.players.length === 0) { delete rooms[roomId]; } 
        else if (leaver.isHost) {
          room.players[0].isHost = true;
          io.to(roomId).emit('host_change', { newHostId: room.players[0].id });
        }
        break;
      }
    }
  };

  socket.on('leave_room', handleLeave);
  socket.on('disconnect', handleLeave);
});

server.listen(PORT, () => {
  console.log(`🚀 服务器运行中: ${PORT}`);
});