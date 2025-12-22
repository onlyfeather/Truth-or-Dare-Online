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

    <transition name="fade">
        <div v-if="showCategoryModal" class="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 p-6 animate-scale-in">
            <h3 class="text-lg font-bold text-white mb-4">🏷️ {{ isEditingCategory ? '编辑分类' : '新增分类' }}</h3>
            
            <label class="text-[10px] text-gray-500 mb-1 block uppercase font-bold">分类名称</label>
            <input 
                v-model="categoryForm.name" 
                placeholder="例如：情侣专属" 
                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white mb-4 focus:border-purple-500 outline-none"
            >

            <label class="text-[10px] text-gray-500 mb-1 block uppercase font-bold">分类介绍</label>
            <textarea 
                v-model="categoryForm.description" 
                placeholder="简要描述一下这个分类的应用场景..." 
                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white mb-6 focus:border-purple-500 outline-none resize-none h-24 text-sm"
            ></textarea>

            <div class="flex gap-3">
                <button @click="showCategoryModal = false" class="flex-1 py-2 bg-gray-700 rounded-lg text-sm font-bold text-gray-300">取消</button>
                <button @click="submitCategory" class="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold text-white">
                {{ isEditingCategory ? '保存修改' : '立即创建' }}
                </button>
            </div>
            </div>
        </div>
    </transition>

    <div v-if="isLoading" class="fixed inset-0 bg-[#0a0c10]/70 backdrop-blur-[2px] z-[5000] flex items-center justify-center cursor-wait"><div class="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>

    <transition name="fade">
      <div v-if="showEditPenaltyModal" class="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 p-6 animate-scale-in flex flex-col shadow-2xl">
          <h3 class="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span class="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg">✏️</span> 编辑题目详情
          </h3>
          
          <div class="grid grid-cols-2 gap-4 mb-5">
             <div class="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
               <label class="text-[10px] text-gray-500 mb-1.5 block uppercase font-bold tracking-wider">所属分类</label>
               <select v-model="editPenaltyForm.categoryId" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition">
                 <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
               </select>
             </div>
             <div class="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
               <label class="text-[10px] text-gray-500 mb-1.5 block uppercase font-bold tracking-wider">题目类型</label>
               <select v-model="editPenaltyForm.type" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition">
                 <option value="truth">🔵 真心话</option>
                 <option value="dare">🔴 大冒险</option>
               </select>
             </div>
          </div>

          <div class="mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
             <div class="flex justify-between items-end mb-3">
                <label class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">难度等级 (Level)</label>
                <div :class="['text-sm font-black transition-colors duration-300 flex items-center gap-2', getLevelColor(editPenaltyForm.level)]">
                   <span class="text-xs opacity-70">Lv.{{ editPenaltyForm.level }}</span>
                   <span>{{ getLevelLabel(editPenaltyForm.level) }}</span>
                </div>
             </div>
             
             <div class="relative w-full h-8 flex items-center">
                <input 
                  type="range" 
                  v-model.number="editPenaltyForm.level" 
                  min="1" 
                  max="5" 
                  step="1"
                  :class="['w-full cursor-pointer transition-all', getSliderAccent(editPenaltyForm.level)]"
                >
             </div>

             <div class="flex justify-between px-1">
                <span v-for="i in 5" :key="i" :class="['text-[10px] font-bold transition-colors duration-300', editPenaltyForm.level >= i ? getLevelColor(i) : 'text-gray-700']">
                  {{ i }}
                </span>
             </div>
          </div>

          <div class="flex-1 mb-6 flex flex-col">
            <label class="text-[10px] text-gray-500 mb-2 block uppercase font-bold tracking-wider">题目内容</label>
            <textarea 
              v-model="editPenaltyForm.content" 
              class="w-full flex-1 min-h-[120px] bg-gray-900 border border-gray-600 rounded-xl p-4 text-white text-sm focus:border-blue-500 outline-none resize-none leading-relaxed shadow-inner"
            ></textarea>
          </div>

          <div class="flex gap-3 mt-auto">
            <button @click="showEditPenaltyModal = false" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-bold text-gray-300 transition">取消</button>
            <button @click="submitEditPenalty" class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-lg transition transform active:scale-95">保存修改</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showBatchModal" class="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 p-6 animate-scale-in flex flex-col max-h-[90vh]">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">📥 批量导入题目 <span class="text-xs text-gray-500 font-normal">(自动审核通过)</span></h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div>
               <label class="text-xs text-gray-500 mb-1 block">所属分类</label>
               <select v-model="batchForm.categoryId" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                 <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
               </select>
             </div>
             <div>
               <label class="text-xs text-gray-500 mb-1 block">类型</label>
               <select v-model="batchForm.type" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                 <option value="truth">🔵 真心话</option><option value="dare">🔴 大冒险</option>
               </select>
             </div>
             <div>
               <label class="text-xs text-gray-500 mb-1 block">强度等级</label>
               <select v-model="batchForm.level" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                 <option value="1">Lv.1 (简单)</option><option value="3">Lv.3 (普通)</option><option value="5">Lv.5 (刺激)</option>
               </select>
             </div>
          </div>
          <div class="flex-1 min-h-0 mb-4 flex flex-col">
            <label class="text-xs text-gray-500 mb-1 block">题目内容 (每行一条)</label>
            <textarea v-model="batchForm.content" placeholder="粘贴题目，回车换行分割..." class="w-full flex-1 bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm text-white focus:border-blue-500 outline-none resize-none leading-relaxed"></textarea>
            <div class="text-right text-xs text-gray-500 mt-1">预计导入: {{ batchPreviewCount }} 条</div>
          </div>
          <div class="flex gap-3">
            <button @click="showBatchModal = false" class="px-6 py-3 bg-gray-700 rounded-lg text-sm font-bold text-gray-300">取消</button>
            <button @click="submitBatch" class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white shadow-lg">确认导入</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="!isAuthenticated" class="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#0a0c10]">
        <div class="w-full max-w-md bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
          <div class="text-center mb-8"><div class="text-6xl mb-4">🛡️</div><h1 class="text-3xl font-bold text-white">系统锁定</h1></div>
          <div class="space-y-4">
            <input v-model="inputPassword" type="password" placeholder="请输入管理员密钥" class="w-full px-4 py-4 bg-gray-950 border border-gray-700 rounded-xl text-center text-2xl font-bold font-sans tracking-normal text-white placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition appearance-none" @keyup.enter="handleLogin">
            <button @click="handleLogin" class="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl transition shadow-lg active:scale-[0.98]">验证身份</button>
          </div>
        </div>
      </div>
    </transition>

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
      <div class="p-4 border-t border-gray-800/50"><button @click="logout" class="w-full py-3 flex items-center justify-center gap-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl text-sm font-bold transition">退出登录</button></div>
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
            <div v-if="activeRooms.length === 0" class="text-center py-16 bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl text-gray-500"><div class="text-4xl mb-2">💤</div><p>无活跃房间</p></div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <div v-for="room in activeRooms" :key="room.id" class="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-5 hover:border-pink-500/50 transition flex flex-col h-full group relative overflow-hidden">
                 <div class="flex justify-between items-start mb-4">
                   <div class="overflow-hidden pr-2"><h3 class="font-bold text-lg text-white truncate">{{ room.name }}</h3><div class="text-xs text-gray-500 font-mono">ID: {{ room.id }}</div></div>
                   <span :class="['shrink-0 text-[10px] px-2 py-1 rounded border', room.mode === 'private' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900/50' : 'bg-blue-900/30 text-blue-500 border-blue-900/50']">{{ room.mode === 'private' ? '🔒 私密' : '🌐 公开' }}</span>
                 </div>
                 <div class="flex-1 space-y-2 text-sm bg-black/20 p-3 rounded-lg mb-4">
                    <div class="flex justify-between"><span>房主</span><span class="text-gray-200 truncate">{{ room.hostName }}</span></div>
                    <div class="flex justify-between"><span>在线</span><span class="text-gray-200">{{ room.playerCount }}人</span></div>
                    <div class="flex justify-between text-gray-500 border-t border-gray-700/50 pt-2 mt-2"><span>创建于</span><span class="font-mono text-gray-400 text-xs">{{ formatTime(room.createdAt) }}</span></div>
                 </div>
                 <button @click="spectateRoom(room.id)" class="w-full py-2.5 bg-gray-800 hover:bg-pink-600 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition border border-gray-700 hover:border-pink-500 flex items-center justify-center gap-2"><span>👁️</span> 上帝视角</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'categories'" class="min-h-full flex flex-col animate-fade-in relative">
          <div class="sticky top-0 z-50 bg-[#0a0c10]/95 backdrop-blur-xl border-b border-gray-800/50 px-4 md:px-8 py-4 shadow-xl transition-all duration-300">
            <div class="flex justify-between items-center max-w-7xl mx-auto">
              <h2 class="text-xl font-bold text-white flex items-center gap-2"><span class="w-2 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_currentColor]"></span> 分类管理</h2>
              <div class="flex gap-2">
                <button @click="openCreateCategory" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition shadow-lg flex items-center gap-1"><span>➕</span> 新增分类</button>
                <button @click="fetchCategoriesStats" class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700">🔄</button>
              </div>
            </div>
          </div>
          <div class="p-4 md:p-8 w-full max-w-7xl mx-auto">
             <div v-if="categories.length === 0" class="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">暂无分类，请点击右上角创建</div>
             <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <div v-for="cat in categories" :key="cat.id" class="bg-gray-900/60 border border-gray-700/50 p-5 rounded-xl hover:border-blue-500/30 transition flex justify-between items-center group">
                 <div>
                   <div>
                      <h3 class="font-bold text-lg text-white group-hover:text-blue-400 transition">{{ cat.name }}</h3>
                      <p class="text-xs text-gray-400 mt-1 line-clamp-1 italic">{{ cat.description || '暂无介绍' }}</p>
                      <div class="text-[10px] text-gray-600 mt-2 font-mono">包含 {{ cat.count || 0 }} 道题目</div>
                    </div>
                 </div>
                 <div class="flex gap-2 opacity-80 group-hover:opacity-100 transition">
                    <button @click="openEditCategory(cat)" class="w-8 h-8 flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-blue-900/30 hover:text-blue-400 rounded-lg transition" title="重命名">✏️</button>
                    <button @click="confirmAction('deleteCategory', cat.id)" class="w-8 h-8 flex items-center justify-center bg-gray-800 text-gray-500 hover:bg-red-900/30 hover:text-red-500 rounded-lg transition" title="删除分类">🗑️</button>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div v-if="currentTab === 'penalties'" class="min-h-full flex flex-col animate-fade-in relative">
          <div class="sticky top-0 z-50 bg-[#0a0c10]/95 backdrop-blur-xl border-b border-gray-800/50 px-4 md:px-8 py-4 shadow-xl transition-all duration-300">
            <div class="flex flex-col xl:flex-row justify-between gap-4 max-w-7xl mx-auto">
              <div class="flex flex-wrap items-center gap-3">
                 <h2 class="text-xl font-bold text-white flex items-center gap-2 mr-2">
                     <span :class="['w-2 h-6 rounded-full transition-colors shadow-[0_0_10px_currentColor]', isRecycleBin ? 'bg-red-500 text-red-500' : 'bg-purple-500 text-purple-500']"></span> 
                     {{ isRecycleBin ? '回收站' : '题库中心' }}
                 </h2>
                 <div v-if="!isRecycleBin" class="flex gap-2">
                    <button @click="openBatchModal" class="px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-700/50 rounded-lg text-xs font-bold transition flex items-center gap-1"><span>📥</span> 导入</button>
                 </div>
                 <div class="w-px h-6 bg-gray-800 mx-1"></div>
                 <button @click="toggleRecycleBin" :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border', isRecycleBin ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white']">
                   <span v-if="isRecycleBin">↩️ 返回题库</span><span v-else>🗑️ 回收站</span>
                 </button>
              </div>
              <div class="flex gap-2 w-full xl:w-auto">
                 <select v-if="!isRecycleBin" v-model="filterStatus" @change="resetAndFetchPenalties" class="flex-1 xl:flex-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500 transition">
                   <option value="">全部状态</option><option value="PENDING">🟠 待审核</option><option value="APPROVED">🟢 已通过</option><option value="REJECTED">🔴 已拒绝</option>
                 </select>
                 <button @click="resetAndFetchPenalties" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition border border-gray-700 active:scale-95">🔄</button>
              </div>
            </div>
          </div>
          <div class="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto flex-1">
            <div :class="['bg-gray-900/60 border rounded-2xl overflow-hidden shadow-xl transition-colors relative z-0', isRecycleBin ? 'border-red-900/30' : 'border-gray-700/50']">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-gray-400 min-w-[600px]">
                  <thead class="bg-gray-950/80 text-xs uppercase text-gray-500">
                    <tr><th class="px-4 py-4 font-bold">提交者</th><th class="px-4 py-4 w-[40%] font-bold">内容</th><th class="px-4 py-4 font-bold">属性</th><th class="px-4 py-4 font-bold">状态</th><th class="px-4 py-4 text-right font-bold">操作</th></tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800/50">
                    <tr v-if="penalties.length === 0"><td colspan="5" class="px-6 py-16 text-center text-gray-600 font-mono">暂无数据</td></tr>
                    <tr v-for="p in penalties" :key="p.id" class="hover:bg-white/5 transition group">
                      <td class="px-4 py-4 align-top"><div class="text-gray-300 font-bold text-xs">{{ p.creator || '匿名' }}</div><div class="font-mono text-[10px] text-gray-600 mt-1">#{{ p.id }}</div></td>
                      
                      <td class="px-4 py-4 align-top group-hover:text-blue-200 transition cursor-pointer" @click="openEditPenalty(p)" title="点击编辑详情">
                        <p class="text-white text-sm break-words">{{ p.content }}</p>
                      </td>

                      <td class="px-4 py-4 align-top">
                        <div class="flex flex-wrap gap-1.5">
                          <span class="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">{{ p.category?.name }}</span>
                          <span :class="['text-[10px] px-1.5 py-0.5 rounded border', p.type === 'truth' ? 'text-blue-400 bg-blue-900/10 border-blue-900/30' : 'text-red-400 bg-red-900/10 border-red-900/30']">{{ p.type === 'truth' ? '真' : '险' }} Lv.{{ p.level }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-4 align-top">
                        <span v-if="isRecycleBin" class="text-red-500 text-xs font-bold bg-red-900/20 px-2 py-1 rounded-full">🗑️ 已删除</span>
                        <template v-else>
                           <span v-if="p.status === 'PENDING'" class="text-yellow-500 text-xs font-bold bg-yellow-900/10 px-2 py-1 rounded-full">🟠 待审</span>
                           <span v-else-if="p.status === 'APPROVED'" class="text-green-500 text-xs font-bold bg-green-900/10 px-2 py-1 rounded-full">🟢 通过</span>
                           <span v-else class="text-red-500 text-xs font-bold bg-red-900/10 px-2 py-1 rounded-full">🔴 拒绝</span>
                        </template>
                      </td>
                      <td class="px-4 py-4 text-right align-top">
                        <div class="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition">
                          <template v-if="isRecycleBin">
                            <button @click="confirmAction('restore', p.id)" class="w-8 h-8 bg-green-600/20 border border-green-600/50 hover:bg-green-600 text-green-500 hover:text-white rounded-lg flex items-center justify-center transition" title="恢复">♻️</button>
                            <button @click="confirmAction('hardDelete', p.id)" class="w-8 h-8 bg-red-600/20 border border-red-600/50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg flex items-center justify-center transition" title="彻底粉碎">💥</button>
                          </template>
                          <template v-else>
                             <button @click="openEditPenalty(p)" class="w-8 h-8 bg-blue-600/20 border border-blue-600/50 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg flex items-center justify-center transition" title="编辑详情">✏️</button>
                             
                             <button v-if="p.status !== 'APPROVED'" @click="updateStatus(p.id, 'APPROVED')" class="w-8 h-8 bg-green-600/20 border border-green-600/50 hover:bg-green-600 text-green-500 hover:text-white rounded-lg flex items-center justify-center transition" title="通过">✓</button>
                             <button v-if="p.status !== 'REJECTED'" @click="updateStatus(p.id, 'REJECTED')" class="w-8 h-8 bg-yellow-600/20 border border-yellow-600/50 hover:bg-yellow-600 text-yellow-500 hover:text-white rounded-lg flex items-center justify-center transition" title="拒绝">✕</button>
                             <button @click="confirmAction('softDelete', p.id)" class="w-8 h-8 bg-gray-800 border border-gray-700 hover:bg-red-600 hover:border-red-600 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition" title="删除">🗑️</button>
                          </template>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="p-4 border-t border-gray-800 flex justify-between items-center bg-gray-900/30">
                 <button @click="changePage(-1)" :disabled="page <= 1" class="text-xs px-3 py-1.5 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 border border-gray-700">上一页</button>
                 <span class="text-xs font-mono text-gray-500">PAGE {{ page }}</span>
                 <button @click="changePage(1)" :disabled="penalties.length < pageSize" class="text-xs px-3 py-1.5 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 border border-gray-700">下一页</button>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';

const router = useRouter();
const TOKEN_KEY = 'admin_auth_token';

// 基础状态
const isAuthenticated = ref(!!localStorage.getItem(TOKEN_KEY));
const inputPassword = ref('');
const currentTab = ref('dashboard');
const isLoading = ref(false);
const toast = ref({ show: false, type: 'success', title: '', msg: '' });
const modal = ref({ show: false, title: '', content: '', icon: '', isDestructive: false, confirmAction: null });

// 业务状态
const stats = ref({});
const activeRooms = ref([]);
const penalties = ref([]);
const categories = ref([]); 
const filterStatus = ref('');
const isRecycleBin = ref(false); 
const page = ref(1);
const pageSize = 20;

// 弹窗状态
const showCategoryModal = ref(false);
const categoryForm = ref({ id: null, name: '', description: '' });
const isEditingCategory = ref(false);

const showEditPenaltyModal = ref(false);
const editPenaltyForm = ref({ id: null, content: '', type: 'truth', level: 3, categoryId: null });

const showBatchModal = ref(false);
const batchForm = ref({ content: '', categoryId: '', type: 'truth', level: '3' });

// 计算属性
const displayStats = computed(() => ({
  active: { label: '活跃房间', value: stats.value.rooms || 0, color: 'text-blue-400' },
  pending: { label: '待审核', value: stats.value.pending || 0, color: 'text-yellow-400' },
  approved: { label: '已收录', value: stats.value.approved || 0, color: 'text-green-400' },
  total: { label: '总题目', value: stats.value.total || 0, color: 'text-purple-400' }
}));
const batchPreviewCount = computed(() => batchForm.value.content.split('\n').filter(l => l.trim()).length);

// 辅助函数
let toastTimer;
const showToast = (type, title, msg) => {
  clearTimeout(toastTimer);
  toast.value = { show: true, type, title, msg };
  toastTimer = setTimeout(() => toast.value.show = false, 3000);
};
const formatTime = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '刚刚';
const navBtnClass = (tab) => `w-full text-left px-5 py-4 rounded-xl flex items-center gap-4 transition-all font-bold ${currentTab.value === tab ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-white border border-pink-500/30' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`;

// 等级显示辅助
const getLevelLabel = (lv) => {
  if (lv <= 1) return '(萌新)';
  if (lv === 2) return '(简单)';
  if (lv === 3) return '(普通)';
  if (lv === 4) return '(困难)';
  return '(地狱)';
};

const getLevelColor = (lv) => {
  if (lv <= 1) return 'text-emerald-400';
  if (lv === 2) return 'text-lime-400';
  if (lv === 3) return 'text-yellow-400';
  if (lv === 4) return 'text-orange-500';
  return 'text-red-600';
};

const getSliderAccent = (lv) => {
  if (lv <= 1) return 'accent-emerald-500';
  if (lv === 2) return 'accent-lime-500';
  if (lv === 3) return 'accent-yellow-500';
  if (lv === 4) return 'accent-orange-500';
  return 'accent-red-600';
};

// 初始化
onMounted(() => {
  if (isAuthenticated.value) {
    fetchDashboardData();
    fetchCategoriesStats();
  }
});

// 认证逻辑
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
      fetchCategoriesStats();
    }
  } catch (e) { showToast('error', '拒绝访问', '密码错误'); inputPassword.value = ''; }
  finally { isLoading.value = false; }
};
const logout = () => { localStorage.removeItem(TOKEN_KEY); isAuthenticated.value = false; showToast('success', '已退出', '安全登出'); };

