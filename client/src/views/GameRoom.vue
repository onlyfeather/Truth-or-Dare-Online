<template>
  <div class="h-[100dvh] w-full bg-[#0a0c10] flex flex-col overflow-hidden relative text-sans text-gray-200">
    
    <div v-if="isSpectator" class="w-full bg-yellow-600/90 backdrop-blur text-white text-xs font-bold text-center py-2 z-[60] shadow-md flex-shrink-0 flex items-center justify-center gap-2 tracking-widest uppercase relative">
        <span>🕵️ 上帝视角监控中</span>
        <span class="opacity-50">|</span>
        <span>玩家不可见</span>
        <span class="opacity-50">|</span>
        <span>操作已禁用</span>
        <button @click="isSpectator = false" class="absolute right-4 hover:bg-black/20 rounded p-1" title="临时隐藏">✕</button>
    </div>

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      
      <div class="flex-1 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-800 p-4 bg-[url('/bg-pattern.svg')] bg-[#0a0c10]">
        
        <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div class="bg-gray-800/80 backdrop-blur px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-700 shadow-sm flex items-center gap-2">
            <span>房号: <span class="text-white font-mono font-bold">{{ roomId }}</span></span>
            <span v-if="isSpectator" class="text-[10px] bg-yellow-900/50 text-yellow-500 px-1 rounded border border-yellow-700/50">GHOST</span>
          </div>
          <div class="flex gap-2">
            <button v-if="isHost && !isSpectator" @click="openManager" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm font-bold">
                ⚙️ 题库 ({{ poolCount }})
            </button>
            <button @click="tryLeaveRoom" class="bg-gray-800/80 backdrop-blur hover:bg-red-900/50 text-gray-400 hover:text-red-400 border border-gray-700 px-3 py-1.5 rounded-lg text-xs transition shadow-sm font-bold">
              {{ isSpectator ? '关闭监控' : '退出' }}
            </button>
          </div>
        </div>

        <div class="relative w-full max-w-lg aspect-[4/3] min-h-[300px] bg-gray-800/50 backdrop-blur-sm rounded-2xl border-2 border-gray-700 flex items-center justify-center p-6 text-center shadow-2xl overflow-hidden">
          
          <div v-if="gamePhase === 'IDLE'" class="space-y-4 animate-fade-in">
             <div class="text-6xl animate-bounce">👇</div>
             <h2 class="text-2xl font-black text-white tracking-tight">
               {{ isHost ? '第一步：选个倒霉蛋' : '等待房主选人...' }}
             </h2>
             <p class="text-xs text-gray-500 font-mono uppercase tracking-widest">Online Players: {{ players.length }}</p>
          </div>

          <div v-if="gamePhase === 'PICKING_PLAYER'" class="text-center">
             <div class="text-7xl mb-6 animate-pulse">🕵️</div>
             <h2 class="text-xl text-yellow-500 font-black animate-pulse tracking-widest">正在寻找幸运儿...</h2>
          </div>

          <div v-if="['PLAYER_LOCKED', 'SPINNING_PENALTY', 'SHOW_RESULT'].includes(gamePhase)" class="w-full h-full flex flex-col">
             
             <div class="flex flex-col items-center justify-center py-4 border-b border-gray-700/50 bg-gray-900/40 rounded-t-xl transition-all duration-500"
                  :class="gamePhase === 'SHOW_RESULT' ? 'scale-90 opacity-60' : 'scale-110 my-auto'">
               <div class="text-5xl mb-3 shadow-sm">{{ targetPlayer?.avatar || '👤' }}</div>
               <div class="text-2xl font-black text-yellow-400 drop-shadow-md">
                 {{ targetPlayer?.nickname || '未知玩家' }}
               </div>
               <div v-if="gamePhase === 'PLAYER_LOCKED'" class="text-sm text-gray-400 mt-2 animate-pulse font-bold">
                   已被锁定，准备接招！
               </div>
             </div>

             <div v-if="gamePhase === 'SPINNING_PENALTY'" class="flex-1 flex flex-col items-center justify-center">
                <div class="text-6xl animate-spin mb-4">🎲</div>
                <div class="text-pink-500 font-black text-lg tracking-widest">正在抽取题目...</div>
             </div>

             <div v-if="gamePhase === 'SHOW_RESULT'" class="flex-1 flex flex-col animate-fade-in-up overflow-hidden w-full">
                <div class="flex justify-center gap-3 mt-4">
                  <span :class="['px-3 py-1 rounded text-xs font-black shadow-md uppercase tracking-wider', currentPenalty.type === 'truth' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white']">
                    {{ currentPenalty.type === 'truth' ? '真心话' : '大冒险' }}
                  </span>
                  <span class="px-3 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300 border border-gray-600 shadow-md flex items-center gap-1">
                    📂 {{ currentPenalty.category ? currentPenalty.category.name : '系统' }}
                  </span>
                </div>

                <div class="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar my-4 px-2">
                  <p 
                    :class="[
                        'font-black text-white leading-tight drop-shadow-2xl break-words text-center transition-all duration-300',
                        penaltyFontSizeClass
                    ]"
                  >
                    “{{ currentPenalty.content }}”
                  </p>
                </div>

                <div class="flex justify-between items-center w-full px-6 pb-4 text-[10px] text-gray-500 border-t border-gray-700/30 pt-3">
                   <span class="flex items-center gap-1 font-bold">
                     👤 贡献者: {{ currentPenalty.creator || '系统' }}
                   </span>
                   <span class="flex items-center gap-1 font-mono text-yellow-600 font-black text-xs">
                     ⚡ LEVEL {{ currentPenalty.level }}
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div v-if="!isSpectator" class="mt-8 flex-shrink-0">
            <div v-if="isHost">
              <button v-if="gamePhase === 'IDLE'" @click="handlePickPlayer" class="px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full text-xl font-black shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95 transition-all text-white">🎲 随机选人</button>
              <button v-else-if="gamePhase === 'PICKING_PLAYER'" disabled class="px-10 py-4 bg-gray-700 text-gray-400 rounded-full text-xl font-black cursor-not-allowed opacity-50">👀 选人中...</button>
              <button v-else-if="gamePhase === 'PLAYER_LOCKED'" @click="handleSpinPenalty" :disabled="poolCount === 0" class="px-10 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full text-xl font-black shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:scale-105 active:scale-95 transition-all text-white disabled:opacity-50">{{ poolCount === 0 ? '题库空了' : '🔥 抽取惩罚' }}</button>
              <button v-else-if="gamePhase === 'SPINNING_PENALTY'" disabled class="px-10 py-4 bg-gray-700 text-gray-400 rounded-full text-xl font-black cursor-not-allowed opacity-50">🎲 抽取中...</button>
              <button v-else-if="gamePhase === 'SHOW_RESULT'" @click="handleNextRound" class="px-10 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-gray-600">🔄 下一轮</button>
            </div>
            <div v-else class="bg-gray-800/50 border border-gray-700 px-6 py-2 rounded-full text-gray-400 text-sm font-bold animate-pulse tracking-widest uppercase">
               Waiting for host...
            </div>
        </div>

        <div v-else class="mt-8 text-gray-600 text-xs font-mono border border-gray-800 px-6 py-2 rounded-full select-none tracking-tighter uppercase bg-black/20">
            [ Read-Only Mode - Controls Disabled ]
        </div>
      </div>

      <div class="w-full md:w-96 bg-[#0d0f14] flex flex-col h-[45%] md:h-full border-t md:border-t-0 border-gray-800 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20">
        <div class="p-3 border-b border-gray-800/50 bg-[#0d0f14]/80 backdrop-blur flex-shrink-0 flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Players Online ({{ players.length }})</span>
          <div class="flex gap-2 overflow-x-auto max-w-[65%] custom-scrollbar pb-1 no-scrollbar">
              <span v-for="p in players" :key="p.id" class="text-[11px] bg-gray-800/80 px-2 py-1 rounded-lg border border-gray-700 whitespace-nowrap font-bold text-gray-300">
                {{ p.avatar }} {{ p.nickname }}
              </span>
          </div>
        </div>

        <div ref="chatBoxRef" class="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0d0f14] scroll-smooth custom-scrollbar">
          <div v-for="msg in messages" :key="msg.id" class="w-full animate-fade-in">
            <div v-if="getMsgType(msg) === 'system'" class="text-center my-4">
              <span class="inline-block bg-gray-800/50 text-gray-400 text-[11px] font-black py-1 px-4 rounded-full border border-gray-700 shadow-inner uppercase tracking-tighter">{{ msg.text }}</span>
            </div>
            
            <div v-else-if="getMsgType(msg) === 'others'" class="flex flex-col items-start">
               <div class="flex items-baseline space-x-2 mb-1.5 ml-1">
                 <span class="text-xs text-gray-500 font-black uppercase">{{ msg.nickname }}</span>
                 <span class="text-[10px] text-gray-600 font-mono">{{ msg.time }}</span>
               </div>
               <div class="bg-gray-800 text-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-none max-w-[92%] text-[15px] shadow-lg border border-gray-700/50 break-all leading-relaxed font-medium">
                 {{ msg.text }}
               </div>
            </div>
            
            <div v-else class="flex flex-col items-end">
               <div class="flex items-baseline space-x-2 mb-1.5 mr-1 flex-row-reverse">
                 <span class="text-xs text-pink-500 font-black uppercase ml-2">YOU</span>
                 <span class="text-[10px] text-gray-600 font-mono mr-1">{{ msg.time }}</span>
               </div>
               <div class="bg-gradient-to-br from-pink-600 to-rose-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none max-w-[92%] text-[15px] shadow-xl shadow-pink-900/10 break-all leading-relaxed font-bold">
                 {{ msg.text }}
               </div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-[#0d0f14] border-t border-gray-800/50 flex-shrink-0">
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input v-model="inputMsg" type="text" :placeholder="isSpectator ? '隐身模式不可发言' : '说点什么...'" :disabled="isSpectator" class="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"/>
            <button type="submit" :disabled="isSpectator" class="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2 rounded-xl text-base transition-all font-black shadow-lg shadow-pink-600/20 disabled:opacity-50">发送</button>
          </form>
        </div>
      </div>

      <div v-if="showManager" class="absolute inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-gray-800 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden animate-scale-in">
          <div class="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
            <h3 class="text-lg font-black text-white flex items-center gap-2"><span>📂</span> 房间题库设置</h3>
            <button @click="showManager = false" class="text-gray-400 hover:text-white bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition">✕</button>
          </div>
          <div class="p-3 bg-gray-900/50 border-b border-gray-700">
            <input v-model="filterText" placeholder="搜索题目内容或分类..." class="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 text-gray-200 shadow-inner">
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/20">
             <div v-for="(items, categoryName) in groupedPool" :key="categoryName" class="border-b border-gray-700/50 last:border-0">
               <div @click="toggleGroup(categoryName)" class="sticky top-0 z-10 bg-gray-800/95 px-4 py-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-700/50 transition">
                 <div class="flex items-center gap-3">
                   <span :class="['text-pink-500 text-[10px] transition-transform duration-300', expandedGroups[categoryName] ? 'rotate-90' : '']">▶</span>
                   <span class="text-white font-black text-sm uppercase tracking-wider">{{ categoryName }}</span>
                   <span class="bg-gray-700 text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">{{ items.length }}</span>
                 </div>
                 <div class="text-[10px] text-gray-500 font-bold">已选: {{ items.filter(i => tempActiveIds.includes(i.id)).length }}</div>
               </div>
               <div v-show="expandedGroups[categoryName]" class="p-2 space-y-1 bg-black/10">
                 <div v-for="item in items" :key="item.id" class="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-white/5 group" @click="toggleItem(item.id)">
                     <div :class="['w-5 h-5 mt-0.5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all', tempActiveIds.includes(item.id) ? 'bg-pink-600 border-pink-600' : 'border-gray-600 bg-gray-900']">
                       <span v-if="tempActiveIds.includes(item.id)" class="text-white text-[10px] font-black">✓</span>
                     </div>
                     <div class="flex-1 min-w-0">
                       <p :class="['text-sm leading-relaxed transition-all', tempActiveIds.includes(item.id) ? 'text-gray-200 font-medium' : 'text-gray-600 line-through opacity-50']">
                         {{ item.content }}
                       </p>
                     </div>
                 </div>
               </div>
             </div>
          </div>
          <div class="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-800">
            <button @click="showManager = false" class="px-6 py-2.5 text-gray-400 text-sm font-black hover:text-white transition">取消</button>
            <button @click="saveManagerSettings" class="px-8 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-black text-sm shadow-lg shadow-pink-600/20 active:scale-95 transition-all">保存配置</button>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="modal.show" class="absolute inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-700 p-8 animate-scale-in text-center">
            <div class="text-6xl mb-6">{{ modal.icon || '👋' }}</div>
            <h3 class="text-xl font-black text-white mb-3 tracking-tight">{{ modal.title }}</h3>
            <p class="text-[15px] text-gray-400 mb-8 leading-relaxed px-2">{{ modal.content }}</p>
            <div class="flex gap-4">
              <button 
                v-if="modal.type === 'confirm'" 
                @click="modal.show = false" 
                class="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-2xl font-black transition-all"
              >
                {{ modal.cancelText || '取消' }}
              </button>
              <button 
                @click="handleModalConfirm" 
                :class="['flex-1 py-3.5 text-white rounded-2xl font-black shadow-lg transition-all', modal.type === 'confirm' ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gray-600 hover:bg-gray-500']"
              >
                {{ modal.confirmText || '确定' }}
              </button>
            </div>
          </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import socket from '../socket';

const route = useRoute();
const router = useRouter();
const roomId = route.params.id;

// === 基础状态 ===
const players = ref([]);
const messages = ref([]);
const inputMsg = ref('');
const chatBoxRef = ref(null);
const poolCount = ref(0); 
const isSpectator = ref(false); 

// === 游戏逻辑状态 ===
const gamePhase = ref('IDLE'); 
const targetPlayerId = ref(null);
const currentPenalty = ref(null);

// === UI 状态 ===
const showManager = ref(false);
const managerFullPool = ref([]); 
const tempActiveIds = ref([]); 
const filterText = ref('');
const expandedGroups = ref({});

// === 通用模态框状态 ===
const modal = ref({
  show: false,
  type: 'alert',
  title: '',
  content: '',
  icon: '',
  confirmText: '确定',
  cancelText: '取消',
  onConfirm: null
});

// === 🟢 核心：动态字号计算 (适配手机端长文本) ===
const penaltyFontSizeClass = computed(() => {
  if (!currentPenalty.value) return 'text-2xl';
  const len = currentPenalty.value.content.length;
  // 根据字符数动态缩放
  if (len > 60) return 'text-lg md:text-xl'; 
  if (len > 40) return 'text-xl md:text-2xl';
  if (len > 25) return 'text-2xl md:text-4xl';
  return 'text-3xl md:text-5xl'; // 短句显示巨大
});

// === 计算属性 ===
const isHost = computed(() => {
  if (isSpectator.value) return false;
  const me = players.value.find(p => p.id === socket.id);
  return me?.isHost || false;
});

const targetPlayer = computed(() => players.value.find(p => p.id === targetPlayerId.value));

const filteredPool = computed(() => {
   if (!filterText.value) return managerFullPool.value;
   return managerFullPool.value.filter(item => 
    item.content.includes(filterText.value) || 
    item.category?.name.includes(filterText.value)
   );
});

const groupedPool = computed(() => {
  const groups = {};
  filteredPool.value.forEach(item => {
    const catName = item.category ? item.category.name : '其他';
    if (!groups[catName]) groups[catName] = [];
    groups[catName].push(item);
  });
  return groups;
});

// === 🟢 核心：东八区时间生成函数 ===
const getBeijinTime = () => {
  return new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit'
  });
};

