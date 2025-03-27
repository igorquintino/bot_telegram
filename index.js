require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const mensagens = JSON.parse(fs.readFileSync("mensagens_por_horario.json", "utf8"));

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

// Lista de horários a serem agendados
const horarios = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "17:00", "18:00", "20:00"];

horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo",
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");