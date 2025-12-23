<template>
  <div class="h-[100dvh] w-full bg-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
    
    <div class="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div class="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-900/10 rounded-full blur-[120px] animate-pulse-slow delay-700"></div>
    </div>

    <transition name="toast">
      <div v-if="toast.show" class="fixed top-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-3 bg-red-900/90 border-red-500/50 text-red-100" @click="toast.show = false">
        <span class="text-xl">⚠️</span>
        <div><h4 class="font-bold text-sm">提示</h4><p class="text-xs opacity-90">{{ toast.msg }}</p></div>
      </div>
    </transition>

    <div class="w-full max-w-md bg-gray-800/80 backdrop-blur rounded-xl shadow-2xl border border-gray-700 max-h-[95dvh] overflow-y-auto custom-scrollbar p-6 relative z-10">
      
      <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 text-center mb-8 flex-shrink-0">
        真心话大冒险 Online
      </h1>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-400 mb-2">你的昵称</label>
        <input 
          v-model="nickname" 
          type="text" 
          placeholder="请输入炫酷的名字" 
          class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition text-white"
        />
      </div>

      <div class="flex border-b border-gray-700 mb-6">
        <button 
          @click="activeTab = 'create'"
          :class="['flex-1 pb-3 font-medium transition', activeTab === 'create' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300']"
        >
          创建房间
        </button>
        <button 
          @click="fetchRooms(); activeTab = 'join'"
          :class="['flex-1 pb-3 font-medium transition', activeTab === 'join' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300']"
        >
          房间列表
        </button>
      </div>

      <div v-if="activeTab === 'create'" class="space-y-4 animate-fade-in">
        <div>
          <label class="block text-sm text-gray-400 mb-2">房间名称</label>
          <input 
            v-model="roomName" 
            type="text" 
            placeholder="例如：周五狂欢夜 (选填)" 
            class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-pink-500 text-white"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-2">选择题库 (可多选)</label>
          <div class="bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto custom-scrollbar divide-y divide-gray-800">
            
            <div v-for="cat in categories" :key="cat.id" 
                 class="flex items-start p-3 hover:bg-gray-800 transition cursor-pointer"
                 @click="toggleCategory(cat.id)"> 
              
              <input 
                type="checkbox" 
                :value="cat.id" 
                v-model="selectedCategoryIds"
                class="mt-1 w-4 h-4 text-pink-600 bg-gray-800 border-gray-600 rounded focus:ring-pink-500 pointer-events-none"
              >
              
              <div class="ml-3">
                <div class="text-sm font-medium text-gray-200">{{ cat.name }}</div>
                <div class="text-xs text-gray-500 mt-0.5">{{ cat.description || '暂无描述' }}</div>
              </div>
            </div>

          </div>
          <p class="text-xs text-gray-500 mt-2">已选: {{ selectedCategoryIds.length }} 个题库</p>
        </div>

        <div class="flex gap-4">
          <label class="flex items-center space-x-2 cursor-pointer text-gray-300">
            <input type="radio" value="public" v-model="roomMode" class="text-pink-500 accent-pink-500" />
            <span>公开</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer text-gray-300">
            <input type="radio" value="private" v-model="roomMode" class="text-pink-500 accent-pink-500" />
            <span>加密</span>
          </label>
        </div>

        <div v-if="roomMode === 'private'" class="animate-fade-in mt-2">
          <input 
            v-model="roomPassword" 
            type="text" 
            placeholder="🔒 设置密码" 
            class="w-full px-4 py-2 bg-gray-900 border border-yellow-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600 text-center text-yellow-500 placeholder-gray-600" 
          />
        </div>

        <button 
          @click="handleCreateRoom"
          class="w-full py-3 mt-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg font-bold hover:opacity-90 transition transform active:scale-95 text-white shadow-lg"
        >
          立即创建
        </button>
      </div>

      <div v-if="activeTab === 'join'" class="space-y-4 animate-fade-in">
        
        <div class="flex gap-2">
          <input 
            v-model="joinRoomId" 
            type="text" 
            placeholder="输入房号查找" 
            class="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none text-sm text-white"
          />
          <button @click="fetchRooms" class="px-3 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 text-white">
            🔄 刷新
          </button>
        </div>

        <div class="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          <div v-if="roomList.length === 0" class="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-700 rounded-lg">
            暂无活跃房间，快去创建一个吧！
          </div>

          <div 
            v-for="room in roomList" 
            :key="room.id"
            @click="selectRoom(room)"
            class="bg-gray-700/50 p-3 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition flex justify-between items-center group"
          >
            <div>
              <div class="font-bold text-white flex items-center gap-2">
                {{ room.name }}
                <span v-if="room.mode === 'private'" class="text-xs bg-yellow-600/50 text-yellow-200 px-1.5 rounded">🔒</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">ID: {{ room.id }} | 人数: {{ room.playerCount || room.count }}人</div>
            </div>
            <button class="text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition">
              加入 >
            </button>
          </div>
        </div>

        <div v-if="joinMode === 'private'" class="animate-fade-in mt-2">
          <input 
              ref="passwordInputRef" 
              v-model="joinPassword" 
              type="text" 
              placeholder="🔒 此房间需要密码，输完按回车" 
              class="w-full px-4 py-2 bg-gray-900 border border-yellow-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600 text-center text-yellow-500 placeholder-gray-600 transition-all"
              @keyup.enter="handleJoinRoom" 
          />
        </div>

        <button 
          @click="handleJoinRoom"
          class="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-bold text-white hover:opacity-90 transition transform active:scale-95 shadow-lg"
        >
          进入房间
        </button>
      </div>

      <div class="mt-8 pt-4 border-t border-gray-700 text-center">
          <router-link to="/submit" class="text-xs text-gray-500 hover:text-pink-500 transition underline underline-offset-2">
            有更好的点子？去贡献题目 >
          </router-link>
      </div>

    </div>
  </div>
  <div v-if="isLoading" class="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[5000] flex items-center justify-center cursor-wait">
    <div class="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'; 