watch(filterText, (newVal) => {
  if (newVal.trim()) {
    const allKeys = {};
    Object.keys(groupedPool.value).forEach(k => allKeys[k] = true);
    expandedGroups.value = allKeys;
  } else {
    expandedGroups.value = {};
  }
});

// === 弹窗辅助函数 ===
const showDialog = ({ title, content, icon = '🔔', type = 'alert', confirmText, cancelText, onConfirm }) => {
  modal.value = { show: true, title, content, icon, type, confirmText, cancelText, onConfirm };
};

const handleModalConfirm = () => {
  if (modal.value.onConfirm) modal.value.onConfirm();
  modal.value.show = false;
};

// === 动作逻辑 ===
const handlePickPlayer = () => { 
    if (players.value.length < 1) return showDialog({ title: '无法开始', content: '房间里目前只有你一个人哦。', icon: '💨' }); 
    socket.emit('pick_player', { roomId }); 
};
const handleSpinPenalty = () => socket.emit('spin_wheel', { roomId });
const handleNextRound = () => socket.emit('reset_turn', { roomId });

const sendMessage = () => {
  if (isSpectator.value || !inputMsg.value.trim()) return;
  const me = players.value.find(p => p.id === socket.id);
  
  // 发送消息时携带东八区时间
  socket.emit('send_msg', { 
    roomId, 
    msg: inputMsg.value, 
    nickname: me ? me.nickname : '我',
    time: getBeijinTime() 
  });
  inputMsg.value = '';
};

