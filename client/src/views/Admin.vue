<template>
  <div class="h-[100dvh] w-full bg-[#0a0c10] text-gray-200 font-sans flex overflow-hidden selection:bg-pink-500/30 relative">
    
    <div class="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div class="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-900/10 rounded-full blur-[120px] animate-pulse-slow delay-700"></div>
    </div>

    <transition name="toast">
      <div v-if="toast.show" :class="['fixed top-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-3 w-[90%] md:w-auto max-w-sm cursor-pointer', toast.type === 'success' ? 'bg-green-900/90 border-green-500/50 text-green-100' : 'bg-red-900/90 border-red-500/50 text-red-100']" @click="toast.show = false">
        <span class="text-xl">{{ toast.type === 'success' ? '✅' : '🚫' }}</span>
        <div><h4 class="font-bold text-sm">{{ toast.title }}</h4><p class="text-xs opacity-90">{{ toast.msg }}</p></div>
      </div>
    </transition>

    <div v-if="isLoading" class="fixed inset-0 bg-[#0a0c10]/70 backdrop-blur-[2px] z-[5000] flex items-center justify-center cursor-wait">
      <div class="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <aside v-if="isAuthenticated" class="hidden md:flex flex-col w-64 h-full bg-gray-900/80 border-r border-gray-800 backdrop-blur-xl z-20 flex-shrink-0">
      <div class="p-6 border-b border-gray-800/50">
        <h2 class="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">ADMIN</h2>
        <div class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-mono">管理控制台 v3.5</div>
      </div>
      <nav class="flex-1 px-4 space-y-2 py-6">
        <button @click="switchTab('dashboard')" :class="navBtnClass('dashboard')"><span>📊</span> 仪表盘</button>
        <button @click="switchTab('penalties')" :class="navBtnClass('penalties')"><span>📝</span> 题库管理</button>
        <button @click="switchTab('categories')" :class="navBtnClass('categories')"><span>🏷️</span> 分类管理</button>
      </nav>
      <div class="p-4 border-t border-gray-800/50">
        <button @click="logout" class="w-full py-3 flex items-center justify-center gap-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl text-sm font-bold transition">退出登录</button>
      </div>
    </aside>

    <div v-if="isAuthenticated" class="flex-1 flex flex-col h-full relative z-10 w-full">
      <header class="md:hidden h-14 bg-gray-900/90 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0 z-30">
        <div class="flex items-center gap-2"><span class="text-lg">🛡️</span><span class="font-bold text-white text-lg">管理后台</span></div>
        <button @click="logout" class="w-8 h-8 flex items-center justify-center rounded-full bg-red-900/20 text-red-400">✕</button>
      </header>

      <main class="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
        
        <div v-if="currentTab === 'dashboard'" class="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <div v-for="(val, key) in displayStats" :key="key" class="bg-gray-900/60 border border-gray-700/50 p-4 rounded-2xl backdrop-blur-sm">
              <div class="text-xs text-gray-500 uppercase font-bold mb-1">{{ val.label }}</div>
              <div :class="['text-2xl md:text-3xl font-black', val.color]">{{ val.value }}</div>
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-white flex items-center gap-2"><span class="w-2 h-6 bg-pink-500 rounded-full"></span> 实时监控</h2>
              <button @click="fetchDashboardData" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition border border-gray-700">🔄 刷新</button>
            </div>
            
            <div v-if="activeRooms.length === 0" class="text-center py-16 bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl text-gray-500">
              <div class="text-4xl mb-2">💤</div><p>无活跃房间</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <div v-for="room in activeRooms" :key="room.id" class="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-5 hover:border-pink-500/50 transition flex flex-col h-full group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                  <div class="overflow-hidden pr-2">
                    <h3 class="font-bold text-lg text-white truncate">{{ room.name }}</h3>
                    <div class="text-xs text-gray-500 font-mono">ID: {{ room.id }}</div>
                  </div>
                  <span :class="['shrink-0 text-[10px] px-2 py-1 rounded border', room.mode === 'private' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900/50' : 'bg-blue-900/30 text-blue-500 border-blue-900/50']">
                    {{ room.mode === 'private' ? '🔒 私密' : '🌐 公开' }}
                  </span>
                </div>
                
                <div class="flex-1 space-y-2 text-sm bg-black/20 p-3 rounded-lg mb-4">
                  <div class="flex justify-between"><span>房主</span><span class="text-gray-200 truncate">{{ room.hostName }}</span></div>
                  <div class="flex justify-between"><span>在线</span><span class="text-gray-200">{{ room.playerCount }}人</span></div>
                  <div class="flex justify-between text-gray-500 border-t border-gray-700/50 pt-2 mt-2">
                    <span>创建于</span><span class="font-mono text-gray-400 text-xs">{{ formatTime(room.createdAt) }}</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button @click="spectateRoom(room.id)" class="flex-1 py-2.5 bg-gray-800 hover:bg-pink-600 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition border border-gray-700 hover:border-pink-500 flex items-center justify-center gap-2">
                    <span>👁️</span> 监控
                  </button>
                  <button @click="confirmAction('dismissRoom', room.id)" class="px-4 py-2.5 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-sm font-bold transition border border-red-900/30 hover:border-red-500 flex items-center justify-center" title="解散房间">
                    <span>💥</span> 注销
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'categories'" class="min-h-full flex flex-col animate-fade-in relative">
          <div class="sticky top-0 z-50 bg-[#0a0c10]/95 backdrop-blur-xl border-b border-gray-800/50 px-4 md:px-8 py-4 shadow-xl">
             <div class="flex justify-between items-center max-w-7xl mx-auto">
               <h2 class="text-xl font-bold text-white flex items-center gap-2"><span class="w-2 h-6 bg-blue-500 rounded-full"></span> 分类管理</h2>
               <div class="flex gap-2">
                 <button @click="openCreateCategory" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition">➕ 新增</button>
                 <button @click="fetchCategoriesStats" class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">🔄</button>
               </div>
             </div>
          </div>
          <div class="p-4 md:p-8 w-full max-w-7xl mx-auto">
             <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="cat in categories" :key="cat.id" class="bg-gray-900/60 border border-gray-700/50 p-5 rounded-xl flex justify-between items-center group">
                  <div>
                    <h3 class="font-bold text-lg text-white group-hover:text-blue-400 transition">{{ cat.name }}</h3>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-1 italic">{{ cat.description || '暂无介绍' }}</p>
                    <div class="text-[10px] text-gray-600 mt-2 font-mono">包含 {{ cat.count || 0 }} 题</div>
                  </div>
                  <div class="flex gap-2">
                    <button @click="openEditCategory(cat)" class="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg">✏️</button>
                    <button @click="confirmAction('deleteCategory', cat.id)" class="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg">🗑️</button>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div v-if="currentTab === 'penalties'" class="min-h-full flex flex-col animate-fade-in relative">
            <div class="sticky top-0 z-50 bg-[#0a0c10]/95 backdrop-blur-xl border-b border-gray-800/50 px-4 md:px-8 py-4 shadow-xl">
               <div class="flex flex-col xl:flex-row justify-between gap-4 max-w-7xl mx-auto">
                  <div class="flex flex-wrap items-center gap-3">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                      <span :class="['w-2 h-6 rounded-full', isRecycleBin ? 'bg-red-500' : 'bg-purple-500']"></span> 
                      {{ isRecycleBin ? '回收站' : '题库中心' }}
                    </h2>
                    <button v-if="!isRecycleBin" @click="openBatchModal" class="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg text-xs font-bold">📥 导入</button>
                    <button @click="toggleRecycleBin" :class="['px-3 py-1.5 rounded-lg text-xs font-bold border', isRecycleBin ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400']">
                      {{ isRecycleBin ? '↩️ 返回' : '🗑️ 回收站' }}
                    </button>
                  </div>
                  <div class="flex gap-2">
                    <select v-if="!isRecycleBin" v-model="filterStatus" @change="resetAndFetchPenalties" class="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none">
                      <option value="">全部状态</option><option value="PENDING">🟠 待审核</option><option value="APPROVED">🟢 已通过</option><option value="REJECTED">🔴 已拒绝</option>
                    </select>
                    <button @click="resetAndFetchPenalties" class="px-4 py-2 bg-gray-800 rounded-lg text-sm">🔄</button>
                  </div>
               </div>
             </div>
             <div class="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
                <div :class="['bg-gray-900/60 border rounded-2xl overflow-hidden', isRecycleBin ? 'border-red-900/30' : 'border-gray-700/50']">
                   <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-400 min-w-[600px]">
                      <thead class="bg-gray-950/80 text-xs uppercase text-gray-500">
                        <tr><th class="px-4 py-4">提交者</th><th class="px-4 py-4 w-[40%]">内容</th><th class="px-4 py-4">属性</th><th class="px-4 py-4">状态</th><th class="px-4 py-4 text-right">操作</th></tr>
                      </thead>
                      <tbody class="divide-y divide-gray-800/50">
                        <tr v-for="p in penalties" :key="p.id" class="hover:bg-white/5 transition group">
                          <td class="px-4 py-4"><div class="text-gray-300 font-bold text-xs">{{ p.creator || '匿名' }}</div><div class="font-mono text-[10px] text-gray-600">#{{ p.id }}</div></td>
                          <td class="px-4 py-4"><p class="text-white text-sm break-words">{{ p.content }}</p></td>
                          <td class="px-4 py-4"><div class="flex gap-1.5"><span class="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">{{ p.category?.name }}</span><span class="text-[10px] px-1.5 py-0.5 rounded border">{{ p.type === 'truth' ? '真' : '险' }} Lv.{{ p.level }}</span></div></td>
                          <td class="px-4 py-4">
                            <span v-if="isRecycleBin" class="text-red-500 text-xs font-bold bg-red-900/20 px-2 py-1 rounded-full">🗑️ 已删除</span>
                            <template v-else>
                               <span v-if="p.status === 'PENDING'" class="text-yellow-500 text-xs font-bold bg-yellow-900/10 px-2 py-1 rounded-full">待审</span>
                               <span v-else-if="p.status === 'APPROVED'" class="text-green-500 text-xs font-bold bg-green-900/10 px-2 py-1 rounded-full">通过</span>
                               <span v-else class="text-red-500 text-xs font-bold bg-red-900/10 px-2 py-1 rounded-full">拒绝</span>
                            </template>
                          </td>
                          <td class="px-4 py-4 text-right">
                             <div class="flex justify-end gap-2">
                               <template v-if="isRecycleBin">
                                 <button @click="confirmAction('restore', p.id)" class="w-8 h-8 text-green-500" title="恢复">♻️</button>
                                 <button @click="confirmAction('hardDelete', p.id)" class="w-8 h-8 text-red-500" title="粉碎">💥</button>
                               </template>
                               <template v-else>
                                 <button @click="openEditPenalty(p)" class="w-8 h-8 text-blue-500">✏️</button>
                                 <button v-if="p.status !== 'APPROVED'" @click="updateStatus(p.id, 'APPROVED')" class="w-8 h-8 text-green-500">✓</button>
                                 <button @click="confirmAction('softDelete', p.id)" class="w-8 h-8 text-gray-500 hover:text-red-500">🗑️</button>
                               </template>
                             </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
             </div>
        </div>
      </main>

      <nav class="md:hidden h-16 bg-gray-900/95 border-t border-gray-800 fixed bottom-0 left-0 w-full z-50 flex items-center justify-around backdrop-blur pb-safe">
          <button @click="switchTab('dashboard')" :class="['flex flex-col items-center gap-1 transition', currentTab === 'dashboard' ? 'text-pink-500' : 'text-gray-500']"><span class="text-xl">📊</span><span class="text-[10px] font-bold">监控</span></button>
          <button @click="switchTab('penalties')" :class="['flex flex-col items-center gap-1 transition', currentTab === 'penalties' ? 'text-purple-500' : 'text-gray-500']"><span class="text-xl">📝</span><span class="text-[10px] font-bold">题库</span></button>
          <button @click="switchTab('categories')" :class="['flex flex-col items-center gap-1 transition', currentTab === 'categories' ? 'text-blue-500' : 'text-gray-500']"><span class="text-xl">🏷️</span><span class="text-[10px] font-bold">分类</span></button>
      </nav>
    </div>

    <transition name="fade">
      <div v-if="!isAuthenticated" class="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#0a0c10]">
        <div class="w-full max-w-md bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
          <div class="text-center mb-8"><div class="text-6xl mb-4">🛡️</div><h1 class="text-3xl font-bold text-white">系统锁定</h1></div>
          <div class="space-y-4">
            <input v-model="inputPassword" type="password" placeholder="请输入管理员密钥" class="w-full px-4 py-4 bg-gray-950 border border-gray-700 rounded-xl text-center text-2xl font-bold text-white outline-none transition" @keyup.enter="handleLogin">
            <button @click="handleLogin" class="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl transition shadow-lg">验证身份</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="modal.show" class="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-700 p-8 animate-scale-in text-center">
          <div class="text-6xl mb-6">{{ modal.icon || '👋' }}</div>
          <h3 class="text-xl font-black text-white mb-3 tracking-tight">{{ modal.title }}</h3>
          <p class="text-[15px] text-gray-400 mb-8 leading-relaxed px-2">{{ modal.content }}</p>
          <div class="flex gap-4">
            <button @click="modal.show = false" class="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-2xl font-black transition-all">取消</button>
            <button 
              @click="handleModalConfirm" 
              :class="['flex-1 py-3.5 text-white rounded-2xl font-black shadow-lg transition-all', modal.isDestructive ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-blue-600 hover:bg-blue-500']"
            >
              确定执行
            </button>
          </div>
        </div>
      </div>
    </transition>

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const TOKEN_KEY = 'admin_auth_token';

