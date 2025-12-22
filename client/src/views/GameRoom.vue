<template>
  <div class="h-[100dvh] w-full bg-[#0a0c10] flex flex-col overflow-hidden relative text-sans text-gray-200">
    
    <div v-if="isSpectator" class="w-full bg-yellow-600/90 backdrop-blur text-white text-xs font-bold text-center py-2 z-[60] shadow-md flex-shrink-0 flex items-center justify-center gap-2 tracking-widest uppercase relative">
       <span>🕵️ 上帝视角监控中</span>
       <span class="opacity-50">|</span>
       <span>玩家不可见</span>
       <span class="opacity-50">|</span>
       <span>操作已禁用</span>
       <button @click="isSpectator = false" class="absolute right-4 hover:bg-black/20 rounded p-1" title="临时隐藏(刷新后恢复)">✕</button>
    </div>

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      
      <div class="flex-1 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-800 p-4 bg-[url('/bg-pattern.svg')] bg-[#0a0c10]">
        
        <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div class="bg-gray-800/80 backdrop-blur px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-700 shadow-sm flex items-center gap-2">
            <span>房号: <span class="text-white font-mono font-bold">{{ roomId }}</span></span>
            <span v-if="isSpectator" class="text-[10px] bg-yellow-900/50 text-yellow-500 px-1 rounded border border-yellow-700/50">GHOST</span>
          </div>
          <div class="flex gap-2">
            <button v-if="isHost && !isSpectator" @click="openManager" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm">
                ⚙️ 题库 ({{ poolCount }})
            </button>
            <button @click="tryLeaveRoom" class="bg-gray-800/80 backdrop-blur hover:bg-red-900/50 text-gray-400 hover:text-red-400 border border-gray-700 px-3 py-1.5 rounded-lg text-xs transition shadow-sm">
              {{ isSpectator ? '关闭监控' : '退出' }}
            </button>
          </div>
        </div>

        <div class="relative w-full max-w-lg aspect-[4/3] max-h-[70%] bg-gray-800 rounded-2xl border-2 border-gray-700 flex items-center justify-center p-6 text-center shadow-2xl overflow-hidden">
          
          <div v-if="gamePhase === 'IDLE'" class="space-y-3 animate-fade-in">
             <div class="text-5xl animate-bounce">👇</div>
             <h2 class="text-xl font-bold text-gray-300">
               {{ isHost ? '第一步：选个倒霉蛋' : '等待房主选人...' }}
             </h2>
             <p class="text-xs text-gray-500">在线人数: {{ players.length }}</p>
          </div>

          <div v-if="gamePhase === 'PICKING_PLAYER'" class="text-center">
             <div class="text-6xl mb-4">🕵️</div>
             <h2 class="text-lg text-yellow-500 font-bold animate-pulse">正在寻找幸运儿...</h2>
          </div>

          <div v-if="['PLAYER_LOCKED', 'SPINNING_PENALTY', 'SHOW_RESULT'].includes(gamePhase)" class="w-full h-full flex flex-col">
             
             <div class="flex flex-col items-center justify-center py-2 border-b border-gray-700/50 bg-gray-900/20 rounded-t-xl transition-all duration-500"
                  :class="gamePhase === 'SHOW_RESULT' ? 'scale-90 opacity-80' : 'scale-110 my-auto'">
               <div class="text-4xl mb-2">{{ targetPlayer?.avatar || '👤' }}</div>
               <div class="text-xl font-bold text-yellow-400">
                 {{ targetPlayer?.nickname || '未知玩家' }}
               </div>
               <div v-if="gamePhase === 'PLAYER_LOCKED'" class="text-xs text-gray-400 mt-1 animate-pulse">
                   已被锁定，准备接招！
               </div>
             </div>

             <div v-if="gamePhase === 'SPINNING_PENALTY'" class="flex-1 flex flex-col items-center justify-center">
                <div class="text-5xl animate-spin mb-3">🎲</div>
                <div class="text-pink-500 font-bold">正在生成题目...</div>
             </div>

             <div v-if="gamePhase === 'SHOW_RESULT'" class="flex-1 flex flex-col animate-fade-in-up overflow-hidden w-full">
                <div class="flex justify-center gap-2 mt-4">
                  <span :class="['px-2 py-0.5 rounded text-[10px] font-bold shadow-sm', currentPenalty.type === 'truth' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white']">
                    {{ currentPenalty.type === 'truth' ? '真心话' : '大冒险' }}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 shadow-sm flex items-center gap-1">
                    📂 {{ currentPenalty.category ? currentPenalty.category.name : '未知' }}
                  </span>
                </div>

                <div class="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar my-2 px-4">
                  <p class="text-xl md:text-3xl font-bold text-white leading-relaxed drop-shadow-lg break-words">
                    "{{ currentPenalty.content }}"
                  </p>
                </div>

                <div class="flex justify-between items-center w-full px-6 pb-4 text-[10px] text-gray-500 border-t border-gray-700/30 pt-2">
                   <span class="flex items-center gap-1">
                     👤 {{ currentPenalty.creator || '系统' }}
                   </span>
                   <span class="flex items-center gap-1 font-mono text-yellow-600">
                     ⚡ Lv.{{ currentPenalty.level }}
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div v-if="!isSpectator" class="mt-6 flex-shrink-0">
           <div v-if="isHost">
             <button v-if="gamePhase === 'IDLE'" @click="handlePickPlayer" class="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full text-lg font-bold shadow-lg hover:scale-105 active:scale-95 transition">🎲 随机选人</button>
             <button v-else-if="gamePhase === 'PICKING_PLAYER'" disabled class="px-8 py-3 bg-gray-700 text-gray-400 rounded-full text-lg font-bold cursor-not-allowed opacity-50">👀 选人中...</button>
             <button v-else-if="gamePhase === 'PLAYER_LOCKED'" @click="handleSpinPenalty" :disabled="poolCount === 0" class="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full text-lg font-bold shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-50">{{ poolCount === 0 ? '题库空了' : '🔥 抽取惩罚' }}</button>
             <button v-else-if="gamePhase === 'SPINNING_PENALTY'" disabled class="px-8 py-3 bg-gray-700 text-gray-400 rounded-full text-lg font-bold cursor-not-allowed opacity-50">🎲 抽取中...</button>
             <button v-else-if="gamePhase === 'SHOW_RESULT'" @click="handleNextRound" class="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 active:scale-95 transition border border-gray-600">🔄 下一轮</button>
           </div>
           <div v-else class="text-gray-500 text-sm animate-pulse">等待房主操作...</div>
        </div>

        <div v-else class="mt-6 text-gray-600 text-xs font-mono border border-gray-800 px-4 py-2 rounded-lg select-none">
           [ 仅供浏览 - 交互功能已禁用 ]
        </div>
      </div>

      <div class="w-full md:w-80 bg-[#111318] flex flex-col h-[40%] md:h-full border-t md:border-t-0 border-gray-800 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-20">
        <div class="p-2 border-b border-gray-800 bg-[#111318]/95 backdrop-blur flex-shrink-0 flex items-center justify-between">
          <span class="text-[10px] font-bold text-gray-500 uppercase">在线({{ players.length }})</span>
          <div class="flex gap-1 overflow-x-auto max-w-[70%] custom-scrollbar pb-1">
             <span v-for="p in players" :key="p.id" class="text-xs bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 whitespace-nowrap">{{ p.avatar }} {{ p.nickname }}</span>
          </div>
        </div>
        <div ref="chatBoxRef" class="flex-1 overflow-y-auto p-3 space-y-3 bg-[#111318] scroll-smooth custom-scrollbar">
          <div v-for="msg in messages" :key="msg.id" class="w-full animate-fade-in">
            <div v-if="getMsgType(msg) === 'system'" class="text-center my-3">
              <span class="inline-block bg-gray-700/80 text-gray-200 text-xs md:text-sm font-bold py-1 px-4 rounded-full border border-gray-600 shadow-sm">{{ msg.text }}</span>
            </div>
            
            <div v-else-if="getMsgType(msg) === 'others'" class="flex flex-col items-start">
               <div class="flex items-baseline space-x-1 mb-0.5 ml-1">
                 <span class="text-[10px] text-gray-400 font-bold">{{ msg.nickname }}</span>
                 <span class="text-[8px] text-gray-600">{{ msg.time }}</span>
               </div>
               <div class="bg-gray-700 text-gray-200 px-3 py-1.5 rounded-2xl rounded-tl-none max-w-[90%] text-xs shadow break-all">{{ msg.text }}</div>
            </div>
            
            <div v-else class="flex flex-col items-end">
               <div class="flex items-baseline space-x-1 mb-0.5 mr-1 flex-row-reverse">
                 <span class="text-[10px] text-green-400 font-bold">{{ msg.nickname }}</span>
                 <span class="text-[8px] text-gray-600 mr-1">{{ msg.time }}</span>
               </div>
               <div class="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-3 py-1.5 rounded-2xl rounded-tr-none max-w-[90%] text-xs shadow break-all">{{ msg.text }}</div>
            </div>
          </div>
        </div>
        <div class="p-2 bg-[#111318] border-t border-gray-700 flex-shrink-0">
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input v-model="inputMsg" type="text" :placeholder="isSpectator ? '隐身模式不可发言' : '聊两句...'" :disabled="isSpectator" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"/>
            <button type="submit" :disabled="isSpectator" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">发送</button>
          </form>
        </div>
      </div>

      <div v-if="showManager" class="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-gray-800 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl border border-gray-700 flex flex-col">
          <div class="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl"><h3 class="text-md font-bold text-white">题库管理</h3><button @click="showManager = false" class="text-gray-400 hover:text-white px-2 text-lg">✕</button></div>
          <div class="p-2 bg-gray-900/50"><input v-model="filterText" placeholder="搜索..." class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-500 text-gray-200"></div>
          <div class="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/30">
             <div v-for="(items, categoryName) in groupedPool" :key="categoryName" class="border-b border-gray-700 last:border-0">
               <div @click="toggleGroup(categoryName)" class="sticky top-0 z-10 bg-gray-800 px-3 py-2 flex items-center justify-between shadow-md text-sm cursor-pointer">
                 <div class="flex items-center gap-2"><span :class="['text-gray-400 text-xs', expandedGroups[categoryName] ? 'rotate-90' : '']">▶</span><span class="text-gray-200 font-bold">{{ categoryName }}</span><span class="bg-gray-700 text-gray-400 text-[10px] px-1.5 rounded-full">{{ items.length }}</span></div>
                 <div class="text-[10px] text-gray-500">选: {{ items.filter(i => tempActiveIds.includes(i.id)).length }}</div>
               </div>
               <div v-show="expandedGroups[categoryName]" class="p-1 space-y-1 bg-gray-900/50">
                 <div v-for="item in items" :key="item.id" class="flex items-start gap-2 p-2 rounded hover:bg-gray-800 transition cursor-pointer border border-transparent hover:border-gray-700" @click="toggleItem(item.id)">
                     <div :class="['w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0', tempActiveIds.includes(item.id) ? 'bg-pink-600 border-pink-600' : 'border-gray-600 bg-gray-900']"><span v-if="tempActiveIds.includes(item.id)" class="text-white text-[10px]">✓</span></div>
                     <div class="flex-1 min-w-0"><p :class="['text-xs break-words', tempActiveIds.includes(item.id) ? 'text-gray-300' : 'text-gray-600 line-through']">{{ item.content }}</p></div>
                 </div>
               </div>
             </div>
          </div>
          <div class="p-3 border-t border-gray-700 flex justify-end gap-2 bg-gray-800 rounded-b-2xl"><button @click="showManager = false" class="px-3 py-1.5 text-gray-300 text-xs">取消</button><button @click="saveManagerSettings" class="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold text-xs">保存</button></div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="modal.show" class="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-700 p-6 animate-fade-in text-center">
            <div class="text-4xl mb-4">{{ modal.icon || '👋' }}</div>
            <h3 class="text-lg font-bold text-white mb-2">{{ modal.title }}</h3>
            <p class="text-sm text-gray-400 mb-6 leading-relaxed">{{ modal.content }}</p>
            <div class="flex gap-3">
              <button 
                v-if="modal.type === 'confirm'" 
                @click="modal.show = false" 
                class="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-bold transition"
              >
                {{ modal.cancelText || '取消' }}
              </button>
              <button 
                @click="handleModalConfirm" 
                :class="['flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition', modal.type === 'confirm' ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90' : 'bg-gray-700 hover:bg-gray-600']"
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
// 🟢 正确引用：复用已封装的 socket 逻辑（包含 .env 读取）
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
  type: 'alert', // 'alert' | 'confirm'
  title: '',
  content: '',
  icon: '',
  confirmText: '确定',
  cancelText: '取消',
  onConfirm: null
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
   return managerFullPool.value.filter(item => item.content.includes(filterText.value) || item.category?.name.includes(filterText.value));
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
const handlePickPlayer = () => { if (players.value.length < 1) return alert("房间没人！"); socket.emit('pick_player', { roomId }); };
const handleSpinPenalty = () => socket.emit('spin_wheel', { roomId });
const handleNextRound = () => socket.emit('reset_turn', { roomId });