import { useRouter } from 'vue-router';
// 🟢 修改点：引入封装好的 api，而不是 axios
import api from '../api';
import socket from '../socket';

const router = useRouter();

// 基础状态
const activeTab = ref('create');
const nickname = ref('');
const categories = ref([]);
const toast = ref({ show: false, msg: '' });

// 创建相关
const roomName = ref('');
const selectedCategoryIds = ref([]); // 多选题库
const roomMode = ref('public');
const roomPassword = ref('');

// 加入相关
const roomList = ref([]);
const joinRoomId = ref('');
const joinPassword = ref('');
const joinMode = ref('public');
const passwordInputRef = ref(null);
const isLoading = ref(false);

// 辅助函数：显示提示
const showToast = (msg) => {
  toast.value = { show: true, msg };
  setTimeout(() => toast.value.show = false, 3000);
};

// --- 初始化 ---
onMounted(async () => {
  const savedName = localStorage.getItem('user_nickname');
  if (savedName) nickname.value = savedName;

  try {
    // 🟢 修改点：使用 api.get，不需要写完整的 URL
    // api.js 已经配置了拦截器，直接返回 data，所以不需要 .data
    const res = await api.get('/categories');
    categories.value = res; // 修正：直接赋值
    if (categories.value.length > 0) {
      selectedCategoryIds.value = [categories.value[0].id];
    }
  } catch (e) { console.error("获取分类失败", e); }

  socket.off('room_joined'); 
  socket.on('room_joined', (data) => {
    const currentPass = activeTab.value === 'create' ? roomPassword.value : joinPassword.value;
    sessionStorage.setItem('room_session', JSON.stringify({
      roomId: data.roomId,
      nickname: nickname.value,
      password: currentPass
    }));

    router.push({
      path: `/room/${data.roomId}`,
      state: { roomData: data }
    });
  });

  socket.on('error_msg', (msg) => showToast(msg));
});

// --- 逻辑函数 ---

const toggleCategory = (id) => {
  if (selectedCategoryIds.value.includes(id)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter(item => item !== id);
  } else {
    selectedCategoryIds.value.push(id);
  }
};

const fetchRooms = async () => {
  try {
    // 🟢 修改点：使用 api.get
    const res = await api.get('/rooms'); 
    roomList.value = res; // 修正：直接赋值
  } catch (e) {
    console.error("获取房间列表失败", e);
  }
};

const saveNickname = () => {
  if (nickname.value) localStorage.setItem('user_nickname', nickname.value);
};

const handleCreateRoom = () => {
  if (!nickname.value) return showToast("请先输入昵称！");
  if (selectedCategoryIds.value.length === 0) return showToast("至少选一个题库！");
  if (roomMode.value === 'private' && !roomPassword.value) return showToast("请设置密码！");
  
  saveNickname();
  socket.connect();
  socket.emit('create_room', {
    nickname: nickname.value,
    roomName: roomName.value,
    mode: roomMode.value,
    password: roomPassword.value,
    categoryIds: selectedCategoryIds.value
  });
};

// --- 彻底修复后的 handleJoinRoom ---
const handleJoinRoom = async () => {
  if (!nickname.value) return showToast("请先输入昵称！");
  if (!joinRoomId.value) return showToast("请输入房号！");

  const upperID = joinRoomId.value.toUpperCase();
  isLoading.value = true; // 如果有加载状态可以加上

  try {
    // 🟢 1. 实时从服务器获取该房间的最新模式
    const roomInfo = await api.get(`/rooms/${upperID}`);
    joinMode.value = roomInfo.mode;

    // 🟢 2. 只有确认了模式后，才进行密码拦截
    if (roomInfo.mode === 'private' && !joinPassword.value) {
      showToast("🔒 此房间需要密码，请输入！");
      activeTab.value = 'join';
      await nextTick();
      if (passwordInputRef.value) passwordInputRef.value.focus();
      return; // 拦截发送
    }

    // 🟢 3. 校验通过，执行加入
    saveNickname();
    if (!socket.connected) socket.connect();
    
    socket.emit('join_room', {
      roomId: upperID,
      nickname: nickname.value,
      password: joinPassword.value
    });
  } catch (e) {
    // 如果返回 404，说明房间不存在
    showToast(e.response?.data?.error || "查询房间失败");
  } finally {
    isLoading.value = false;
  }
};

// --- 优化 selectRoom 函数 ---
const selectRoom = async (room) => {
  if (!nickname.value) {
    showToast("客官，请先在上方输入您的昵称！");
    return;
  }

  joinRoomId.value = room.id;
  joinMode.value = room.mode;
  joinPassword.value = ''; 

  if (room.mode === 'public') {
    handleJoinRoom();
  } else {
    // 如果是私密房间，提示并聚焦密码框
    showToast("请输入房间密码");
    await nextTick();
    if (passwordInputRef.value) {
      passwordInputRef.value.focus();
    }
  }
};
</script>

<style>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
</style>