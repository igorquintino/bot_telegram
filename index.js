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
  "21:15", "21:20", "21:25", "21:30", "21:35", "21:40", "21:45", "21:50", "21:55", "22:00", "22:05", "22:10",
"22:15", "22:20", "22:25", "22:30", "22:35", "22:40", "22:45", "22:50", "22:55", "23:00", "23:05", "23:10",
"23:15", "23:20", "23:25", "23:30", "23:35", "23:40", "23:45", "23:50", "23:55", "00:00", "00:05", "00:10",
"00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45", "00:50", "00:55", "01:00", "01:05", "01:10",
"01:15", "01:20", "01:25", "01:30", "01:35", "01:40", "01:45", "01:50", "01:55", "02:00", "02:05", "02:10",
"02:15", "02:20", "02:25", "02:30", "02:35", "02:40", "02:45", "02:50", "02:55", "03:00", "03:05", "03:10",
"03:15", "03:20", "03:25", "03:30", "03:35", "03:40", "03:45", "03:50", "03:55", "04:00", "04:05", "04:10",
"04:15", "04:20", "04:25", "04:30", "04:35", "04:40", "04:45", "04:50", "04:55", "05:00", "05:05", "05:10",
"05:15", "05:20", "05:25"

];
horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo",
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");