import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { voiceConnections } from "../../managers/voiceManager.ts";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('跳過當前播放的歌曲。');

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

    // 獲取語音連接
    const connection = voiceConnections.get(interaction.guildId)?.connection;
    if (!connection) {
        await interaction.reply('機器人不在任何語音頻道中。');
        return;
    }

    const player = voiceConnections.get(interaction.guildId)?.player;
    if (!player) {
        await interaction.reply('目前沒有音樂在播放。');
        return;
    }

    console.log(voiceConnections);

    console.log(player.state);
    // 跳過當前歌曲
    const success = player.stop();
    if (success) {
        await interaction.reply('已跳過當前歌曲。');
    } else {
        await interaction.reply('無法跳過當前歌曲。');
    }
};
