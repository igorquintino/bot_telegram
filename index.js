require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

// Comando para testar file_id manualmente
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

// Função para enviar mensagem aleatória com imagem local ou file_id
function enviarMensagemAleatoria(horario) {
  const opcoes = mensagens[horario];
  if (!opcoes || opcoes.length === 0) return;

  const aleatoria = opcoes[Math.floor(Math.random() * opcoes.length)];

  if (aleatoria.file_id) {
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, aleatoria.file_id, {
      caption: aleatoria.mensagem,
      parse_mode: "HTML"
    })
    .then(() => console.log(`✅ Enviado com file_id: ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar imagem com file_id:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });

  } else if (aleatoria.caminho) {
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, fs.readFileSync(aleatoria.caminho), {
      caption: aleatoria.mensagem,
      parse_mode: "HTML"
    })
    .then(() => console.log(`✅ Enviado com imagem local: ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar imagem local:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });

  } else {
    bot.sendMessage(process.env.CHAT_ID_LIVRO, aleatoria.mensagem, {
      parse_mode: "HTML"
    })
    .then(() => console.log(`✅ Enviado sem imagem: ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar mensagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  }
}

// Lista de horários personalizados (5 em 5 minutos a partir das 21:15)
const horarios = [
  "12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30", "12:35", "12:40", "12:45",
  "12:50", "12:55", "13:00", "13:05", "13:10", "13:15", "13:20", "13:25", "13:30", "13:35",
  "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25",
  "14:30", "14:35", "14:40", "14:45", "14:50", "14:55", "15:00", "15:05", "15:10", "15:15",
  "15:20", "15:25"
];

horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo"
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");