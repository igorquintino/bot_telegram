require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens_prontas_para_bot.json", "utf8"));

console.log("🚀 Bot iniciado...");
console.log("✅ Chat ID:", process.env.CHAT_ID_LIVRO || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));

function enviarMensagemAleatoria(horario) {
  console.log(`⏰ Executando envio para horário: ${horario}`);
  const opcoes = mensagens[horario];

  if (!opcoes || opcoes.length === 0) {
    console.warn(`⚠️ Nenhuma mensagem disponível para o horário ${horario}`);
    return;
  }

  const aleatoria = opcoes[Math.floor(Math.random() * opcoes.length)];

  if (!aleatoria.mensagem || aleatoria.mensagem.trim() === "") {
    console.warn(`⚠️ Mensagem vazia no horário ${horario}.`);
    return;
  }

  try {
    const buffer = fs.readFileSync(aleatoria.caminho);
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, buffer, {
      caption: aleatoria.mensagem,
      parse_mode: "HTML"
    })
    .then(() => console.log(`✅ Enviado com imagem: ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar imagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  } catch (err) {
    console.error("❌ Erro ao ler imagem local:", aleatoria.caminho);
    bot.sendMessage(process.env.CHAT_ID_LIVRO, aleatoria.mensagem, { parse_mode: "HTML" });
  }
}

const horarios = [
  "12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30", "12:35", "12:40", "12:45",
  "12:50", "12:55", "13:00", "13:05", "13:10", "13:15", "13:20", "13:25", "13:30", "13:35",
  "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25"
];

horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo"
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");