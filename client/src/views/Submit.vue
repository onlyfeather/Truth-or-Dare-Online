<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 animate-fade-in">
      
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
          贡献题目
        </h1>
        <p class="text-xs text-gray-500 mt-1">你的脑洞，将成为别人的社死现场</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        
        <div class="flex bg-gray-900 p-1 rounded-lg">
          <button 
            type="button"
            @click="form.type = 'truth'"
            :class="['flex-1 py-2 rounded-md text-sm font-bold transition', form.type === 'truth' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200']"
          >
            真心话
          </button>
          <button 
            type="button"
            @click="form.type = 'dare'"
            :class="['flex-1 py-2 rounded-md text-sm font-bold transition', form.type === 'dare' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-gray-200']"
          >
            大冒险
          </button>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">题目内容</label>
          <textarea 
            v-model="form.content"
            rows="3"
            placeholder="例如：给前任打个电话..."
            class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-gray-200 resize-none"
            required
          ></textarea>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">所属分类</label>
          <div class="relative">
            <select 
              v-model="form.categoryId" 
              class="w-full pl-4 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-gray-200 appearance-none" 
              required
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div>
          <div class="flex justify-between text-sm text-gray-400 mb-2">
            <span>难度等级</span>
            <span :class="['font-bold transition-colors', getLevelColor(form.level)]">
              Lv.{{ form.level }} {{ getLevelLabel(form.level) }}
            </span>
          </div>
          <div class="relative w-full h-6 flex items-center">
             <input 
               type="range" 
               v-model.number="form.level" 
               min="1" 
               max="5" 
               step="1"
               :class="['w-full cursor-pointer transition-all', getSliderAccent(form.level)]"
             >
          </div>
          <div class="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
            <span v-for="i in 5" :key="i" :class="['transition-colors font-bold', form.level >= i ? getLevelColor(i) : 'text-gray-700']">
               {{ i }}
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">署名 (选填)</label>
          <input 
            v-model="form.creator"
            type="text"
            placeholder="留个名吧，英雄"
            class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-gray-200"
          >
        </div>

        <div class="flex gap-3 mt-6">
          <router-link to="/" class="flex-1 py-3 text-gray-400 bg-gray-700 hover:bg-gray-600 rounded-lg text-center text-sm font-bold transition">
            返回首页
          </router-link>
          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="flex-[2] py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:opacity-90 text-white rounded-lg font-bold shadow-lg transition disabled:opacity-50"
          >
            {{ isSubmitting ? '提交中...' : '提交题目' }}
          </button>
        </div>

      </form>
    </div>

    <div v-if="showModal" class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-700 p-6 animate-fade-in text-center">
        
        <div v-if="modalStatus === 'success'" class="text-5xl mb-4">🎉</div>
        <div v-else class="text-5xl mb-4">😵</div>

        <h3 class="text-xl font-bold text-white mb-2">
          {{ modalStatus === 'success' ? '提交成功！' : '哎呀，出错了' }}
        </h3>
        
        <p class="text-sm text-gray-400 mb-6 leading-relaxed">
          {{ modalMessage }}
        </p>

        <div class="flex gap-3">
          <button 
            v-if="modalStatus === 'success'"
            @click="router.push('/')" 
            class="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-bold transition"
          >
            回首页
          </button>

          <button 
            @click="closeModal" 
            :class="['flex-1 py-3 rounded-xl font-bold shadow-lg transition text-white', modalStatus === 'success' ? 'bg-gradient-to-r from-green-600 to-teal-600' : 'bg-gray-600']"
          >
            {{ modalStatus === 'success' ? '再来一条' : '我知道了' }}
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
// 🟢 修改点：引入 api 模块
import api from '../api';

const router = useRouter();
const categories = ref([]);
const isSubmitting = ref(false);

const showModal = ref(false);
const modalStatus = ref('success');
const modalMessage = ref('');

const form = ref({
  type: 'truth',
  content: '',
  categoryId: null,
  level: 3,
  creator: ''
});

// 辅助函数：复用 Admin 中的样式逻辑
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
  return 'text-red-500';
};

const getSliderAccent = (lv) => {
  if (lv <= 1) return 'accent-emerald-500';
  if (lv === 2) return 'accent-lime-500';
  if (lv === 3) return 'accent-yellow-500';
  if (lv === 4) return 'accent-orange-500';
  return 'accent-red-500';
};

onMounted(async () => {
  const savedName = localStorage.getItem('user_nickname');
  if (savedName) form.value.creator = savedName;

  try {
    // 🟢 修改点：使用 api.get
    const res = await api.get('/categories');
    categories.value = res; // 直接赋值
    if (categories.value.length > 0) form.value.categoryId = categories.value[0].id;
  } catch (e) {
    console.error("加载分类失败");
  }
});

const handleSubmit = async () => {
  if (!form.value.content.trim()) return;
  
  isSubmitting.value = true;
  try {
    // 🟢 修改点：使用 api.post
    await api.post('/penalties', form.value);
    
    modalStatus.value = 'success';
    modalMessage.value = '感谢你的贡献，这道题肯定很精彩！';
    showModal.value = true;
    form.value.content = ''; 

  } catch (e) {
    modalStatus.value = 'error';
    modalMessage.value = '服务器好像开小差了，请稍后再试。';
    showModal.value = true;
  } finally {
    isSubmitting.value = false;
  }
};

const closeModal = () => {
  showModal.value = false;
};
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>