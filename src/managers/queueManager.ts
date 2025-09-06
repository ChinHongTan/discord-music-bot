interface Song {
  url: string;
  title: string;
}

// 每個伺服器的歌曲隊列
export const queue = new Map<string, Song[]>();