import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, StreamType, VoiceConnection } from "@discordjs/voice";
import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { connectToVoiceChannel } from "./join.ts";
import ytdl from "@distube/ytdl-core";
import { Readable } from "stream";
import { YouTube } from "youtube-sr";
import { voiceConnections } from "../../managers/voiceManager.ts";
import { queue } from "../../managers/queueManager.ts";

// 定義指令的數據結構
export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('播放一首歌。')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('搜索關鍵字或YouTube網址')
      .setAutocomplete(true)
      .setRequired(true));

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
    const connection = voiceConnections.get(interaction.guildId)?.connection || await connectToVoiceChannel(interaction.member.voice.channel);

    if (!connection) {
        await interaction.editReply('無法加入語音頻道。');
        return;
    }

    const query = interaction.options.getString('query');
    if (!query) {
        await interaction.editReply('請提供一個YouTube網址或搜索關鍵字。');
        return;
    }

    let songUrl: string = '';
    let songTitle: string = '';
    let songArtist: string = '';
    let songThumbnail: string = '';

    // 檢查是否為有效的YouTube網址
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (youtubeRegex.test(query)) {
        // 處理YouTube網址
        songUrl = query;
    } else {
        // 使用關鍵字搜索YouTube
        const result = await YouTube.searchOne(query);

        if (!result || !result.url) {
            await interaction.editReply('找不到相關的歌曲。');
            return;
        }

        songUrl = result.url;
        songTitle = result.title || songUrl;
        songArtist = result.channel?.name || '未知';
        songThumbnail = result.thumbnail?.url || '';
    }

    // 使用ytdl獲取音頻流
    const songStream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });

    const player = createAudioPlayer();

    try {
        // 把歌曲加入隊列
        const serverQueue = queue.get(interaction.guildId) || [];
        serverQueue.push({ url: songUrl, title: songTitle, artist: songArtist, thumbnail: songThumbnail });
        queue.set(interaction.guildId, serverQueue);

        await interaction.editReply(`已將歌曲加入隊列: [${songTitle}](${songUrl})`);

        // 當隊列中只有這首歌時，開始播放
        if (serverQueue.length === 1) {
            await playSong(interaction, connection, player, songStream, { title: songTitle, artist: songArtist, thumbnail: songThumbnail }, songUrl);
        }

        // 處理歌曲結束事件
        player.on(AudioPlayerStatus.Idle, async () => {
            if (!interaction.guildId) return;
            const currentQueue = queue.get(interaction.guildId);
            if (currentQueue) {
                currentQueue.shift(); // 移除已播放的歌曲
                if (currentQueue.length > 0) {
                    // 播放下一首歌
                    const nextSong = currentQueue[0];
                    if (nextSong && nextSong.url) {
                        const nextSongStream = ytdl(nextSong.url, { filter: 'audioonly', quality: 'highestaudio' });
                        await playSong(interaction, connection, player, nextSongStream, { title: nextSong.title, artist: nextSong.artist, thumbnail: nextSong.thumbnail }, nextSong.url);
                    }
                } else {
                    // 隊列為空，清理資源
                    voiceConnections.delete(interaction.guildId);
                    queue.delete(interaction.guildId);
                    connection.destroy();
                }
            }
        });
    } catch (error) {
        console.error('播放音樂時出錯:', error);
        await interaction.editReply('無法播放音樂。');
    }
};

export const autocomplete = async (interaction: AutocompleteInteraction) => {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) return;

    const results = await YouTube.getSuggestions(focusedValue);

    await interaction.respond(results.map(result => ({ name: result, value: result })));
};

async function playSong(interaction: ChatInputCommandInteraction, connection: VoiceConnection, player: AudioPlayer, songStream: Readable, metadata: { title: string, artist?: string, thumbnail?: string }, songUrl?: string) {
    console.log(`正在播放歌曲: ${metadata.title}`);
    const resource = createAudioResource(songStream, {
        inputType: StreamType.Arbitrary,
    });
    
    // 播放資源
    player.play(resource);

    connection.subscribe(player);

    // 儲存播放器實例
    voiceConnections.set(connection.joinConfig.guildId, {
        connection,
        player
    });

    // 顯示播放embed
    const playEmbed = new EmbedBuilder()
        .setTitle(`正在播放`)
        .setDescription(`[${metadata.title}](${songUrl})`)
        .setColor('#FF0000')
        .addFields(
            { name: '作者', value: metadata.artist || '未知', inline: false },
            { name: '剩餘歌曲', value: `${(queue.get(connection.joinConfig.guildId)?.length || 1) - 1}`, inline: true },
            { name: '下一首歌曲', value: queue.get(connection.joinConfig.guildId)?.[1]?.title || '無', inline: true }
        );

    if (metadata.thumbnail && /^https?:\/\/.+\..+/.test(metadata.thumbnail)) {
        playEmbed.setThumbnail(metadata.thumbnail);
    }

    // 發送embed到當前頻道
    const channel = interaction.channel;
    if (channel && channel.isTextBased()) {
        (channel as import("discord.js").TextChannel).send({ embeds: [playEmbed] });
    }

    // 確保播放器進入播放狀態
    return entersState(player, AudioPlayerStatus.Playing, 5_000);
}