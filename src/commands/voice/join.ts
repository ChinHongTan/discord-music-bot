import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import type { VoiceBasedChannel } from "discord.js";
import { entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice"

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('加入')
  .setDescription('加入語音頻道');

// 主要的執行函數
export const execute = async (interaction: CommandInteraction) => {
    const member = interaction.member;
    if (!member || !('voice' in member) || !member.voice.channel) {
        await interaction.reply('你需要在一個語音頻道中才能使用此命令。');
        return;
    }
    interaction.deferReply();
    const channel = member.voice.channel;

    const connection = await connectToVoiceChannel(channel);
    if (!connection) {
        await interaction.editReply('無法加入語音頻道。');
        return;
    }

    await interaction.editReply(`已加入 ${channel.name}`);
};

async function connectToVoiceChannel(channel: VoiceBasedChannel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    try {
        console.log(`正在連接到 ${channel.name} 的語音頻道...`);
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        return connection;
    } catch (error) {
        connection.destroy();
        console.error(error);
    }
}