import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import 'dotenv/config';
import * as fs from 'fs';
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 擴展 Client 類型以包含 commands 屬性
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

// 動態加載指令
const foldersPath = path.join(__dirname, 'commands')
const commandFolders = fs.readdirSync(foldersPath);


for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`已從 ${filePath} 中加載指令 ${command.data.name}`);
        } else {
            console.log(`[警告] ${filePath} 缺少 "data" 或 "execute" 属性。`);
        }
    }
}

client.on(Events.ClientReady, readyClient => {
  console.log(`已登錄為 ${readyClient.user.tag}!`);
});

// 事件處理
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`[錯誤] 找不到與 ${interaction.commandName} 匹配的命令。`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: '執行此命令時發生錯誤！', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: '執行此命令時發生錯誤！', flags: MessageFlags.Ephemeral });
		}
	}
});

client.login(TOKEN);