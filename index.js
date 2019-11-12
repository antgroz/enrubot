const Telegraph = require('telegraf');

// Languages

class Lang {
    constructor(keys) {
        this.direct = new Map();
        keys.split('').forEach((element, index) => this.direct.set(element, index));
        this.reverse = new Map();
        for (let [key, value] of this.direct.entries()) {
            this.reverse.set(value, key);
        };
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

const enKeys = '`~1!2@3#4$5%6^7&8*9(0)-_=+qQwWeErRtTyYuUiIoOpP[{]}aAsSdDfFgGhHjJkKlL;:\'\"\\|zZxXcCvVbBnNmM,<.>/?';
const ruKeys = 'ёЁ1!2"3№4;5%6:7?8*9(0)-_=+йЙцЦуУкКеЕнНгГшШщЩзЗхХъЪфФыЫвВаАпПрРоОлЛдДжЖэЭ\\/яЯчЧсСмМиИтТьЬбБюЮ.,';

const RU = new Lang(ruKeys);
const EN = new Lang(enKeys);

function layoutSwitch(input) {
    return input
        .split('')
        .map((element) => EN.getIndex(element))
        .map((element) => RU.getChar(element))
        .join('');
}

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

let msgTracker = 0;
let msgCurrent = 0;
let msg = "";
const allRegEx = new RegExp('.*');

bot.command('/switch', (ctx) => {
    msgTracker = ctx.message.message_id;
    ctx.reply('Send the text for switching or reply to anything you would like to switch');
});

bot.help((ctx) => {
    ctx.reply('I can only do one thing. I switch the keyboard layouts of messages. For that, send /switch');
});

bot.on('message', (ctx) => {
    msgCurrent = ctx.message.message_id;
    if (msgCurrent === msgTracker + 2) {
        if (typeof ctx.message.reply_to_message !== "undefined") {
            msg = ctx.message.reply_to_message.text;
        }
        else {
            msg = ctx.message.text;
        }
        ctx.reply(layoutSwitch(msg));
    }
});

bot.telegram.setWebhook('https://enrubot.herokuapp.com/');
bot.startWebhook('/', null, process.env.PORT);