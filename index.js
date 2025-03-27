require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Carrega e agrupa as mensagens por horário
const mensagensLista = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));
const mensagensPorHorario = {};

mensagensLista.forEach((msg) => {
  if (!mensagensPorHorario[msg.horario]) {
    mensagensPorHorario[msg.horario] = [];
  }
  mensagensPorHorario[msg.horario].push(msg);
});

// Função para enviar mensagem aleatória de um horário
function enviarMensagemAleatoria(horario) {
  const opcoes = mensagensPorHorario[horario];
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

// Agenda dinamicamente todos os horários do JSON
Object.keys(mensagensPorHorario).forEach(horario => {
  const [hora, minuto] = horario.split(":").map(Number);
  const cronExpr = `${minuto} ${hora} * * *`;

  cron.schedule(cronExpr, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo"
  });

  console.log(`⏰ Agendado para ${horario}`);
});

console.log("✅ Bot rodando com JSON em lista!");