const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
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
    return json.geral || [];
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

function normalizarUrlImagem(url) {
  if (!url || typeof url !== 'string') return { ok: false, motivo: 'URL vazia' };

  // Corrige GitHub Raw
  url = url.replace('https://raw.github.com/', 'https://raw.githubusercontent.com/');

  // Imgur álbum/página -> inválido para sendPhoto
  if (url.includes('imgur.com/a/') || url.includes('imgur.com/gallery/')) {
    return { ok: false, motivo: 'URL do Imgur é álbum/página (use i.imgur.com/arquivo.jpg)' };
  }

  // Dica: se for imgur "normal", recomende usar i.imgur.com
  if (url.includes('://imgur.com/') && !url.includes('://i.imgur.com/')) {
    return { ok: false, motivo: 'URL do Imgur não é direta. Use i.imgur.com/ARQUIVO.jpg' };
  }

  // Opcional: checar extensão (não é obrigatório, mas ajuda)
  const temExtensao = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  if (!temExtensao && url.includes('i.imgur.com')) {
    return { ok: false, motivo: 'Link do Imgur sem extensão (ex.: .jpg/.png)' };
  }

  return { ok: true, url };
}

function cortarLegenda(caption, limite = 1024) {
  if (!caption) return '';
  if (caption.length <= limite) return caption;
  // preserva HTML básico cortando no limite
  return caption.slice(0, limite - 1) + '…';
}

function enviarMensagem() {
  const mensagens = carregarMensagens();
  const m = sortearMensagem(mensagens);

  if (!m || !m.mensagem) {
    console.warn('⚠️ Produto vazio ou sem mensagem.');
    return;
  }

  const urlOriginal = m.imagem || m.caminho || null;
  const norm = normalizarUrlImagem(urlOriginal);

  if (urlOriginal && norm.ok) {
    const caption = cortarLegenda(m.mensagem, 1024);
    bot.sendPhoto(chatId, norm.url, { caption, parse_mode: 'HTML' })
      .then(() => console.log('✅ Foto enviada com sucesso!'))
      .catch((erro) => {
        console.error('❌ Erro ao enviar foto:', erro?.response?.body || erro.message || erro);
        // fallback para texto, pra não perder o envio
        return bot.sendMessage(chatId, m.mensagem, { parse_mode: 'HTML' });
      })
      .then(() => console.log('ℹ️ Fallback de texto enviado (se houve erro na foto).'))
      .catch((erro) => console.error('❌ Erro também no fallback de texto:', erro?.response?.body || erro.message || erro));
  } else {
    if (urlOriginal && !norm.ok) {
      console.warn(`⚠️ Ignorando imagem inválida: ${norm.motivo} | URL: ${urlOriginal}`);
    }
    bot.sendMessage(chatId, m.mensagem, { parse_mode: 'HTML' })
      .then(() => console.log('✅ Mensagem (texto) enviada com sucesso!'))
      .catch((erro) => console.error('❌ Erro ao enviar mensagem (texto):', erro?.response?.body || erro.message || erro));
  }
}

console.log('🚀 Bot iniciado...');
console.log(`✅ ID do bate-papo: ${chatId}`);
console.log(`🕒 Horário atual: ${new Date().toLocaleString()}`);
console.log('✅ Bot rodando com envio a cada 5 minutos!');

enviarMensagem();
setInterval(enviarMensagem, TEMPO_ENVIO);
