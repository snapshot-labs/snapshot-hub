import Discord from 'discord.js';

const client = new Discord.WebhookClient(process.env.DISCORD_HOOK_ID, process.env.DISCORD_HOOK_TOKEN);

export const sendMessage = message => {
  try {
    client.send(message);
  } catch (e) {
    console.error(e);
  }
};

export default client;
