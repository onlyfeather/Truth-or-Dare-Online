const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据...');

  // 1. 清理旧数据 (可选，防止重复)
  // await prisma.penalty.deleteMany({});
  // await prisma.category.deleteMany({});
  
  // 2. 创建分类
  const cat1 = await prisma.category.create({
    data: { name: '🧊 破冰热身', description: '适合刚认识的朋友，缓解尴尬' }
  });
  
  const cat2 = await prisma.category.create({
    data: { name: '❤️ 情感拷问', description: '深入灵魂的拷问，适合老友局' }
  });

  const cat3 = await prisma.category.create({
    data: { name: '🤪 搞怪大冒险', description: '放飞自我，社死现场' }
  });

  console.log('✅ 分类创建完成');

  // 3. 创建题目数据
  const penalties = [
    // --- 🧊 破冰热身 ---
    { content: '分享一件你最近发生的糗事', type: 'truth', level: 1, categoryId: cat1.id },
    { content: '现场模仿一种动物的叫声', type: 'dare', level: 1, categoryId: cat1.id },
    { content: '你最想拥有的一项超能力是什么？', type: 'truth', level: 1, categoryId: cat1.id },
    { content: '做一个鬼脸并保持5秒', type: 'dare', level: 1, categoryId: cat1.id },
    { content: '你的初恋是在几岁？', type: 'truth', level: 2, categoryId: cat1.id },
    { content: '对左边的人说一句土味情话', type: 'dare', level: 2, categoryId: cat1.id },

    // --- ❤️ 情感拷问 ---
    { content: '你最后悔的一件事是什么？', type: 'truth', level: 3, categoryId: cat2.id },
    { content: '如果前任现在找你复合，你会答应吗？', type: 'truth', level: 4, categoryId: cat2.id },
    { content: '给通讯录里第3个异性打个电话说“我好无聊”', type: 'dare', level: 4, categoryId: cat2.id },
    { content: '现场展示你手机里最后一张照片', type: 'truth', level: 3, categoryId: cat2.id },
    { content: '你觉得自己最迷人的部位是哪里？', type: 'truth', level: 2, categoryId: cat2.id },
    { content: '深情地看着右边的人30秒不许笑', type: 'dare', level: 3, categoryId: cat2.id },

    // --- 🤪 搞怪大冒险 ---
    { content: '用屁股写出你的名字', type: 'dare', level: 5, categoryId: cat3.id },
    { content: '去隔壁房间（或对着窗外）大喊一声“我是奥特曼”', type: 'dare', level: 5, categoryId: cat3.id },
    { content: '模仿便秘时的表情自拍一张', type: 'dare', level: 4, categoryId: cat3.id },
    { content: '一边做深蹲一边唱《两只老虎》', type: 'dare', level: 4, categoryId: cat3.id },
    { content: '你穿过最奇怪的衣服是什么？', type: 'truth', level: 3, categoryId: cat3.id },
    { content: '选一位异性，夸TA三个优点', type: 'dare', level: 2, categoryId: cat3.id },
  ];

  for (const p of penalties) {
    await prisma.penalty.create({
      data: {
        content: p.content,
        type: p.type,
        level: p.level,
        categoryId: p.categoryId,
        creator: '系统',
        status: 'APPROVED'
      }
    });
  }

  console.log(`✅ 成功添加了 ${penalties.length} 条题目数据`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });