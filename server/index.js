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
  const authHeader = req.headers.authorization; // 前端发来: "Bearer admin666"
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // 提取 "admin666"
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

// 2. 获取活跃房间列表 (公开 - 从内存读取)
app.get('/api/rooms', (req, res) => {
  // 只返回公开的房间
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

// 3. 用户提交题目 (公开)
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
        status: 'PENDING' // 默认为待审核
      }
    });
    res.json({ success: true, data: newPenalty });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// === 👮 管理员接口 ===

// 4. 管理员登录
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: "密码错误" });
  }
});

// 5. 获取统计数据
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await prisma.penalty.count();
    const pending = await prisma.penalty.count({ where: { status: 'PENDING' } });
    const approved = await prisma.penalty.count({ where: { status: 'APPROVED' } });
    const roomCount = Object.keys(rooms).length; // 内存中的活跃房间数
    res.json({ total, pending, approved, rooms: roomCount });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 6. 获取活跃房间详情 (管理员可见所有，包括私密)
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

// 7. 获取题目列表 (支持分页、筛选状态、回收站)
app.get('/api/admin/penalties', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, status, deleted } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const where = {};

  // 🗑️ 如果 deleted='true'，只查回收站里的；否则查正常的
  if (deleted === 'true') {
    where.isDeleted = true;
  } else {
    where.isDeleted = false;
    // status 筛选只在正常列表里生效
    if (status) where.status = status;
  }

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

// 8. 恢复题目 (从回收站捞回)
app.put('/api/admin/penalties/:id/restore', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { isDeleted: false }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 9. 硬删除 (彻底从数据库移除)
app.delete('/api/admin/penalties/:id/hard', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 10. 更新题目审核状态 (APPROVED / REJECTED)
app.put('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 11. 软删除题目 (移入回收站)
app.delete('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });
    console.log(`🗑️ 软删除了题目 ID: ${id}`);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "删除失败" });
  }
});

// 12. 创建新分类
app.post('/api/admin/categories', adminAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "分类名称不能为空" });
  try {
    const category = await prisma.category.create({
      data: { name, description }
    });
    res.json({ success: true, data: category });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "创建失败，可能是名称重复" });
  }
});

// 13. 批量导入题目
app.post('/api/admin/penalties/batch', adminAuth, async (req, res) => {
  const { items, categoryId, type, level } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "没有有效的数据" });
  }

  try {
    // 🟢 修复方法：将 createMany 改为并发执行多个 create
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

    // 等待所有插入操作完成
    const results = await Promise.all(createPromises);

    res.json({ success: true, count: results.length });
  } catch (e) {
    console.error('❌ 批量导入详细报错:', e);
    res.status(500).json({ error: "导入失败，请检查数据库连接或分类 ID" });
  }
});

// 14. 获取分类列表（带题目计数）
app.get('/api/admin/categories-stats', adminAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { penalties: true }
        }
      }
    });
    const data = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      count: c._count.penalties
    }));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "获取分类失败" });
  }
});

// 15. 删除分类
app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const count = await prisma.penalty.count({
      where: { categoryId: parseInt(id) }
    });

    if (count > 0) {
      return res.status(400).json({ error: `无法删除：该分类下还有 ${count} 道题目。请先清空或转移题目。` });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "删除失败" });
  }
});

// 16. 更新分类名称
app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "名称不能为空" });
  
  try {
    await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, description }
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "更新失败" });
  }
});

// 17. 更新题目完整信息
app.put('/api/admin/penalties/:id/info', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { content, type, level, categoryId } = req.body;
  
  if (!content) return res.status(400).json({ error: "内容不能为空" });

  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { 
        content,
        type,
        level: parseInt(level),
        categoryId: parseInt(categoryId)
      }
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "更新失败" });
  }
});