// 切换标签页
const switchTab = (tab) => {
  if (currentTab.value === tab) return;
  currentTab.value = tab;
  if (tab === 'dashboard') fetchDashboardData();
  if (tab === 'penalties') resetAndFetchPenalties();
  if (tab === 'categories') fetchCategoriesStats();
};

const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const [s, r] = await Promise.all([api.get('/admin/stats'), api.get('/admin/active-rooms')]);
    stats.value = s || {}; activeRooms.value = r.data || [];
  } catch (e) {} finally { isLoading.value = false; }
};

const fetchCategoriesStats = async () => {
  try {
    const res = await api.get('/admin/categories-stats');
    categories.value = res || [];
  } catch (e) { console.error(e); }
};

const resetAndFetchPenalties = () => { page.value = 1; fetchPenalties(); };
const toggleRecycleBin = () => { isRecycleBin.value = !isRecycleBin.value; resetAndFetchPenalties(); };

const fetchPenalties = async () => {
  isLoading.value = true;
  try {
    const params = { page: page.value, limit: pageSize, status: (!isRecycleBin.value && filterStatus.value) ? filterStatus.value : undefined, deleted: isRecycleBin.value };
    const res = await api.get('/admin/penalties', { params });
    penalties.value = res.list || [];
  } catch (e) {} finally { isLoading.value = false; }
};

