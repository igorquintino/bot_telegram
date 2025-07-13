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
  console.log(`⏰ Executando envio para horário: ${horario}`);

  const prioridade = mensagens.prioritarios || [];
  const lista = mensagens.produtos || [];

  let produto;

  if (prioridade.length > 0) {
    produto = prioridade.shift(); // remove o primeiro da lista de prioridade
    fs.writeFileSync("mensagens.json", JSON.stringify(mensagens, null, 2)); // atualiza o JSON
    console.log("🔥 Enviando produto prioritário!");
  } else if (lista.length > 0) {
    produto = lista[Math.floor(Math.random() * lista.length)];
    console.log("🎲 Enviando produto sorteado!");
  } else {
    console.warn("⚠️ Nenhum produto disponível.");
    return;
  }

  if (!produto.mensagem || produto.mensagem.trim() === "") {
    console.warn("⚠️ Produto com mensagem vazia.");
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

const horarios = [
  "15:00", "15:05", "15:10", "15:15", "15:20", "15:25", "15:30", "15:35", "15:40", "15:45",
  "15:50", "15:55", "16:00", "21:05", "21:10", "21:15", "21:20", "21:25", "21:30", "21:35",
  "21:40", "21:45", "21:50", "21:55", "22:00", "22:05", "22:10", "22:15", "22:20", "22:25",
  "22:30", "22:35", "22:40", "22:45", "22:50", "22:55", "23:00", "23:05", "23:10", "23:15",
  "23:20", "23:25", "23:30", "23:35", "23:40", "23:45", "23:50", "23:55", "00:00", "00:05",
  "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45", "00:50", "00:55",
  "01:00", "01:05", "01:10", "01:15", "01:20", "01:25", "01:30", "01:35", "01:40", "01:45",
  "01:50", "01:55", "02:00", "02:05", "02:10", "02:15", "02:20", "02:25", "02:30", "02:35",
  "02:40", "02:45", "02:50", "02:55", "03:00", "03:05", "03:10", "03:15", "03:20", "03:25"
];

horarios.forEach(horario => {
  const [hora, minuto] = horario.split(":");
  cron.schedule(`${minuto} ${hora} * * *`, () => enviarMensagemAleatoria(horario), {
    timezone: "America/Sao_Paulo"
  });
});

console.log("✅ Bot rodando e pronto para enviar mensagens programadas!");
