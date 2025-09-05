import { getVoiceConnection } from "@discordjs/voice";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('讓機器人離開語音頻道。');

// 主要的執行函數
export const execute = async (interaction: CommandInteraction) => {
    if (!interaction.guildId) {
        await interaction.reply('此命令只能在伺服器中使用。');
        return;
    }
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
        await interaction.reply('機器人不在任何語音頻道中。');
        return;
    }
    connection.destroy();
    await interaction.reply('已離開語音頻道。');
};
