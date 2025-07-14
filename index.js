require("dotenv").config();
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const token = 'SEU_TOKEN_AQUI'; // Substitua pelo seu token do bot
const chatId = '-1002396161701'; // ID do canal
const jsonPath = path.join(__dirname, 'mensagens_sem_imagem.json');

const bot = new TelegramBot(token, { polling: false });

let mensagens = [];
let mensagensPrioritarias = [];
let contadorMensagens = 0;

function carregarMensagens() {
  try {
    const data = fs.readFileSync(jsonPath, 'utf8');
    const json = JSON.parse(data);

    mensagensPrioritarias = json.prioritarios || [];
    mensagens = json.mensagens || [];
    console.log(`✅ Mensagens carregadas. ${mensagens.length} normais e ${mensagensPrioritarias.length} prioritárias.`);
  } catch (err) {
    console.error('❌ Erro ao carregar mensagens:', err);
  }
}

function escolherMensagem() {
  if (mensagensPrioritarias.length > 0) {
    return mensagensPrioritarias.shift(); // remove da lista
  }

  if (mensagens.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * mensagens.length);
  return mensagens[index];
}

function enviarMensagem() {
  const mensagem = escolherMensagem();

  if (!mensagem || !mensagem.texto) {
    console.warn('⚠️ Produto vazio ou sem mensagem.');
    return;
  }

  bot.sendMessage(chatId, mensagem.texto, { parse_mode: 'HTML' })
    .then(() => {
      console.log(`✅ Mensagem enviada com sucesso! (${++contadorMensagens})`);
    })
    .catch((err) => {
      console.error('❌ Erro ao enviar mensagem:', err.message);
    });
}

function iniciarEnvio() {
  console.log('🚀 Bot iniciado...');
  console.log(`✅ ID do bate-papo: ${chatId}`);
  carregarMensagens();

  enviarMensagem(); // dispara uma imediatamente
  setInterval(() => {
    const horaAtual = new Date().toLocaleString();
    console.log(`⏰ Enviando mensagem às: ${horaAtual}`);
    enviarMensagem();
  }, 5 * 60 * 1000); // 5 minutos
}

iniciarEnvio();
