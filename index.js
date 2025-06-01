require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

// Comando para testar file_id manualmente no Telegram
bot.onText(/\/testar (.+)/, (msg, match) => {
  const fileId = match[1];
  bot.sendPhoto(msg.chat.id, fileId, {
    caption: "Teste de envio com file_id",
    parse_mode: "HTML"
  })
  .then(() => {
    bot.sendMessage(msg.chat.id, "✅ file_id FUNCIONA!");
  })
  .catch(err => {
    const codigo = err?.response?.body?.error_code || "desconhecido";
    const descricao = err?.response?.body?.description || "sem descrição";
    bot.sendMessage(msg.chat.id, `❌ Erro\nCódigo: ${codigo}\nDescrição: ${descricao}`);
  });
});

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
    .catch(err => {
      console.error("❌ Erro ao enviar imagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  } else {
    bot.sendMessage(process.env.CHAT_ID_LIVRO, aleatoria.mensagem, {
      parse_mode: "HTML",
    })
    .then(() => console.log(`✅ Enviado sem imagem: ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar mensagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  }
}

// Lista de horários a serem agendados
const horarios = [
  "11:00", "11:05", "11:10", "11:15", "11:20", "11:25", "11:30", "11:35", "11:40", "11:45", "11:50", "11:55",
  "12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30", "12:35", "12:40", "12:45", "12:50", "12:55",
  "13:00", "13:05", "13:10", "13:15", "13:20", "13:25", "13:30", "13:35", "13:40", "13:45", "13:50", "13:55",
  "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30", "14:35", "14:40", "14:45", "14:50", "14:55",
  "15:00", "15:05", "15:10", "15:15", "15:20", "15:25", "15:30", "15:35", "15:40", "15:45", "15:50", "15:55",
  "16:00", "16:05", "16:10", "16:15", "16:20", "16:25", "16:30", "16:35", "16:40", "16:45", "16:50", "16:55",
  "17:00", "17:05", "17:10", "17:15", "17:20", "17:25", "17:30", "17:35", "17:40", "17:45", "17:50", "17:55",
  "18:00", "18:05", "18:10", "18:15", "18:20", "18:25", "18:30", "18:35", "18:40", "18:45", "18:50", "18:55",
  "19:00", "19:05", "19:10"
];
horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo",
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");