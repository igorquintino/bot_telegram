require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

// Função para enviar mensagem aleatória de um horário
function enviarMensagemAleatoria(horario) {
  const opcoes = mensagens[horario];
  if (!opcoes || opcoes.length === 0) return;

  const aleatoria = opcoes[Math.floor(Math.random() * opcoes.length)];

  if (aleatoria.file_id) {
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, aleatoria.file_id, {
      caption: aleatoria.mensagem,
      parse_mode: "HTML",
    })
    .then(() => console.log(`✅ Enviado com imagem: ${horario}`))
    .catch(err => console.error("❌ Erro (imagem):", err.description));
  } else {
    bot.sendMessage(process.env.CHAT_ID_LIVRO, aleatoria.mensagem, {
      parse_mode: "HTML",
    })
    .then(() => console.log(`✅ Enviado sem imagem: ${horario}`))
    .catch(err => console.error("❌ Erro (mensagem):", err.description));
  }
}

// Agendando para 09:00
cron.schedule("00 09 * * *", () => enviarMensagemAleatoria("09:00"), {
  timezone: "America/Sao_Paulo",
});

// Agendando para 12:00
cron.schedule("00 12 * * *", () => enviarMensagemAleatoria("12:00"), {
  timezone: "America/Sao_Paulo",
});

// Você pode adicionar mais horários abaixo seguindo o mesmo padrão

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");
