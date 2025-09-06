import { VoiceConnection, AudioPlayer } from "@discordjs/voice";

export const voiceConnections = new Map<string, { connection: VoiceConnection, player?: AudioPlayer }>();