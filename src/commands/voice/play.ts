import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, StreamType, VoiceConnection } from "@discordjs/voice";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { connectToVoiceChannel } from "./join.ts";
import ytdl from "@distube/ytdl-core";
import { Readable } from "stream";
import { YouTube } from "youtube-sr";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('播放一首歌。')
  .addStringOption(option =>
    option.setName('url')
      .setDescription('搜索關鍵字或YouTube網址')
      .setRequired(false));

// 主要的執行函數
export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
        await interaction.reply('此命令只能在伺服器中使用。');
        return;
    }

    if (!interaction.member || !('voice' in interaction.member) || !interaction.member.voice.channel) {
        await interaction.reply('你需要在一個語音頻道中才能使用此命令。');
        return;
    }

    interaction.deferReply();
    // 加入語音頻道
    const connection = await connectToVoiceChannel(interaction.member?.voice.channel);

    if (!connection) {
        await interaction.editReply('無法加入語音頻道。');
        return;
    }

    const url = interaction.options.getString('url');
    if (!url) {
        await interaction.editReply('請提供一個YouTube網址或搜索關鍵字。');
        return;
    }

    let songUrl: string = '';

    // 檢查是否為有效的YouTube網址
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (youtubeRegex.test(url)) {
        // 處理YouTube網址
        songUrl = url;
    } else {
        // 使用關鍵字搜索YouTube
        const result = await YouTube.searchOne(url);

        if (!result || !result.url) {
            await interaction.editReply('找不到相關的歌曲。');
            return;
        }

        songUrl = result.url;
    }

    const songStream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio' });

    const player = createAudioPlayer();

    try {
        await playSong(connection, player, songStream);
        await interaction.editReply(`正在播放: ${songUrl}`);
    } catch (error) {
        console.error('播放音樂時出錯:', error);
        await interaction.editReply('無法播放音樂。');
    }
};
async function playSong(connection: VoiceConnection, player: AudioPlayer, songUrl: Readable) {
    console.log(`正在播放歌曲: ${songUrl}`);
    const resource = createAudioResource(songUrl, {
        inputType: StreamType.Arbitrary,
    });
    
    // 播放資源
    player.play(resource);

    connection.subscribe(player);

    // 確保播放器進入播放狀態
    return entersState(player, AudioPlayerStatus.Playing, 5_000);

}