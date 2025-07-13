require("dotenv").config();
const fs = require("fs");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const mensagens = JSON.parse(fs.readFileSync("mensagens.json", "utf8"));

console.log("🚀 Bot iniciado...");
console.log("✅ ID do bate-papo:", process.env.CHAT_ID_LIVRO || "⚠️ NÃO DEFINIDO");
console.log("⏰ Horário atual:", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));

function enviarProduto(produto, horario) {
  try {
    const buffer = fs.readFileSync(produto.caminho);
    bot.sendPhoto(process.env.CHAT_ID_LIVRO, buffer, {
      caption: produto.mensagem,
      parse_mode: "HTML"
    })
    .then(() => console.log(`✅ Enviado com imagem às ${horario}`))
    .catch(err => {
      console.error("❌ Erro ao enviar imagem:");
      console.error("Código:", err?.response?.body?.error_code);
      console.error("Descrição:", err?.response?.body?.description);
    });
  } catch (err) {
    console.warn("⚠️ Erro ao ler imagem, enviando apenas a mensagem:", produto.caminho);
    bot.sendMessage(process.env.CHAT_ID_LIVRO, produto.mensagem, { parse_mode: "HTML" });
  }
}

function enviarMensagemProgramada() {
  const horario = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  });

  console.log(`⏰ Executando envio para: ${horario}`);

  const prioritarios = mensagens.prioritarios || [];
  const produtos = mensagens.produtos || [];

  let produtoSelecionado;

  if (prioritarios.length > 0) {
    produtoSelecionado = prioritarios.shift(); // Remove o primeiro da fila
    console.log("🔥 Enviando produto prioritário!");
  } else if (produtos.length > 0) {
    produtoSelecionado = produtos[Math.floor(Math.random() * produtos.length)];
    console.log("🎯 Enviando produto aleatório!");
  } else {
    console.warn("⚠️ Nenhum produto disponível para envio.");
    return;
  }

  enviarProduto(produtoSelecionado, horario);

  // Atualiza o arquivo com a nova lista de prioritários (caso tenha sido alterada)
  mensagens.prioritarios = prioritarios;
  fs.writeFileSync("mensagens.json", JSON.stringify(mensagens, null, 2));
}

// Executar de 5 em 5 minutos
cron.schedule("*/5 * * * *", enviarMensagemProgramada, {
  timezone: "America/Sao_Paulo"
});

console.log("✅ Bot rodando e pronto para enviar mensagens a cada 5 minutos!");