// 分类管理操作
const openCreateCategory = () => {
  isEditingCategory.value = false;
  categoryForm.value = { id: null, name: '', description: '' }; // 重置
  showCategoryModal.value = true;
};

const openEditCategory = (cat) => {
  isEditingCategory.value = true;
  categoryForm.value = { 
    id: cat.id, 
    name: cat.name, 
    description: cat.description || '' // 🟢 赋值
  };
  showCategoryModal.value = true;
};

const submitCategory = async () => {
  if (!categoryForm.value.name.trim()) return showToast('error', '失败', '名称不能为空');
  isLoading.value = true;
  try {
    const payload = { 
      name: categoryForm.value.name, 
      description: categoryForm.value.description // 🟢 包含描述
    };
    if (isEditingCategory.value) {
      await api.put(`/admin/categories/${categoryForm.value.id}`, payload);
      showToast('success', '修改成功', '分类已更新');
    } else {
      await api.post('/admin/categories', payload);
      showToast('success', '创建成功', '新分类已添加');
    }
    showCategoryModal.value = false;
    fetchCategoriesStats();
  } catch (e) { showToast('error', '失败', '操作失败'); }
  finally { isLoading.value = false; }
};

const deleteCategory = async (id) => {
  isLoading.value = true;
  try {
    await api.delete(`/admin/categories/${id}`);
    showToast('success', '已删除', '分类已移除');
    fetchCategoriesStats();
  } catch (e) { showToast('error', '无法删除', e.response?.data?.error || '服务器错误'); }
  finally { isLoading.value = false; }
};

