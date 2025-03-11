// Import required libraries
const { Telegraf, Scenes, session } = require('telegraf');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Set up logging
const logger = console;

// Bot states
const STATES = {
  PRODUCT_NAME: 'PRODUCT_NAME',
  PRODUCT_PRICE: 'PRODUCT_PRICE'
};

//hsjdkfhjkfhgdjkfg

// Store user data
const userDataDict = {};

// Create main keyboard
const getMainKeyboard = () => {
  return {
    keyboard: [
      ['🛒 Mahsulot qo\'shish'],
      ['📥 Excel yuklab olish', '🗑 Ma\'lumotlarni tozalash']
    ],
    resize_keyboard: true
  };
};

// Create cancel keyboard
const getCancelKeyboard = () => {
  return {
    keyboard: [['❌ Bekor qilish']],
    resize_keyboard: true
  };
};

// Product scene creation
const productScene = new Scenes.WizardScene(
  'PRODUCT_WIZARD',
  // Step 1: Ask for product name
  async (ctx) => {
    await ctx.reply('Mahsulot nomini kiriting:', { reply_markup: getCancelKeyboard() });
    return ctx.wizard.next();
  },
  // Step 2: Get product name and ask for price
  async (ctx) => {
    // Check for cancellation
    if (ctx.message.text === '❌ Bekor qilish') {
      await ctx.reply('Mahsulot qo\'shish bekor qilindi.', { reply_markup: getMainKeyboard() });
      return ctx.scene.leave();
    }

    // Store product name
    ctx.wizard.state.productName = ctx.message.text;
    
    // Ask for price
    await ctx.reply('Mahsulot narxini kiriting (faqat raqamlar):', { reply_markup: getCancelKeyboard() });
    return ctx.wizard.next();
  },
  // Step 3: Get price and save product
  async (ctx) => {
    // Check for cancellation
    if (ctx.message.text === '❌ Bekor qilish') {
      await ctx.reply('Mahsulot qo\'shish bekor qilindi.', { reply_markup: getMainKeyboard() });
      return ctx.scene.leave();
    }

    const userId = ctx.from.id;
    
    try {
      const price = parseFloat(ctx.message.text);
      
      // Ensure user has an entry in the data dictionary
      if (!userDataDict[userId]) {
        userDataDict[userId] = [];
      }
      
      // Add product data to user's list
      userDataDict[userId].push({
        nomi: ctx.wizard.state.productName,
        narxi: price
      });
      
      // Confirm product added
      await ctx.reply(
        `✅ Mahsulot qo'shildi!\n\n🏷️ Nomi: ${ctx.wizard.state.productName}\n💰 Narxi: ${price}`,
        { reply_markup: getMainKeyboard() }
      );
      
      return ctx.scene.leave();
    } catch (error) {
      // Handle invalid price input
      await ctx.reply(
        'Iltimos, faqat raqamlarni kiriting. Qaytadan urinib ko\'ring:',
        { reply_markup: getCancelKeyboard() }
      );
      return;
    }
  }
);

// Create bot and stage
const bot = new Telegraf(process.env.BOT_TOKEN || '8126996910:AAGcidCXkjc53ONoGv681Q_c4jEDdQwDvOc');
const stage = new Scenes.Stage([productScene]);

// Register middleware
bot.use(session());
bot.use(stage.middleware());

// Start command handler
bot.command('start', async (ctx) => {
  const user = ctx.from;
  await ctx.reply(
    `Salom, ${user.first_name}! Men mahsulot ma'lumotlarini Excel formatiga saqlaydigan botman.\n` +
    'Pastdagi tugmalardan foydalanib ma\'lumotlarni boshqarishingiz mumkin.',
    { reply_markup: getMainKeyboard() }
  );
});

// Add product command handler
bot.command('add', (ctx) => ctx.scene.enter('PRODUCT_WIZARD'));
bot.hears('🛒 Mahsulot qo\'shish', (ctx) => ctx.scene.enter('PRODUCT_WIZARD'));

// Export to Excel function
const exportToExcel = async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userDataDict[userId] || userDataDict[userId].length === 0) {
    await ctx.reply(
      'Hozircha hech qanday ma\'lumot kiritilmagan. Mahsulot qo\'shish tugmasini bosing.',
      { reply_markup: getMainKeyboard() }
    );
    return;
  }
  
  // Create workbook
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(userDataDict[userId]);
  xlsx.utils.book_append_sheet(wb, ws, 'Mahsulotlar');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').split('Z')[0];
  const fileName = `mahsulotlar_${timestamp}.xlsx`;
  const filePath = path.join(__dirname, fileName);
  
  // Write file
  xlsx.writeFile(wb, filePath);
  
  // Send file
  await ctx.replyWithDocument({ source: filePath, filename: fileName }, { caption: '📊 Mahsulot ma\'lumotlari' });
  
  // Delete file after sending
  fs.unlinkSync(filePath);
};

// Export command handler
bot.command('export', exportToExcel);
bot.hears('📥 Excel yuklab olish', exportToExcel);

// Clear data function
const clearData = async (ctx) => {
  const userId = ctx.from.id;
  
  if (userDataDict[userId]) {
    userDataDict[userId] = [];
  }
  
  await ctx.reply('🗑 Barcha ma\'lumotlar o\'chirildi.', { reply_markup: getMainKeyboard() });
};

// Clear command handler
bot.command('clear', clearData);
bot.hears('🗑 Ma\'lumotlarni tozalash', clearData);

// Start the bot
bot.launch().then(() => {
  logger.info('Bot is running...');
}).catch((err) => {
  logger.error('Error starting bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));