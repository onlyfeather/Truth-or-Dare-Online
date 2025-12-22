import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      // 🔴 原来：component: () => import('@/views/Home.vue'),
      // 🟢 修改为：使用 ./ (表示当前目录)
      component: () => import('./views/Home.vue'), 
      meta: { title: '首页 - 派对开始' }
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./views/Admin.vue'), // 🟢 改这里
      meta: { title: '管理控制台' }
    },
    {
      path: '/room/:id',
      name: 'GameRoom',
      component: () => import('./views/GameRoom.vue'), // 🟢 改这里
      meta: { title: '游戏房间' }
    },
    {
      path: '/submit',
      name: 'Submit',
      component: () => import('./views/Submit.vue'), // 🟢 改这里
      meta: { title: '提交题目' }
    }
  ],
})

router.beforeEach((to, from, next) => {
  const title = to.meta.title ? `${to.meta.title} | 真心话大冒险` : '真心话大冒险';
  document.title = title;
  next();
});

export default router;