// --- 状态定义 ---
const isAuthenticated = ref(!!localStorage.getItem(TOKEN_KEY));
const inputPassword = ref('');
const currentTab = ref('dashboard');
const isLoading = ref(false);
const toast = ref({ show: false, type: 'success', title: '', msg: '' });

// 确认模态框状态
const modal = ref({ 
  show: false, 
  title: '', 
  content: '', 
  icon: '', 
  isDestructive: false, 
  confirmAction: null 
});

// 数据状态
const stats = ref({});
const activeRooms = ref([]);
const penalties = ref([]);
const categories = ref([]); 
const filterStatus = ref('');
const isRecycleBin = ref(false); 
const page = ref(1);
const pageSize = 20;

// 表单状态
const showCategoryModal = ref(false);
const categoryForm = ref({ id: null, name: '', description: '' });
const isEditingCategory = ref(false);
const showEditPenaltyModal = ref(false);
const editPenaltyForm = ref({ id: null, content: '', type: 'truth', level: 3, categoryId: null });
const showBatchModal = ref(false);
const batchForm = ref({ content: '', categoryId: '', type: 'truth', level: '3' });

// --- 计算属性 ---
const displayStats = computed(() => ({
  active: { label: '活跃房间', value: stats.value.rooms || 0, color: 'text-blue-400' },
  pending: { label: '待审核', value: stats.value.pending || 0, color: 'text-yellow-400' },
  approved: { label: '已收录', value: stats.value.approved || 0, color: 'text-green-400' },
  total: { label: '总题目', value: stats.value.total || 0, color: 'text-purple-400' }
}));