const sendMessage = () => {
  if (isSpectator.value) return; 
  if (!inputMsg.value.trim()) return;
  const me = players.value.find(p => p.id === socket.id);
  socket.emit('send_msg', { roomId, msg: inputMsg.value, nickname: me ? me.nickname : '我' });
  inputMsg.value = '';
};

const getMsgType = (msg) => {
  if (msg.nickname === '系统') return 'system';
  const me = players.value.find(p => p.id === socket.id);
  if (me && msg.nickname === me.nickname) return 'mine';
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
      content: '您将返回管理员后台。',
      icon: '👋',
      type: 'confirm',
      confirmText: '退出',
      onConfirm: () => {
        window.close(); // 尝试关闭窗口
        router.push('/admin'); // 失败则跳转
      }
    });
  } else {
    showDialog({
      title: '确定要离开吗？',
      content: '离开后房间还会保留，但你的位置可能会被别人抢走哦。',
      icon: '👋',
      type: 'confirm',
      confirmText: '狠心离开',
      cancelText: '再玩会儿',
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
  if (data.currentTurnPlayerId) { targetPlayerId.value = data.currentTurnPlayerId; gamePhase.value = 'PLAYER_LOCKED'; } else { gamePhase.value = 'IDLE'; }
  if (data.isSpectator) isSpectator.value = true;
}

// === 生命周期 ===
onMounted(() => {
  // A. 上帝视角模式
  if (route.query.spectate === 'true') {
    isSpectator.value = true;
    const token = localStorage.getItem('admin_auth_token');
    
    // 连接并发送隐身加入请求
    if (!socket.connected) socket.connect();
    socket.emit('join_room', {
      roomId,
      nickname: 'Spectator',
      isGhost: true,
      adminToken: token || 'admin666'
    });
  } 
  // B. 普通玩家模式
  else {
    const sessionData = JSON.parse(sessionStorage.getItem('room_session') || 'null');
    const navState = history.state.roomData;

    if (navState && socket.connected) {
      initGameData(navState);
    } else if (sessionData && sessionData.roomId === roomId) {
      if (!socket.connected) socket.connect();
      socket.emit('join_room', sessionData);
    } else {
      // ⚠️ 使用自定义弹窗替代 alert
      showDialog({
        title: '无法进入房间',
        content: '未检测到登录信息，请从首页重新进入。',
        icon: '🚫',
        type: 'alert',
        confirmText: '返回首页',
        onConfirm: () => router.push('/')
      });
      return;
    }
  }
  
  document.title = `房间 ${roomId} | 游戏进行中`;

  // === Socket 监听 ===
  socket.on('room_joined', initGameData);
  socket.on('error_msg', (msg) => { 
    showDialog({
      title: '发生错误',
      content: msg,
      icon: '⚠️',
      type: 'alert',
      confirmText: '确定',
      onConfirm: () => router.push(isSpectator.value ? '/admin' : '/')
    });
  });
  
  socket.on('player_joined', (p) => { if (!players.value.find(x => x.id === p.id)) { players.value.push(p); messages.value.push({ id: Date.now(), nickname: '系统', text: `${p.nickname} 加入`, time: new Date().toLocaleTimeString() }); scrollToBottom(); } });
  socket.on('player_left', ({ id }) => { const leaver = players.value.find(p => p.id === id); players.value = players.value.filter(p => p.id !== id); messages.value.push({ id: Date.now(), nickname: '系统', text: `${leaver?.nickname || '有人'} 离开`, time: new Date().toLocaleTimeString() }); scrollToBottom(); });
  socket.on('host_change', ({ newHostId }) => { const p = players.value.find(p => p.id === newHostId); if (p) p.isHost = true; });
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
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>