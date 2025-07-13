require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

const chatId = process.env.CHAT_ID_LIVRO;

console.log("🚀 Bot iniciado...");
console.log("✅ Chat ID:", chatId || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));

function enviarMensagem() {
  console.log("⏰ Enviando mensagem a cada 5 minutos...");

  const prioridade = mensagens?.prioridade || [];
  const lista = mensagens?.produtos || [];

  const produto = prioridade.length > 0
    ? prioridade.shift() // pega e remove o primeiro da fila de prioridade
    : lista[Math.floor(Math.random() * lista.length)];

  if (!produto || !produto.mensagem) {
    console.warn("⚠️ Produto vazio ou sem mensagem.");
    return;
  }

  if (prioridade.length > 0) {
    mensagens.prioridade = prioridade;
    fs.writeFileSync("mensagens.json", JSON.stringify(mensagens, null, 2), "utf8");
  }

  if (produto.caminho && fs.existsSync(produto.caminho)) {
    try {
      const buffer = fs.readFileSync(produto.caminho);
      bot.sendPhoto(chatId, buffer, {
        caption: produto.mensagem,
        parse_mode: "HTML"
      })
      .then(() => console.log("✅ Enviado com imagem"))
      .catch(err => {
        console.error("❌ Erro ao enviar imagem:", err?.response?.body?.description);
      });
    } catch (erroImagem) {
      console.error("❌ Erro ao ler imagem:", produto.caminho);
      bot.sendMessage(chatId, produto.mensagem, { parse_mode: "HTML" });
    }
  } else {
    bot.sendMessage(chatId, produto.mensagem, { parse_mode: "HTML" });
    console.log("📩 Enviado sem imagem.");
  }
}

// Agendamento: a cada 5 minutos
cron.schedule("*/5 * * * *", enviarMensagem, {
  timezone: "America/Sao_Paulo"
});

console.log("✅ Bot rodando com envio a cada 5 minutos!");