// 题库管理操作 (批量 & 编辑)
const openBatchModal = () => {
  if (categories.value.length === 0) fetchCategoriesStats();
  if (categories.value.length > 0 && !batchForm.value.categoryId) batchForm.value.categoryId = categories.value[0].id;
  showBatchModal.value = true;
};

const submitBatch = async () => {
  const lines = batchForm.value.content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return showToast('error', '失败', '请填写内容');
  isLoading.value = true;
  try {
    const res = await api.post('/admin/penalties/batch', {
      items: lines, categoryId: batchForm.value.categoryId, type: batchForm.value.type, level: batchForm.value.level
    });
    showToast('success', '导入成功', `添加了 ${res.count} 条`);
    showBatchModal.value = false;
    batchForm.value.content = '';
    fetchPenalties();
  } catch (e) { showToast('error', '导入失败', '服务器错误'); }
  finally { isLoading.value = false; }
};

const openEditPenalty = (p) => {
  editPenaltyForm.value = { 
    id: p.id, 
    content: p.content,
    type: p.type,
    level: p.level,
    categoryId: p.categoryId
  };
  if (categories.value.length === 0) fetchCategoriesStats();
  showEditPenaltyModal.value = true;
};

const submitEditPenalty = async () => {
  if (!editPenaltyForm.value.content.trim()) return showToast('error', '失败', '内容不能为空');
  isLoading.value = true;
  try {
    await api.put(`/admin/penalties/${editPenaltyForm.value.id}/info`, { 
      content: editPenaltyForm.value.content,
      type: editPenaltyForm.value.type,
      level: editPenaltyForm.value.level,
      categoryId: editPenaltyForm.value.categoryId
    });
    showToast('success', '更新成功', '题目信息已修改');
    showEditPenaltyModal.value = false;
    
    // 乐观更新
    const item = penalties.value.find(p => p.id === editPenaltyForm.value.id);
    if (item) {
      item.content = editPenaltyForm.value.content;
      item.type = editPenaltyForm.value.type;
      item.level = editPenaltyForm.value.level;
      item.categoryId = editPenaltyForm.value.categoryId;
      const cat = categories.value.find(c => c.id === item.categoryId);
      if (cat) item.category = { name: cat.name };
    }
  } catch (e) { showToast('error', '失败', '更新失败'); }
  finally { isLoading.value = false; }
};

