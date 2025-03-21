require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");

// Configuração do bot do Telegram
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Lista de mensagens com imagens armazenadas no Telegram
const mensagensAgendadas = [
    {
        chatId: process.env.CHAT_ID_LIVRO,
        horario: "15 18 * * 1", // Segunda-feira às 18:15
        mensagem: `📚 **Nada Pode Me Ferir** - David Goggins\n\n🔥 Um livro sobre superar desafios e dominar sua mente.\n\n👉 [Compre aqui](https://amzn.to/3EJjw0B)`,
        imagem: "AgACAgQAAxkBAAICJ2..." // Substitua pelo File ID da imagem
    },
    {
        chatId: process.env.CHAT_ID_LIVRO,
        horario: "15 18 * * 2", // Terça-feira às 18:15
        mensagem: `💰 **O Homem Mais Rico da Babilônia** - George S. Clason\n\n📖 Lições atemporais sobre dinheiro, que também servem para investir em sua carreira de programador.\n\n👉 [Compre aqui](https://amzn.to/3WYYy4p)`,
        imagem: "AgACAgQAAxkBAAICJ3..." // Outro File ID
    }
];

// Agendando o envio das mensagens com imagens do Telegram
mensagensAgendadas.forEach(({ chatId, horario, mensagem, imagem }) => {
    cron.schedule(
        horario,
        () => {
            bot.sendPhoto(chatId, imagem, { caption: mensagem })
                .then(() => console.log(`✅ Mensagem enviada para ${chatId}`))
                .catch(err => console.error(`❌ Erro ao enviar mensagem:`, err));
        },
        {
            timezone: "America/Sao_Paulo",
        }
    );
});

// Mensagem de inicialização
console.log("✅ Bot do Telegram está rodando no Railway!");
