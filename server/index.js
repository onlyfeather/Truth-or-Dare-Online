require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// 从环境变量读取配置
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin666";

app.use(cors({
  origin: CLIENT_URL, // ✅ 使用变量
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL, // ✅ 使用变量
    methods: ["GET", "POST"]
  }
});
let rooms = {};

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

// === API 接口 ===

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms).filter(r => !r.isPrivate).map(r => ({
    id: r.id, name: r.name, count: r.players.length, mode: r.mode
  }));
  res.json(roomList);
});

app.post('/api/penalties', async (req, res) => {
  const { content, type, level, categoryId, creator } = req.body;
  if (!content || !type || !categoryId) return res.status(400).json({ error: "Missing info" });
  try {
    const newPenalty = await prisma.penalty.create({
      data: {
        content, type, level: parseInt(level), categoryId: parseInt(categoryId), creator: creator || '匿名', status: 'PENDING'
      }
    });
    res.json({ success: true, data: newPenalty });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// === 👮 管理员接口 (适配新前端) ===

// 1. 登录接口
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    // 简单起见，直接把密码当 Token 返回
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: "密码错误" });
  }
});

// 2. 统计数据
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await prisma.penalty.count();
    const pending = await prisma.penalty.count({ where: { status: 'PENDING' } });
    const approved = await prisma.penalty.count({ where: { status: 'APPROVED' } });
    const roomCount = Object.keys(rooms).length;
    res.json({ total, pending, approved, rooms: roomCount });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 3. 活跃房间
app.get('/api/admin/active-rooms', adminAuth, (req, res) =>{
  const data = Object.values(rooms).map(r => ({
    id: r.id, 
    name: r.name, 
    mode: r.mode, 
    password: r.password,
    hostName: r.players.find(p => p.isHost)?.nickname || '未知',
    playerCount: r.players.length, 
    poolSize: r.activePenaltyIds.length,
    createdAt: r.createdAt || Date.now() // 👈 新增：返回创建时间
  }));
  res.json({ data });
});

// === 修改：获取题目列表 (支持回收站模式) ===
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

// === 新增：恢复题目 (后悔药) ===
app.put('/api/admin/penalties/:id/restore', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { isDeleted: false } // 👈 复活！
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// === 新增：硬删除 (彻底粉碎) ===
app.delete('/api/admin/penalties/:id/hard', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.penalty.delete({ where: { id: parseInt(id) } }); // 👈 真的删了
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 5. 更新状态
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

// 6. 删除题目 (软删除)
app.delete('/api/admin/penalties/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // 之前是 .delete，现在改为 .update
    await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true } // 👈 只是打个标记，不真删
    });
    console.log(`🗑️ 软删除了题目 ID: ${id}`);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "删除失败" });
  }
});

// === 🆕 新增：创建新分类 ===
app.post('/api/admin/categories', adminAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "分类名称不能为空" });
  try {
    const category = await prisma.category.create({
      data: { name }
    });
    res.json({ success: true, data: category });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "创建失败，可能是名称重复" });
  }
});

// === 🆕 新增：批量导入题目 ===
app.post('/api/admin/penalties/batch', adminAuth, async (req, res) => {
  const { items, categoryId, type, level } = req.body;
  // items 是一个字符串数组，包含多个题目内容
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "没有有效的数据" });
  }

  try {
    // 构造数据数组
    const data = items.map(content => ({
      content: content.trim(),
      type,
      level: parseInt(level),
      categoryId: parseInt(categoryId),
      creator: '管理员', // 批量导入默认作者
      status: 'APPROVED', // 🆕 管理员导入的默认直接通过
      isDeleted: false
    }));

    // Prisma 批量插入
    const result = await prisma.penalty.createMany({
      data,
      skipDuplicates: true // 跳过完全重复的
    });

    res.json({ success: true, count: result.count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "批量导入失败" });
  }
});

// === 🆕 [Admin] 获取分类列表（带题目数量统计） ===
app.get('/api/admin/categories-stats', adminAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { penalties: true } // 统计关联的题目数量
        }
      }
    });
    // 格式化返回：{ id, name, count }
    const data = categories.map(c => ({
      id: c.id,
      name: c.name,
      count: c._count.penalties
    }));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "获取分类失败" });
  }
});

// === 🆕 [Admin] 删除分类 ===
app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. 检查该分类下是否有题目
    const count = await prisma.penalty.count({
      where: { categoryId: parseInt(id) }
    });

    if (count > 0) {
      return res.status(400).json({ error: `无法删除：该分类下还有 ${count} 道题目。请先清空或转移题目。` });
    }

    // 2. 安全删除
    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "删除失败" });
  }
});

// === 🆕 [Admin] 更新分类名称 ===
app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "名称不能为空" });
  
  try {
    await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name }
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "更新失败，可能是名称重复" });
  }
});

// === 🔄 [Admin] 更新题目完整信息 (内容/等级/分类/类型) ===
// 替换掉之前的 .../content 接口
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

