import Discord from 'discord.js';

const token = process.env.DISCORD_TOKEN || '';
const channel = process.env.DISCORD_CHANNEL || '814466963047841792';
let lastMessage;
const client: any = new Discord.Client();
let speaker;

client.on('ready', () => {
  // @ts-ignore
  console.log(`Discord bot logged as "${client.user.tag}"`);
  speaker = client.channels.cache.get(channel);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

if (token) client.login(token);

export const sendMessage = message => {
  if (!token) return;
  try {
    if (speaker) return speaker.send(message);
    console.log(`Missing bot message: ${message}`);
    return false;
  } catch (e) {
    console.log(e);
  }
};

export const editLastMessage = message => {
  if (client.user.lastMessage) lastMessage = client.user.lastMessage;
  if (lastMessage) return lastMessage.edit(message);
  return sendMessage(message);
};

export const setActivity = message => {
  try {
    client.user.setActivity(message, { type: 'WATCHING' });
  } catch (e) {
    console.log(e);
  }
};

export default client;
