const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

// Carrega variáveis de ambiente
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const TEMPO_ENVIO = 5 * 60 * 1000; // 5 minutos

if (!token || !chatId) {
  console.error('❌ BOT_TOKEN ou CHAT_ID não definidos no ambiente.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

function carregarMensagens() {
  try {
    const data = fs.readFileSync('./mensagens.json', 'utf8');
    const json = JSON.parse(data);
    return json.geral || []; // garante que seja um array
  } catch (erro) {
    console.error('❌ Erro ao carregar mensagens:', erro);
    return [];
  }
}

function sortearMensagem(mensagens) {
  if (mensagens.length === 0) return null;

  const prioritarias = mensagens.filter(m => m.prioridade === true);
  if (prioritarias.length > 0) {
    const escolhida = prioritarias[Math.floor(Math.random() * prioritarias.length)];
    escolhida.prioridade = false;
    return escolhida;
  }

  return mensagens[Math.floor(Math.random() * mensagens.length)];
}

function enviarMensagem() {
  const mensagens = carregarMensagens();
  const mensagem = sortearMensagem(mensagens);

  if (!mensagem || !mensagem.mensagem) {
    console.warn('⚠️ Produto vazio ou sem mensagem.');
    return;
  }

  bot.sendMessage(chatId, mensagem.mensagem, { parse_mode: 'HTML' })
    .then(() => console.log('✅ Mensagem enviada com sucesso!'))
    .catch((erro) => console.error('❌ Erro ao enviar mensagem:', erro));
}

console.log('🚀 Bot iniciado...');
console.log(`✅ ID do bate-papo: ${chatId}`);
console.log(`🕒 Horário atual: ${new Date().toLocaleString()}`);
console.log('✅ Bot rodando com envio a cada 5 minutos!');

enviarMensagem();
setInterval(enviarMensagem, TEMPO_ENVIO);
