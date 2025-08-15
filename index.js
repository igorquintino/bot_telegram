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

/* ------------ Load JSON (prioriza prioridade/prioritarios) ------------ */
function carregarMensagens() {
  try {
    const raw = fs.readFileSync('./mensagens.json', 'utf8');
    const json = JSON.parse(raw);

    if (Array.isArray(json)) {
      return { prioridade: [], geral: json };
    }

    const prioridade = [
      ...(json.prioridade || []),
      ...(json.prioritarios || []),
    ];
    const geral = json.geral || [];

    return { prioridade, geral };
  } catch (erro) {
    console.error('❌ Erro ao carregar mensagens:', erro.message);
    return { prioridade: [], geral: [] };
  }
}

function sortearMensagem(listas) {
  const { prioridade, geral } = listas;
  const pool = prioridade.length ? prioridade : geral;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------------------- Util de strings/preços ----------------------- */
const S = (v) => (v ?? '').toString().trim();

/** Tenta extrair um número decimal da string (aceita , ou . como separador). */
function extrairNumeroPreco(str) {
  if (!str) return null;
  let s = String(str)
    .replace(/\s+/g, ' ')
    .replace(/R\$\s*/gi, '')     // remove todos R$
    .replace(/[^\d.,]/g, '');    // mantém só dígitos, ponto e vírgula

  if (!s) return null;

  // Se tiver tanto . quanto , assume que . é milhar e , é decimal (pt-BR)
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
  } else if (s.includes(',')) {
    // Só vírgula -> decimal pt-BR
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** É preço se consigo extrair número. */
function ehPreco(str) {
  return extrairNumeroPreco(str) !== null;
}

/** Formata número em pt-BR com R$ */
function fmtBR(n) {
  try {
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `R$ ${n}`;
  }
}

/** Normaliza rótulo: corrige "R$ R$ 388,00" -> "R$ 388,00" */
function normalizarRotuloPreco(str) {
  if (!str) return '';
  // Limpa duplicidades de R$ e espaços, mas preserva caso seja copy (sem número)
  const n = extrairNumeroPreco(str);
  if (n === null) {
    // Não é número -> provavelmente copy; devolve como veio (trim)
    return S(str);
  }
  return fmtBR(n);
}

/* ----------------------- Montagem da legenda ------------------------- */
function montarLegenda(p) {
  const nome = S(p.nome);
  const precoRaw = S(p.preco);
  const precoDescRaw = S(p.preco_desconto);
  const link = S(p.link);
  const frete = S(p.frete_gratis);

  const temPreco = ehPreco(precoRaw);
  const temDescPreco = ehPreco(precoDescRaw);

  const preco = temPreco ? normalizarRotuloPreco(precoRaw) : S(precoRaw);
  const precoDesc = temDescPreco ? normalizarRotuloPreco(precoDescRaw) : S(precoDescRaw);

  const fraseFrete =
    (frete === 'Sim' || frete === 'TRUE' || frete === 'true' || frete === 'Frete Grátis' || p.frete_gratis === true)
      ? '🚚 Frete Grátis' : '';

  const linhas = [];
  if (nome) linhas.push(`🏷️ <b>${nome}</b>`);

  // Casos:
  // 1) Ambos são preço -> risca o cheio, põe o com desconto
  if (temPreco && temDescPreco) {
    linhas.push(`\n<s>${preco}</s>`);
    linhas.push(`💸 Agora por: <b>${precoDesc}</b>`);
  }
  // 2) Cheio é preço e "desconto" é copy -> mostra o preço e a copy
  else if (temPreco && precoDesc && !temDescPreco) {
    linhas.push(`\n${preco}`);
    linhas.push(precoDesc);
  }
  // 3) Só preço cheio -> mostra só ele
  else if (temPreco && !precoDesc) {
    linhas.push(`\n${preco}`);
  }
  // 4) Cheio não é preço, desconto é preço -> mostra só o desconto como preço
  else if (!temPreco && temDescPreco) {
    linhas.push(`\n💸 Agora por: <b>${precoDesc}</b>`);
  }
  // 5) Nenhum é preço -> se houver algum texto, mostra
  else {
    if (preco) linhas.push(`\n${preco}`);
    if (precoDesc) linhas.push(preco ? precoDesc : `\n${precoDesc}`);
  }

  if (fraseFrete) linhas.push(`\n${fraseFrete}`);
  if (link) linhas.push(`\n<a href="${link}">👉 Clique aqui para aproveitar</a>`);

  return linhas.filter(Boolean).join('\n');
}

/* --------------------- Imagem + fallback texto ---------------------- */
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
  if (!url || !url.includes('i.imgur.com')) return [url];
  const semQuery = url.split('?')[0];
  const base = semQuery.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  return [url, `${base}.jpg`, `${base}.jpeg`, `${base}.png`];
}

function cortarLegenda(caption, limite = 1024) {
  if (!caption) return '';
  return caption.length <= limite ? caption : caption.slice(0, limite - 1) + '…';
}

async function enviarMensagem() {
  const listas = carregarMensagens();
  const m = sortearMensagem(listas);
  if (!m) {
    console.warn('⚠️ Nenhum produto disponível.');
    return;
  }

  const caption = cortarLegenda(montarLegenda(m), 1024);

  const original = S(m.caminho) || S(m.imagem);
  const norm = normalizarUrlImagem(original);

  if (original && norm.ok) {
    const tentativas = variantesImgur(norm.url);
    for (let i = 0; i < tentativas.length; i++) {
      try {
        await bot.sendPhoto(chatId, tentativas[i], {
          caption,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        console.log(`✅ Foto enviada (tentativa ${i + 1}): ${tentativas[i]}`);
        return;
      } catch (erro) {
        const desc = erro?.response?.body?.description || erro.message || 'erro desconhecido';
        console.warn(`⚠️ Falha ao enviar foto (tentativa ${i + 1}): ${desc}`);
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

/* -------------------------- Boot loop -------------------------- */
console.log('🚀 Bot iniciado...');
console.log(`✅ CHAT_ID: ${chatId}`);
console.log(`🕒 Agora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
console.log('✅ Envio automático a cada 5 minutos.');

enviarMensagem();
setInterval(enviarMensagem, TEMPO_ENVIO);
