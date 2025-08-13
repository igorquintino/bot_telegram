const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID || process.env.CHAT_ID_LIVRO;
const TEMPO_ENVIO = 5 * 60 * 1000; // 5 minutos

if (!token || !chatId) {
  console.error('❌ BOT_TOKEN/TELEGRAM_BOT_TOKEN ou CHAT_ID/CHAT_ID_LIVRO não definidos no .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

function carregarMensagens() {
  try {
    const data = fs.readFileSync('./mensagens.json', 'utf8');
    const json = JSON.parse(data);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.geral)) return json.geral;
    return [];
  } catch (erro) {
    console.error('❌ Erro ao carregar mensagens:', erro.message);
    return [];
  }
}

function sortearMensagem(mensagens) {
  if (!mensagens.length) return null;
  const prioritarias = mensagens.filter(m => m.prioridade === true);
  if (prioritarias.length > 0) {
    const escolhida = prioritarias[Math.floor(Math.random() * prioritarias.length)];
    escolhida.prioridade = false; // só em memória
    return escolhida;
  }
  return mensagens[Math.floor(Math.random() * mensagens.length)];
}

// ---------------- PREÇOS / COPY ----------------
const ehPreco = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^(\s*R\$\s*)?\d{1,3}(\.\d{3})*(,\d{2}|\.\d{2})?$/.test(val.trim());
};
const S = (v) => (v ?? '').toString().trim();

function montarLegenda(p) {
  const nome = S(p.nome);
  const preco = S(p.preco);
  const precoDesc = S(p.preco_desconto);
  const link = S(p.link);
  const frete = S(p.frete_gratis);
  const fraseFrete =
    (frete === 'Sim' || frete === 'TRUE' || frete === 'true' || frete === 'Frete Grátis' || p.frete_gratis === true)
      ? '🚚 Frete Grátis' : '';

  const linhas = [];
  if (nome) linhas.push(`🏷️ <b>${nome}</b>`);

  const temPreco = ehPreco(preco);
  const descEhPreco = ehPreco(precoDesc);

  if (temPreco && descEhPreco) {
    linhas.push(`\n<s>${preco}</s>`);
    linhas.push(`💸 Agora por: <b>${precoDesc}</b>`);
  } else if (temPreco && precoDesc && !descEhPreco) {
    linhas.push(`\n${preco}`);
    linhas.push(precoDesc);
  } else if (temPreco && !precoDesc) {
    linhas.push(`\n${preco}`);
  } else if (!temPreco && descEhPreco) {
    linhas.push(`\n💸 Agora por: <b>${precoDesc}</b>`);
  } else if (!temPreco && precoDesc) {
    linhas.push(`\n${precoDesc}`);
  }

  if (fraseFrete) linhas.push(`\n${fraseFrete}`);
  if (link) linhas.push(`\n<a href="${link}">👉 Clique aqui para aproveitar</a>`);
  return linhas.filter(Boolean).join('\n');
}

// ---------------- IMAGEM & FALLBACK ----------------
function normalizarUrlImagem(url) {
  if (!url || typeof url !== 'string') return { ok: false, url: null, motivo: 'URL vazia' };
  let u = url.replace('https://raw.github.com/', 'https://raw.githubusercontent.com/');
  if (u.includes('imgur.com/a/') || u.includes('imgur.com/gallery/')) {
    return { ok: false, url: null, motivo: 'URL do Imgur é álbum/página (use i.imgur.com/arquivo.jpg)' };
  }
  if (u.includes('://imgur.com/') && !u.includes('://i.imgur.com/')) {
    return { ok: false, url: null, motivo: 'URL do Imgur não é direta (use i.imgur.com/ARQUIVO.jpg)' };
  }
  return { ok: true, url: u };
}

function variantesImgur(url) {
  // Gera variações .jpeg <-> .jpg <-> .png para i.imgur.com
  if (!url || !url.includes('i.imgur.com')) return [url];
  const semQuery = url.split('?')[0];
  const base = semQuery.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  return [
    url,                  // original
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.png`,
  ];
}

function cortarLegenda(caption, limite = 1024) {
  if (!caption) return '';
  return caption.length <= limite ? caption : caption.slice(0, limite - 1) + '…';
}

async function enviarComFotoOuFallback(url, caption) {
  try {
    await bot.sendPhoto(chatId, url, { caption, parse_mode: 'HTML', disable_web_page_preview: true });
    console.log(`✅ Foto enviada: ${url}`);
  } catch (erro) {
    const desc = erro?.response?.body?.description || erro.message || 'erro desconhecido';
    console.error(`❌ Erro ao enviar foto (${desc}). URL: ${url}`);
    await bot.sendMessage(chatId, caption, { parse_mode: 'HTML', disable_web_page_preview: true });
    console.log('ℹ️ Fallback de texto enviado.');
  }
}

async function enviarMensagem() {
  const mensagens = carregarMensagens();
  const m = sortearMensagem(mensagens);
  if (!m) {
    console.warn('⚠️ Nenhum produto disponível.');
    return;
  }

  const caption = cortarLegenda(montarLegenda(m), 1024);

  // prioriza caminho, depois imagem
  const original = S(m.caminho) || S(m.imagem);
  const norm = normalizarUrlImagem(original);

  if (original && norm.ok) {
    // tenta original e variações (apenas para i.imgur.com)
    const tentativas = variantesImgur(norm.url);
    for (let i = 0; i < tentativas.length; i++) {
      try {
        await bot.sendPhoto(chatId, tentativas[i], { caption, parse_mode: 'HTML', disable_web_page_preview: true });
        console.log(`✅ Foto enviada (tentativa ${i + 1}): ${tentativas[i]}`);
        return;
      } catch (erro) {
        const desc = erro?.response?.body?.description || erro.message || 'erro desconhecido';
        console.warn(`⚠️ Falha na tentativa ${i + 1} com ${tentativas[i]} -> ${desc}`);
        // se for a última tentativa, manda fallback texto
        if (i === tentativas.length - 1) {
          await bot.sendMessage(chatId, caption, { parse_mode: 'HTML', disable_web_page_preview: true });
          console.log('ℹ️ Fallback de texto enviado após falhas de imagem.');
        }
      }
    }
  } else {
    if (original && !norm.ok) {
      console.warn(`⚠️ Ignorando imagem inválida: ${norm.motivo} | URL: ${original}`);
    }
    await bot.sendMessage(chatId, caption, { parse_mode: 'HTML', disable_web_page_preview: true });
    console.log('✅ Mensagem (texto) enviada.');
  }
}

// ---------------- BOOT ----------------
console.log('🚀 Bot iniciado...');
console.log(`✅ CHAT_ID: ${chatId}`);
console.log(`🕒 Agora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
console.log('✅ Envio automático a cada 5 minutos.');

enviarMensagem();
setInterval(enviarMensagem, TEMPO_ENVIO);