// =======================
//     Socket.io 逻辑
// =======================

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 1. 创建房间
  socket.on('create_room', async ({ nickname, roomName, mode, password, categoryIds }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log(`🏠 [创建房间] ID:${roomId} 房主:${nickname}`);

    // --- 题库加载逻辑 ---
    let initialPool = [];
    const rawIds = Array.isArray(categoryIds) ? categoryIds : [];
    const safeCategoryIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (safeCategoryIds.length > 0) {
      try {
        // 从数据库加载题目 (Approved + Not Deleted)
        initialPool = await prisma.penalty.findMany({
          where: { 
            categoryId: { in: safeCategoryIds }, 
            status: 'APPROVED', 
            isDeleted: false 
          },
          include: { category: true } 
        });
        console.log(`✅ 成功加载题库: 找到 ${initialPool.length} 道题目`);
      } catch (e) {
        console.error("❌ 读取题库失败:", e);
      }
    }

    // 初始化内存房间状态
    rooms[roomId] = {
      id: roomId,
      name: roomName || `${nickname}的房间`,
      hostId: socket.id,
      mode,
      password,
      players: [],
      history: [],
      // 题目池 (内存中)
      fullPool: initialPool, 
      activePenaltyIds: initialPool.map(p => p.id),
      // 游戏状态
      currentTurnPlayerId: null,
      createdAt: Date.now()
    };

    socket.join(roomId);
    
    const hostPlayer = { id: socket.id, nickname, isHost: true, avatar: '👑' };
    rooms[roomId].players.push(hostPlayer);

    // 发送初始化数据给房主
    socket.emit('room_joined', { 
      roomId, 
      roomName: rooms[roomId].name,
      isHost: true, 
      players: rooms[roomId].players,
      history: [],
      poolCount: rooms[roomId].activePenaltyIds.length,
      currentTurnPlayerId: null,
      categoryId: null 
    });
  });

  // 2. 加入房间
  socket.on('join_room', ({ roomId, nickname, password, isGhost, adminToken }) => {
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('error_msg', '房间不存在或已关闭');
    }

    // --- 上帝视角逻辑 ---
    if (isGhost) {
      if (adminToken !== ADMIN_PASSWORD) {
         return socket.emit('error_msg', '无权访问：管理员密钥错误');
      }
      console.log(`🕵️ 管理员隐身进入房间: ${roomId}`);
      
      socket.join(roomId); // 只加入频道，不进入 players 列表

      socket.emit('room_joined', { 
        roomId, 
        roomName: room.name, 
        isHost: false, 
        players: room.players, 
        history: room.history, 
        poolCount: room.activePenaltyIds.length, 
        currentTurnPlayerId: room.currentTurnPlayerId,
        isSpectator: true
      });
      return;
    }
    // -------------------

    // 普通玩家验证
    if (room.mode === 'private' && room.password !== password) {
      return socket.emit('error_msg', '密码错误');
    }

    socket.join(roomId);

    // 检查是否重连或新玩家
    let player = room.players.find(p => p.id === socket.id);
    if (!player) {
      player = { 
         id: socket.id, 
         nickname, 
         isHost: false, 
         avatar: ['🐶','🐱','🐭','🐹','🐰','🦊'][Math.floor(Math.random()*6)] 
      };
      room.players.push(player);
      socket.to(roomId).emit('player_joined', player);
    }

    socket.emit('room_joined', { 
      roomId, 
      roomName: room.name, 
      isHost: player.isHost, 
      players: room.players, 
      history: room.history, 
      poolCount: room.activePenaltyIds.length, 
      currentTurnPlayerId: room.currentTurnPlayerId
    });
  });

  // 3. 聊天
  socket.on('send_msg', ({ roomId, msg, nickname }) => {
    const room = rooms[roomId];
    if (room) {
      const newMsg = { 
        id: Date.now(), 
        nickname, 
        text: msg, 
        time: new Date().toLocaleTimeString() 
      };
      room.history.push(newMsg);
      // 保持历史记录不超过 50 条防止内存溢出
      if (room.history.length > 50) room.history.shift();
      io.to(roomId).emit('receive_msg', newMsg);
    }
  });

  // 4. 随机选人
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

  // 5. 抽取惩罚
  socket.on('spin_wheel', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.activePenaltyIds.length === 0) return;
    
    io.to(roomId).emit('spin_start', {});

    setTimeout(() => {
      const randomId = room.activePenaltyIds[Math.floor(Math.random() * room.activePenaltyIds.length)];
      const result = room.fullPool.find(p => p.id === randomId);
      io.to(roomId).emit('show_result', { result });
    }, 2000);
  });

  // 6. 重置回合
  socket.on('reset_turn', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      room.currentTurnPlayerId = null;
      io.to(roomId).emit('turn_reset');
    }
  });

  // 7. 管理题库：获取详情
  socket.on('get_pool_details', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    socket.emit('pool_details', {
      fullPool: room.fullPool,
      activeIds: room.activePenaltyIds
    });
  });

  // 8. 管理题库：更新选中状态
  socket.on('update_pool', ({ roomId, activeIds }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.activePenaltyIds = activeIds;
    io.to(roomId).emit('pool_updated', { count: activeIds.length });
  });

  // 9. 离开房间 / 断开连接
  const handleLeave = () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      
      if (index !== -1) {
        const leaver = room.players[index];
        room.players.splice(index, 1);
        
        // 广播离开
        socket.to(roomId).emit('player_left', { id: socket.id });

        // 如果被选中的人跑了，重置游戏状态
        if (room.currentTurnPlayerId === socket.id) {
           room.currentTurnPlayerId = null;
           io.to(roomId).emit('turn_reset');
           const sysMsg = { id: Date.now(), nickname: '系统', text: '当前目标逃跑了，回合重置！', time: new Date().toLocaleTimeString() };
           io.to(roomId).emit('receive_msg', sysMsg);
        }

        // 如果房间空了 -> 删除内存
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ 房间 ${roomId} 已销毁`);
        } 
        // 如果房主跑了 -> 移交房主权限
        else if (leaver.isHost) {
          room.players[0].isHost = true;
          io.to(roomId).emit('host_change', { newHostId: room.players[0].id });
        }
        break;
      }
    }
  };

  socket.on('leave_room', handleLeave);
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    handleLeave();
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`
  🚀 服务器运行中!
  --------------------------
  📡 接口地址: http://localhost:${PORT}
  🔗 允许跨域: ${CLIENT_URL}
  💽 数据库: Turso Cloud (Prisma Adapter)
  --------------------------
  `);
});