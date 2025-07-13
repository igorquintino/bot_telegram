require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

console.log("🚀 Bot iniciado...");
console.log("✅ ID do bate-papo:", process.env.CHAT_ID_LIVRO || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
console.log("✅ Bot rodando e pronto para enviar mensagens a cada 5 minutos!");

function enviarMensagemTexto(horario) {
  console.log(`⏰ Executando envio para: ${horario}`);

  const prioridade = mensagens.produtos_prioritarios || [];
  const listaGeral = mensagens.produtos || [];

  let produto = null;

  if (prioridade.length > 0) {
    produto = prioridade.shift(); // Remove o primeiro prioritário
    fs.writeFileSync("mensagens.json", JSON.stringify(mensagens, null, 2)); // Atualiza o arquivo
    console.log("🎯 Enviando produto prioritário");
  } else if (listaGeral.length > 0) {
    produto = listaGeral[Math.floor(Math.random() * listaGeral.length)];
    console.log("📦 Enviando produto aleatório");
  }

  if (!produto || !produto.mensagem || produto.mensagem.trim() === "") {
    console.warn("⚠️ Nenhum produto disponível para envio.");
    return;
  }

  bot.sendMessage(process.env.CHAT_ID_LIVRO, produto.mensagem, { parse_mode: "HTML" })
    .then(() => console.log("✅ Mensagem enviada com sucesso!"))
    .catch(err => {
      console.error("❌ Erro ao enviar mensagem:");
      console.error(err.message);
    });
}

// ⏰ Envia a cada 5 minutos
cron.schedule("*/5 * * * *", () => {
  const horario = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
  enviarMensagemTexto(horario);
}, {
  timezone: "America/Sao_Paulo"
});
