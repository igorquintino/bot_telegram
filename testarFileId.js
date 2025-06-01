require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const fileId = "cole_aqui_seu_file_id";

bot.sendPhoto(process.env.CHAT_ID_LIVRO, fileId, {
  caption: "Teste de envio com file_id",
  parse_mode: "HTML"
})
.then(() => console.log("✅ file_id FUNCIONA!"))
.catch(err => {
  console.error("❌ Erro ao testar file_id:");
  console.error("Código:", err?.response?.body?.error_code);
  console.error("Descrição:", err?.response?.body?.description);
});