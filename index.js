const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID || process.env.CHAT_ID_LIVRO;
const TEMPO_ENVIO = 5 * 60 * 1000; // 5 minutos
const JSON_PATH = './mensagens.json';

if (!token || !chatId) {
  console.error('❌ BOT_TOKEN/TELEGRAM_BOT_TOKEN ou CHAT_ID/CHAT_ID_LIVRO não definidos no .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

/* -------------------- JSON: carregar / normalizar / salvar -------------------- */
function carregarEstrutura() {
  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const json = JSON.parse(raw);

    // Se for um array simples, trata como { geral: [...], prioridade: [] }
    if (Array.isArray(json)) {
      return { geral: json, prioridade: [], _alterado: false };
    }

    const estrutura = {
      geral: Array.isArray(json.geral) ? json.geral : [],
      prioridade: Array.isArray(json.prioridade) ? json.prioridade : [],
      _alterado: false
    };

    // Se existir "prioritarios", junta em "prioridade" e limpa "prioritarios"
    if (Array.isArray(json.prioritarios) && json.prioritarios.length > 0) {
      estrutura.prioridade = [...estrutura.prioridade, ...json.prioritarios];
      estrutura._alterado = true;
    }

    return estrutura;
  } catch (err) {
    console.error('❌ Erro ao carregar mensagens:', err.message);
    return { geral: [], prioridade: [], _alterado: false };
  }
}

function salvarEstrutura(estrutura) {
  try {
    const toSave = {
      geral: estrutura.geral,
      prioridade: estrutura.prioridade
      // intencionalmente não salvamos "prioritarios"
    };
    fs.writeFileSync(JSON_PATH, JSON.stringify(toSave, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Erro ao salvar mensagens.json:', err.message);
  }
}

/* ------------------------- Sorteio e consumo ------------------------- */
function sortearEConsumir(estrutura) {
  // 1) Se existir prioritário, pega UM e remove do arquivo (consome)
  if (estrutura.prioridade.length > 0) {
    const idx = Math.floor(Math.random() * estrutura.prioridade.length);
    const escolhido = estrutura.prioridade.splice(idx, 1)[0]; // remove!
    salvarEstrutura(estrutura); // persiste remoção
    console.log(`⭐ Prioritário enviado. Restam ${estrutura.prioridade.length} prioritários.`);
    return escolhido;
  }

  // 2) Senão, sorteia da geral (não remove)
  if (estrutura.geral.length > 0) {
    return estrutura.geral[Math.floor(Math.random() * estrutura.geral.length)];
  }

  return null;
}

/* ---------------------- Util de strings/preços ----------------------- */
const S = (v) => (v ?? '').toString().trim();

/** Extrai número de preço aceitando , ou . como separador decimal */
function extrairNumeroPreco(str) {
  if (!str) return null;
  let s = String(str)
    .replace(/\s+/g, ' ')
    .replace(/R\$\s*/gi, '')      // remove R$
    .replace(/[^\d.,]/g, '');     // mantém dígitos, ponto e vírgula

  if (!s) return null;

  // . e , -> assume . milhar e , decimal
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
  } else if (s.includes(',')) {
    s = s.replace(',', '.'); // 63,78 -> 63.78
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function ehPreco(str) {
  return extrairNumeroPreco(str) !== null;
}

function fmtBR(n) {
  try {
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `R$ ${n}`;
  }
}

function normalizarRotuloPreco(str) {
  if (!str) return '';
  const n = extrairNumeroPreco(str);
  if (n === null) return S(str);  // não é número: é copy -> mantém
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

  if (temPreco && temDescPreco) {
    linhas.push(`\n<s>${preco}</s>`);
    linhas.push(`💸 Agora por: <b>${precoDesc}</b>`);
  } else if (temPreco && precoDesc && !temDescPreco) {
    linhas.push(`\n${preco}`);
    linhas.push(precoDesc);
  } else if (temPreco && !precoDesc) {
    linhas.push(`\n${preco}`);
  } else if (!temPreco && temDescPreco) {
    linhas.push(`\n💸 Agora por: <b>${precoDesc}</b>`);
  } else {
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

/* --------------------------- Envio principal -------------------------- */
async function enviarMensagem() {
  // Carrega e normaliza estrutura do JSON
  const estrutura = carregarEstrutura();

  // Se normalizou (ex.: merge de "prioritarios"), salva
  if (estrutura._alterado) {
    salvarEstrutura(estrutura);
  }

  // Sorteia e consome prioritário (se houver), senão usa geral
  const m = sortearEConsumir(estrutura);
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
