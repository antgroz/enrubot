const Telegraph = require('telegraf');
const enDict = require('wordlist-english')['english'];
// const ruDict = require('wordlist-russian')['russian'];

// Languages

class Lang {
    constructor(keys, dict) {
        this.direct = new Map();
        keys.split('').forEach((element, index) => this.direct.set(element, index));

        this.reverse = new Map();
        for (let [key, value] of this.direct.entries()) {
            this.reverse.set(value, key);
        }

        this.dict = dict;
    }

    getIndex(char) {
        if (this.direct.has(char)) {
            return this.direct.get(char);
        }
        else {
            return char;
        }
    }

    getChar(index) {
        if (this.reverse.has(index)) {
            return this.reverse.get(index);
        }
        else {
            return index;
        }
    }
}

const enKeys = '`~1!2@3#4$5%6^7&8*9(0)-_=+qQwWeErRtTyYuUiIoOpP[{]}aAsSdDfFgGhHjJkKlL;:\'\"\\|zZxXcCvVbBnNmM,<.>/?'
    , ruKeys = 'ёЁ1!2"3№4;5%6:7?8*9(0)-_=+йЙцЦуУкКеЕнНгГшШщЩзЗхХъЪфФыЫвВаАпПрРоОлЛдДжЖэЭ\\/яЯчЧсСмМиИтТьЬбБюЮ.,';

const RU = new Lang(ruKeys, );
const EN = new Lang(enKeys, enDict);

// Useful functions

// const notWordRegEx = new RegExp('[^-А-я ]');

function layoutSwitch(input) {
    return input
        .split('')
        .map((element) => EN.getIndex(element))
        .map((element) => RU.getChar(element))
        .join('');
}

function words(text) {
    return text
        .toLocaleLowerCase(['en', 'ru'])
        // .replace(notWordRegEx, '')
        .split(' ');
}

// Telegram bot

const token = process.env.BOT_TOKEN;
// const token = '872047189:AAHnlSkBO_lttaxCUmWdb5nBZkXyde8UjTw';
const bot = new Telegraph(token);

bot.on('inline_query', (ctx) => {
    const query = ctx.inlineQuery.query;
    if (query.length > 0) {
        const mapped = layoutSwitch(query);
        const result = [{
            type: 'article',
            id: Math.random() * Math.pow(10, 8),
            title: 'Switched layout',
            description: mapped,
            input_message_content: {
                message_text: mapped,
            },
        }];
        return ctx.answerInlineQuery(result);
    } else {
        return ctx.answerInlineQuery([]);
    }
});


let msgTracker = {},
    onTracker = {},
    lastTracker = {};

bot.command('/switch', async (ctx) => {
    const chatId = ctx.chat.id;
    msgTracker[chatId] = ctx.message.message_id;
    const sent = await ctx.reply('Send a message for correction or reply to anything you would like to correct');
    lastTracker[chatId] = sent.message_id;
});

bot.command('/start', async (ctx) => {
    const chatId = ctx.chat.id;
    const sent = await ctx.reply('Hi! I will automatically correct the keyboard layout of all the messages ' +
        'here. To know more, send /help');
    onTracker[chatId] = true;
    lastTracker[chatId] = sent.message_id;
});

bot.help(async (ctx) => {
    const chatId = ctx.chat.id;
    const sent = await ctx.reply('I can only do one thing. I correct messages by switching their keyboard ' +
        'layout. Here are the commands:\n\n/on Turn the automatic correction mode on\n/off ' +
        'Turn the automatic correction mode off\n/switch Initiate a dialog with me to manually correct a message\n' +
        '/delete Instruct me to remove my last immediate message here\n/help Display this message');
    lastTracker[chatId] = sent.message_id;
});

bot.command('/on', async (ctx) => {
    const chatId = ctx.chat.id;
    onTracker[chatId] = true;
    const sent = await ctx.telegram.sendMessage(chatId,'Automatic mode is `on`. Now go on and flood',
        {parse_mode: "Markdown"});
    lastTracker[chatId] = sent.message_id;
    console.log(lastTracker[chatId]);
});

bot.command('/off', async (ctx) => {
    const chatId = ctx.chat.id;
    onTracker[chatId] = false;
    const sent = await ctx.telegram.sendMessage(chatId,'Automatic mode is `off`. I\'m tired',
        {parse_mode: "Markdown"});
    lastTracker[chatId] = sent.message_id;
});

bot.command('/delete', async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(ctx.message.message_id);
    if (lastTracker.hasOwnProperty(chatId)) {
        if (ctx.message.message_id == lastTracker[chatId] + 1) {
            const del = await ctx.telegram.deleteMessage(chatId,lastTracker[chatId]);
            console.log(del);
        }
    }
    else {
        const sent = await ctx.reply('This is my first message here that I know of');
        lastTracker[chatId] = sent.message_id;
    }
});

validation = (words) => {
    const thresh = 20;
    const lenParam = 3;
    let bool = false;
    if (words.length > thresh) {
        for (let i = 0; i < thresh; ++i) {
            let t = words[Math.floor(Math.random() * words.length)];
            if (t.length <= lenParam || EN.dict.indexOf(t) === -1) {
                bool = bool || false;
            }
            else {
                bool = bool || true;
                break;
            }
        }
    }
    else {
        for (const t of words) {
            if (t.length <= lenParam || EN.dict.indexOf(t) === -1) {
                bool = bool || false;
            }
            else {
                bool = bool || true;
                break;
            }
        }
    }
    return bool;
};

const ruRegEx = new RegExp('[А-я]');

bot.on('message', async (ctx) => {
    if (typeof ctx.message.text !== 'undefined') {
        const chatId = ctx.chat.id;
        const msgId = ctx.message.message_id;
        let msg = '';
        if (msgId === msgTracker[chatId] + 2) {
            if (typeof ctx.message.reply_to_message !== 'undefined') {
                msg = ctx.message.reply_to_message.text;
            } else {
                msg = ctx.message.text;
            }
            const mapped = layoutSwitch(msg);
            const sent = await ctx.telegram.sendMessage(chatId, mapped, {reply_to_message_id: msgId});
            lastTracker[chatId] = sent.message_id;
        }
        else if (onTracker[chatId]) {
            msg = ctx.message.text;
            const onlyEn = !ruRegEx.test(msg);
            if (onlyEn) {
                const msgWords = words(msg);
                const isValid = validation(msgWords);
                if (!isValid) {
                    // const mapped = layoutSwitch(msg);
                    // const mapWords = words(mapped);
                    // let match = false;
                    // for (const element of mapWords) {
                    //     if (RU.dict.indexOf(element) !== -1 && element.length >= 3) {
                    //         match = true;
                    //         break;
                    //     }ow go on and flood
                    // }
                    // if (match) {
                        const sent = await ctx.telegram.sendMessage(chatId, layoutSwitch(msg),
                            {reply_to_message_id: msgId});
                        lastTracker[chatId] = sent.message_id;
                    // }
                }
            }
        }
    }
});

bot.telegram.setWebhook('https://enrubot.herokuapp.com/');
bot.startWebhook('/', null, process.env.PORT);
// bot.launch();