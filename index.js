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
    // aceita tanto {geral:[...]} quanto lista simples
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
    // não persiste em disco; apenas marca em memória
    escolhida.prioridade = false;
    return escolhida;
    }
  return mensagens[Math.floor(Math.random() * mensagens.length)];
}

// ----- PREÇOS / COPY -----
const ehPreco = (val) => {
  if (!val || typeof val !== 'string') return false;
  // aceita "R$ 99,90" | "R$99.90" | "99,90" | "99.90"
  return /^(\s*R\$\s*)?\d{1,3}(\.\d{3})*(,\d{2}|\.\d{2})?$/.test(val.trim());
};
const S = (v) => (v ?? '').toString().trim();

function montarLegenda(p) {
  const nome = S(p.nome);
  const preco = S(p.preco);
  const precoDesc = S(p.preco_desconto);
  const link = S(p.link);
  const frete = S(p.frete_gratis);
  const fraseFrete = (
    frete === 'Sim' || frete === 'TRUE' || frete === 'true' || frete === 'Frete Grátis' || p.frete_gratis === true
  ) ? '🚚 Frete Grátis' : '';

  const linhas = [];
  if (nome) linhas.push(`🎯 <b>${nome}</b>`);

  const temPreco = ehPreco(preco);
  const descEhPreco = ehPreco(precoDesc);

  if (temPreco && descEhPreco) {
    // preço cheio + preço com desconto (ambos numéricos)
    linhas.push(`\n<s>${preco}</s>`);
    linhas.push(`💸 Agora por: <b>${precoDesc}</b>`);
  } else if (temPreco && precoDesc && !descEhPreco) {
    // preço cheio