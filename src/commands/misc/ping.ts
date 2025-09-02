import { CommandInteraction, SlashCommandBuilder } from "discord.js";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('檢查機器人延遲。');

// 主要的執行函數
export const execute = async (interaction: CommandInteraction) => {
    const start = Date.now();
    await interaction.reply('Pinging...');
    const end = Date.now();
    await interaction.editReply(`Pong! 延遲: ${end - start}ms`);
};
