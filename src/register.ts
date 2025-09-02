// 加載斜槓指令

import { REST, Routes, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import 'dotenv/config';

import fs from 'node:fs';
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
	console.error('缺少必要的環境變量。');
	process.exit(1);
}

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[警告] ${filePath} 缺少 "data" 或 "execute" 属性。`);
		}
	}
}

const rest = new REST().setToken(TOKEN);

(async () => {
	try {
		console.log(`開始刷新 ${commands.length} 個應用程序 (/) 命令。`);
		const data = await rest.put(
			Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
			{ body: commands },
		) as RESTPostAPIApplicationCommandsJSONBody[];

		if (Array.isArray(data)) {
			console.log(`成功重新加載 ${data.length} 個應用程序 (/) 命令。`);
		} else {
			console.log('成功重新加載應用程序 (/) 命令。');
		}
	} catch (error) {
		console.error(error);
	}
})();