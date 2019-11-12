const Telegraph = require('telegraf');
const enDict = require('wordlist-english')['english'];
const ruDict = require('wordlist-russian')['russian'];

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

const RU = new Lang(ruKeys, ruDict);
const EN = new Lang(enKeys, enDict);

// Useful functions

const notWordRegEx = new RegExp('(?![-А-я ])');

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
        .replace(notWordRegEx, '')
        .split(' ');
}

// Telegram bot

const token = process.env.BOT_TOKEN;
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


let msgTracker = {};

bot.command('/switch', (ctx) => {
    msgTracker[ctx.chat.id] = ctx.message.message_id;
    ctx.reply('Send a message for correction or reply to anything you would like to correct');
});

bot.command('/start', (ctx) => {
    ctx.reply('Hi! I will automatically correct the keyboard layout of all the messages here. You can also use' +
        '/switch to ask me to correct anything without analyzing the text');
});

bot.help((ctx) => {
    ctx.reply('I can only do one thing. I correct messages by switching their keyboard, automatically or with a' +
        '/switch');
});

const ruRegEx = new RegExp('[А-я]');

bot.on('message', (ctx) => {
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
            ctx.telegram.sendMessage(chatId, mapped, {reply_to_message_id: msgId});
        }
        else {
            msg = ctx.message.text;
            const onlyEn = !ruRegEx.test(msg);
            if (onlyEn) {
                let isValid = false;
                const msgWords = words(msg);
                for (const element of msgWords) {
                    if (EN.dict.indexOf(element) !== -1 && element.length >= 3) {
                        isValid = true;
                        break;
                    }
                }
                if (!isValid) {
                    const mapped = layoutSwitch(msg);
                    const mapWords = words(mapped);
                    let match = false;
                    for (const element of mapWords) {
                        if (RU.dict.indexOf(element) !== -1 && element.length >= 3) {
                            match = true;
                            break;
                        }
                    }
                    if (match) {
                        ctx.telegram.sendMessage(chatId, mapped, {reply_to_message_id: msgId});
                    }
                }
            }
        }
    }
});

bot.telegram.setWebhook('https://enrubot.herokuapp.com/');
bot.startWebhook('/', null, process.env.PORT);