// 通用项目操作
const updateStatus = async (id, status) => {
  try {
    await api.put(`/admin/penalties/${id}`, { status });
    const item = penalties.value.find(p => p.id === id);
    if (item) item.status = status;
    showToast('success', '操作成功', `状态更新为 ${status}`);
  } catch (e) { showToast('error', '失败', '网络错误'); }
};

const confirmAction = (actionType, id) => {
  let config = {};
  if (actionType === 'softDelete') config = { title: '移入回收站？', content: '题目将下架，可回收。', icon: '🗑️', isDestructive: true, action: () => deletePenalty(id) };
  else if (actionType === 'restore') config = { title: '确认恢复？', content: '题目将回到审核列表。', icon: '♻️', isDestructive: false, action: () => restorePenalty(id) };
  else if (actionType === 'hardDelete') config = { title: '彻底粉碎？', content: '警告：数据将永久消失！', icon: '💥', isDestructive: true, action: () => hardDeletePenalty(id) };
  else if (actionType === 'deleteCategory') config = { title: '删除分类？', content: '仅当分类为空时可删除。', icon: '🗑️', isDestructive: true, action: () => deleteCategory(id) };
  modal.value = { show: true, ...config, confirmAction: config.action };
};

const handleModalConfirm = async () => { if (modal.value.confirmAction) await modal.value.confirmAction(); modal.value.show = false; };
const deletePenalty = async (id) => { try { await api.delete(`/admin/penalties/${id}`); penalties.value = penalties.value.filter(p => p.id !== id); showToast('success', '已删除', '移入回收站'); } catch (e) { showToast('error', '失败', '无法删除'); } };
const restorePenalty = async (id) => { try { await api.put(`/admin/penalties/${id}/restore`); penalties.value = penalties.value.filter(p => p.id !== id); showToast('success', '已恢复', '题目已还原'); } catch (e) { showToast('error', '失败', '无法恢复'); } };
const hardDeletePenalty = async (id) => { try { await api.delete(`/admin/penalties/${id}/hard`); penalties.value = penalties.value.filter(p => p.id !== id); showToast('success', '已粉碎', '数据彻底消失'); } catch (e) { showToast('error', '失败', '系统错误'); } };
const spectateRoom = (roomId) => window.open(router.resolve({ path: `/room/${roomId}`, query: { spectate: 'true' } }).href, '_blank');
const changePage = (d) => { page.value += d; fetchPenalties(); };
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-30px) scale(0.9); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ec4899; }
input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { display: none; }
input[type="password"]::-webkit-credentials-auto-fill-button { visibility: hidden; pointer-events: none; position: absolute; right: 0; }
</style>