const getMsgType = (msg) => {
  if (msg.nickname === '系统') return 'system';
  const me = players.value.find(p => p.id === socket.id);
  if (me && (msg.nickname === me.nickname || msg.isMe)) return 'mine';
  return 'others';
};

const openManager = () => { showManager.value = true; socket.emit('get_pool_details', { roomId }); };
const toggleItem = (id) => { if (tempActiveIds.value.includes(id)) tempActiveIds.value = tempActiveIds.value.filter(x => x !== id); else tempActiveIds.value.push(id); };
const toggleGroup = (catName) => { expandedGroups.value[catName] = !expandedGroups.value[catName]; };
const saveManagerSettings = () => { socket.emit('update_pool', { roomId, activeIds: tempActiveIds.value }); showManager.value = false; };

const tryLeaveRoom = () => {
  if (isSpectator.value) {
    showDialog({
      title: '结束监控？',
      content: '您将断开连接并返回管理员后台。',
      icon: '👋',
      type: 'confirm',
      confirmText: '确认退出',
      onConfirm: () => {
        socket.emit('leave_room');
        router.push('/admin');
      }
    });
  } else {
    showDialog({
      title: '要离开吗？',
      content: '离开后房间仍会保留，但你的位置可能会被别人占领哦。',
      icon: '🚪',
      type: 'confirm',
      confirmText: '确定离开',
      cancelText: '再玩会',
      onConfirm: () => {
        socket.emit('leave_room');
        sessionStorage.removeItem('room_session');
        router.push('/');
      }
    });
  }
};

