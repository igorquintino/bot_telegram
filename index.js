require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

console.log("🚀 Bot iniciado...");
console.log("✅ ID do bate-papo:", process.env.CHAT_ID_LIVRO || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));

function enviarMensagemAleatoria(horario) {
  console.log(`⏰ Executando envio para: ${horario}`);

  const lista = mensagens.produtos;

  console.log("📦 Total de produtos carregados:", lista?.length);
  console.log("📋 Lista de nomes:", lista?.map(p => p.nome));

  if (!lista || lista.length === 0) {
    console.warn("⚠️ Nenhum produto disponível para envio.");
    return;
  }

  const produto = lista[Math.floor(Math.random() * lista.length)];

  if (!produto.mensagem || produto.mensagem.trim() === "") {
    console.warn("⚠️ Produto com mensagem vazia.");
    return;
  }

  try {
    const buffer = fs.readFileSync(produto.caminho);
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, buffer, {
      caption: produto.mensagem,
      parse_mode: "HTML"
    }).then(() => {
      console.log(`✅ Enviado com imagem para o horário: ${horario}`);
    }).catch(err => {
      console.error("❌ Erro ao enviar imagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  } catch (err) {
    console.error("❌ Erro ao ler imagem local:", produto.caminho);
    bot.sendMessage(process.env.CHAT_ID_LIVRO, produto.mensagem, { parse_mode: "HTML" });
  }
}

// Envia mensagem de 5 em 5 minutos
cron.schedule("*/5 * * * *", () => {
  const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  enviarMensagemAleatoria(agora);
}, {
  timezone: "America/Sao_Paulo"
});

console.log("✅ Bot rodando e pronto para enviar mensagens a cada 5 minutos!");