// === Socket.io 逻辑区域 ===

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 1. 创建房间
  socket.on('create_room', async ({ nickname, roomName, mode, password, categoryIds }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log(`🏠 [创建房间] ID:${roomId} 房主:${nickname}`);
    console.log(`📥 收到分类IDs:`, categoryIds);

    // === 关键修复开始 ===
    let initialPool = [];
    
    // 1. 确保 categoryIds 是一个数组，并过滤掉无效值
    const rawIds = Array.isArray(categoryIds) ? categoryIds : [];
    
    // 2. 强制转为整数 (Prisma 对类型非常敏感)
    const safeCategoryIds = rawIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));

    if (safeCategoryIds.length > 0) {
      try {
        // 3. 数据库查询：只查【已通过】且【属于选中分类】的题目
        initialPool = await prisma.penalty.findMany({
          where: { 
            categoryId: { in: safeCategoryIds }, 
            status: 'APPROVED', // <--- 必须加这个！否则会抽到没审核的脏话
            isDeleted: false // 如果你做了软删除，记得加上这个
          },
          include: { category: true } 
        });
        
        console.log(`✅ 成功加载题库: 找到 ${initialPool.length} 道题目`);
      } catch (e) {
        console.error("❌ 读取题库失败:", e);
      }
    } else {
      console.log("⚠️ 未选择任何分类，或者是分类ID格式错误");
    }
    // === 关键修复结束 ===

    rooms[roomId] = {
      id: roomId,
      name: roomName || `${nickname}的房间`,
      hostId: socket.id,
      mode,
      password,
      players: [],
      history: [],
      // 题目池
      fullPool: initialPool, 
      activePenaltyIds: initialPool.map(p => p.id),
      // 游戏状态
      currentTurnPlayerId: null,
      createdAt: Date.now()
    };

    socket.join(roomId);
    
    const hostPlayer = { id: socket.id, nickname, isHost: true, avatar: '👑' };
    rooms[roomId].players.push(hostPlayer);

    // 发送房间信息回给房主
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

  // 2. 加入房间 (支持普通玩家 & 上帝视角)
  socket.on('join_room', ({ roomId, nickname, password, isGhost, adminToken }) => {
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('error_msg', '房间不存在');
    }

    // === 👻 上帝视角 (核心逻辑) ===
    if (isGhost) {
      // 验证管理员权限 (防止普通用户猜参数混入)
      if (adminToken !== ADMIN_PASSWORD) {
         return socket.emit('error_msg', '无权访问：管理员密钥错误');
      }

      console.log(`🕵️ 管理员隐身进入房间: ${roomId}`);
      
      // 1. 只加入 Socket 频道 (为了接收 update_pool, show_result 等广播)
      socket.join(roomId);

      // 2. 发送房间全量数据给管理员
      // 注意：这里没有把管理员加到 room.players 里，也没有广播 player_joined
      socket.emit('room_joined', { 
        roomId, 
        roomName: room.name, 
        isHost: false, // 永远不是房主
        players: room.players, 
        history: room.history, 
        poolCount: room.activePenaltyIds.length, 
        currentTurnPlayerId: room.currentTurnPlayerId,
        isSpectator: true // 告诉前端：你是观众
      });
      
      return; // ⛔️ 结束执行，不走下面的普通玩家逻辑
    }
    // =============================

    // --- 下面是普通玩家逻辑 (保持不变) ---
    if (room.mode === 'private' && room.password !== password) {
      return socket.emit('error_msg', '密码错误');
    }

    socket.join(roomId);

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
  

  // 3. 聊天消息
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

  // 7. 题库管理 (获取详情)
  socket.on('get_pool_details', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    socket.emit('pool_details', {
      fullPool: room.fullPool,
      activeIds: room.activePenaltyIds
    });
  });

  // 8. 题库管理 (更新)
  socket.on('update_pool', ({ roomId, activeIds }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.activePenaltyIds = activeIds;
    io.to(roomId).emit('pool_updated', { count: activeIds.length });
  });

  // 9. 离开房间 (通用处理)
  const handleLeave = () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      
      if (index !== -1) {
        const leaver = room.players[index];
        room.players.splice(index, 1);
        
        // 广播离开
        socket.to(roomId).emit('player_left', { id: socket.id });

        // 如果是当前目标逃跑，重置回合
        if (room.currentTurnPlayerId === socket.id) {
           room.currentTurnPlayerId = null;
           io.to(roomId).emit('turn_reset');
           const sysMsg = { id: Date.now(), nickname: '系统', text: '目标逃跑，回合重置！', time: new Date().toLocaleTimeString() };
           room.history.push(sysMsg);
           io.to(roomId).emit('receive_msg', sysMsg);
        }

        // 如果房间空了 -> 删除
        if (room.players.length === 0) {
          delete rooms[roomId];
        } 
        // 如果房主走了 -> 移交房主
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

// 启动监听
server.listen(PORT, () => {
  console.log(`
  🚀 服务器运行中!
  --------------------------
  📡 接口地址: http://localhost:${PORT}
  🔗 允许跨域: ${CLIENT_URL}
  --------------------------
  `);
});