// --- 逻辑函数 ---

// 1. 认证相关
const handleLogin = async () => {
  if (!inputPassword.value) return;
  isLoading.value = true;
  try {
    const res = await api.post('/admin/login', { password: inputPassword.value });
    if (res.success) {
      localStorage.setItem(TOKEN_KEY, res.token);
      isAuthenticated.value = true;
      inputPassword.value = '';
      showToast('success', '已授权', '欢迎回来');
      fetchDashboardData();
    }
  } catch (e) { 
    showToast('error', '拒绝访问', '密码错误'); 
    inputPassword.value = ''; 
  } finally { 
    isLoading.value = false; 
  }
};

const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  isAuthenticated.value = false;
  showToast('success', '已退出', '安全登出');
};

// 2. 通用确认弹窗控制
const confirmAction = (actionType, id) => {
  let config = {};
  if (actionType === 'softDelete') config = { title: '移入回收站？', content: '该题目将不再出现在游戏中，您可以从回收站找回。', icon: '🗑️', isDestructive: true, action: () => deletePenalty(id) };
  else if (actionType === 'restore') config = { title: '确认恢复？', content: '题目将重新回到审核列表。', icon: '♻️', isDestructive: false, action: () => restorePenalty(id) };
  else if (actionType === 'hardDelete') config = { title: '彻底粉碎？', content: '警告：数据将从数据库永久消失，无法撤回！', icon: '💥', isDestructive: true, action: () => hardDeletePenalty(id) };
  else if (actionType === 'deleteCategory') config = { title: '删除分类？', content: '仅当该分类下没有任何题目时方可删除。', icon: '🏷️', isDestructive: true, action: () => deleteCategory(id) };
  
  // 🟢 接入解散房间
  else if (actionType === 'dismissRoom') config = { 
    title: '注销房间？', 
    content: `确定要强制解散房间 ${id} 吗？房间内所有玩家将被即刻踢出。`, 
    icon: '🚨', 
    isDestructive: true, 
    action: () => executeDismissRoom(id) 
  };

  modal.value = { show: true, ...config, confirmAction: config.action };
};

