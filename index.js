require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

// Inicializa o bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Carrega o JSON de mensagens
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

console.log("🚀 Bot iniciado...");
console.log("✅ ID do bate-papo:", process.env.CHAT_ID_LIVRO || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
console.log("✅ Bot rodando e pronto para enviar mensagens a cada 5 minutos!");

function enviarMensagemAleatoria(horario) {
  console.log(`⏰ Executando envio para: ${horario}`);

  const prioridade = mensagens.produtos_prioritarios || [];
  const listaGeral = mensagens.produtos || [];

  let produto = null;

  if (prioridade.length > 0) {
    produto = prioridade.shift(); // pega e remove o primeiro produto prioritário
    mensagens.produtos_prioritarios = prioridade;

    // Atualiza o JSON removendo o produto já usado da prioridade
    fs.writeFileSync("mensagens.json", JSON.stringify(mensagens, null, 2));
    console.log("🔥 Enviando produto prioritário!");
  } else if (listaGeral.length > 0) {
    produto = listaGeral[Math.floor(Math.random() * listaGeral.length)];
  }

  if (!produto || !produto.mensagem || produto.mensagem.trim() === "") {
    console.warn("⚠️ Nenhum produto disponível para envio.");
    return;
  }

  try {
    const buffer = fs.readFileSync(produto.caminho);
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, buffer, {
      caption: produto.mensagem,
      parse_mode: "HTML"
    })
      .then(() => console.log(`✅ Enviado com imagem: ${horario}`))
      .catch(err => {
        console.error("❌ Erro ao enviar imagem:");
        console.error("Código:", err?.response?.body?.error_code);
        console.error("Descrição:", err?.response?.body?.description);
      });
  } catch (err) {
    console.error("❌ Erro ao ler imagem local:", produto.caminho);
    bot.sendMessage(process.env.CHAT_ID_LIVRO, produto.mensagem, { parse_mode: "HTML" });
  }
}

// A cada 5 minutos, executa o envio
cron.schedule("*/5 * * * *", () => {
  const agora = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: '2-digit', minute: '2-digit' });
  enviarMensagemAleatoria(agora);
}, {
  timezone: "America/Sao_Paulo"
});

// Comando manual para testar se o bot está funcionando
bot.onText(/\/teste/, (msg) => {
  const chatId = msg.chat.id;
  const mensagem = "✅ Mensagem de teste enviada com sucesso!\n\nBot Muleke das Promos está funcionando! 🚀";

  bot.sendMessage(chatId, mensagem, { parse_mode: "HTML" })
    .then(() => console.log("✅ Mensagem de teste enviada."))
    .catch(err => console.error("❌ Erro ao enviar mensagem de teste:", err));
});
