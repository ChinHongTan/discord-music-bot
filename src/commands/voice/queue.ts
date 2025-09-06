import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { queue } from "../../managers/queueManager.ts";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('檢查當前播放的歌曲隊列。');

// 主要的執行函數
export const execute = async (interaction: CommandInteraction) => {
    if (!interaction.guildId) {
        await interaction.reply('此命令只能在伺服器中使用。');
        return;
    }

    if (!interaction.member || !('voice' in interaction.member) || !interaction.member.voice.channel) {
        await interaction.reply('你需要在一個語音頻道中才能使用此命令。');
        return;
    }

    const serverQueue = queue.get(interaction.guildId);
    if (!serverQueue || serverQueue.length === 0) {
        await interaction.reply('目前沒有歌曲在隊列中。');
        return;
    }

    const queueMessage = serverQueue.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    await interaction.reply(`當前歌曲隊列:\n${queueMessage}`);
}