const handleModalConfirm = async () => {
  if (modal.value.confirmAction) await modal.value.confirmAction();
  modal.value.show = false;
};

// 3. 业务数据获取
const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const [s, r] = await Promise.all([api.get('/admin/stats'), api.get('/admin/active-rooms')]);
    stats.value = s || {}; 
    activeRooms.value = r.data || [];
  } catch (e) {} finally { isLoading.value = false; }
};

const fetchCategoriesStats = async () => {
  try {
    const res = await api.get('/admin/categories-stats');
    categories.value = res || [];
  } catch (e) { console.error(e); }
};

const fetchPenalties = async () => {
  isLoading.value = true;
  try {
    const params = { 
      page: page.value, 
      limit: pageSize, 
      status: (!isRecycleBin.value && filterStatus.value) ? filterStatus.value : undefined, 
      deleted: isRecycleBin.value 
    };
    const res = await api.get('/admin/penalties', { params });
    penalties.value = res.list || [];
  } catch (e) {} finally { isLoading.value = false; }
};

// 4. 执行具体操作 (API 调用)
const executeDismissRoom = async (roomId) => {
  isLoading.value = true;
  try {
    await api.delete(`/admin/rooms/${roomId}`);
    showToast('success', '解散成功', `房间 ${roomId} 已销毁`);
    fetchDashboardData();
  } catch (e) {
    showToast('error', '解散失败', e.response?.data?.error || '网络错误');
  } finally {
    isLoading.value = false;
  }
};