const scrollToBottom = async () => { await nextTick(); if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight; };

function initGameData(data) {
  players.value = data.players || [];
  messages.value = data.history || [];
  poolCount.value = data.poolCount || 0;
  if (data.currentTurnPlayerId) { 
      targetPlayerId.value = data.currentTurnPlayerId; 
      gamePhase.value = data.currentPenalty ? 'SHOW_RESULT' : 'PLAYER_LOCKED';
      if (data.currentPenalty) currentPenalty.value = data.currentPenalty;
  } else { 
      gamePhase.value = 'IDLE'; 
  }
  if (data.isSpectator) isSpectator.value = true;
  scrollToBottom();
}

// === 生命周期 ===
onMounted(() => {
  if (route.query.spectate === 'true') {
    isSpectator.value = true;
    const token = localStorage.getItem('admin_auth_token');
    if (!socket.connected) socket.connect();
    socket.emit('join_room', { roomId, nickname: 'Admin_Observer', isGhost: true, adminToken: token });
  } 
  else {
    const sessionData = JSON.parse(sessionStorage.getItem('room_session') || 'null');
    const navState = history.state.roomData;

    if (navState && socket.connected) {
      initGameData(navState);
    } else if (sessionData && sessionData.roomId === roomId) {
      if (!socket.connected) socket.connect();
      socket.emit('join_room', sessionData);
    } else {
      showDialog({
        title: '无法进入',
        content: '未检测到有效的会话信息，请重新从首页加入。',
        icon: '🚫',
        confirmText: '返回首页',
        onConfirm: () => router.push('/')
      });
      return;
    }
  }
  
  document.title = `房间 ${roomId} | 正在游戏`;

  // === Socket 监听 ===
  socket.on('room_joined', initGameData);
  socket.on('error_msg', (msg) => { 
    showDialog({
      title: '出错啦',
      content: msg,
      icon: '⚠️',
      confirmText: '确定',
      onConfirm: () => router.push(isSpectator.value ? '/admin' : '/')
    });
  });
  
  socket.on('player_joined', (p) => { 
      if (!players.value.find(x => x.id === p.id)) { 
          players.value.push(p); 
          messages.value.push({ id: Date.now(), nickname: '系统', text: `${p.nickname} 加入了房间`, time: getBeijinTime() }); 
          scrollToBottom(); 
      } 
  });

  socket.on('player_left', ({ id }) => { 
      const leaver = players.value.find(p => p.id === id); 
      players.value = players.value.filter(p => p.id !== id); 
      if (leaver) {
          messages.value.push({ id: Date.now(), nickname: '系统', text: `${leaver.nickname} 离开了房间`, time: getBeijinTime() }); 
          scrollToBottom(); 
      }
  });

  socket.on('host_change', ({ newHostId }) => { 
      players.value.forEach(p => p.isHost = (p.id === newHostId));
      messages.value.push({ id: Date.now(), nickname: '系统', text: '房主已易位', time: getBeijinTime() });
  });

  socket.on('receive_msg', (msg) => { messages.value.push(msg); scrollToBottom(); });
  socket.on('pool_updated', ({ count }) => poolCount.value = count);
  socket.on('pool_details', ({ fullPool, activeIds }) => { managerFullPool.value = fullPool; tempActiveIds.value = [...activeIds]; });
  socket.on('picking_player_start', () => { gamePhase.value = 'PICKING_PLAYER'; currentPenalty.value = null; targetPlayerId.value = null; });
  socket.on('player_selected', ({ playerId }) => { targetPlayerId.value = playerId; gamePhase.value = 'PLAYER_LOCKED'; });
  socket.on('spin_start', () => { gamePhase.value = 'SPINNING_PENALTY'; });
  socket.on('show_result', ({ result }) => { currentPenalty.value = result; gamePhase.value = 'SHOW_RESULT'; });
  socket.on('turn_reset', () => { gamePhase.value = 'IDLE'; targetPlayerId.value = null; currentPenalty.value = null; });
});

onUnmounted(() => {
  socket.off('room_joined'); socket.off('error_msg'); socket.off('player_joined');
  socket.off('receive_msg'); socket.off('player_left'); socket.off('host_change');
  socket.off('pool_updated'); socket.off('pool_details');
  socket.off('picking_player_start'); socket.off('player_selected');
  socket.off('spin_start'); socket.off('show_result'); socket.off('turn_reset');
});
</script>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ec4899; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }

/* 隐藏横向滚动条但保留功能 */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>