// ... 其他原有业务方法 (deletePenalty, restorePenalty, submitCategory 等) 保持原有逻辑即可 ...
// 提示：确保所有 API 请求都包裹在 try-catch 中，并正确调用 showToast。

// 辅助方法
const showToast = (type, title, msg) => {
  toast.value = { show: true, type, title, msg };
  setTimeout(() => toast.value.show = false, 3000);
};

const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '刚刚';

const navBtnClass = (tab) => `w-full text-left px-5 py-4 rounded-xl flex items-center gap-4 transition-all font-bold ${currentTab.value === tab ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-white border border-pink-500/30' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`;

const switchTab = (tab) => {
  currentTab.value = tab;
  if (tab === 'dashboard') fetchDashboardData();
  if (tab === 'penalties') { page.value = 1; fetchPenalties(); }
  if (tab === 'categories') fetchCategoriesStats();
};

const spectateRoom = (roomId) => {
  const url = router.resolve({ path: `/room/${roomId}`, query: { spectate: 'true' } }).href;
  window.open(url, '_blank');
};

const updateStatus = async (id, status) => {
  try {
    await api.put(`/admin/penalties/${id}`, { status });
    const item = penalties.value.find(p => p.id === id);
    if (item) item.status = status;
    showToast('success', '状态更新', `题目已标记为 ${status}`);
  } catch (e) {}
};

// 初始化执行
onMounted(() => {
  if (isAuthenticated.value) {
    fetchDashboardData();
    fetchCategoriesStats();
  }
});
</script>

<style scoped>
/* 动画与滚动条样式保持不变 */
.toast-enter-active, .toast-leave-active { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-30px) scale(0.9); }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
</style>