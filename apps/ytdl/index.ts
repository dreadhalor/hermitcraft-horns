import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const videoUrl = 'https://www.youtube.com/watch?v=IM-Z6hJb4E4';
const outputFilename = 'media-output/audio_slice.mp3';
const start = 1149;
const end = 1155;
const duration = end - start;
const timeStart = `${start}s`; // Start time in HH:MM:SS format
const timeDuration = `${duration}s`; // Duration in HH:MM:SS format

async function downloadAudioSlice() {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(videoInfo.formats, {
      quality: 'highestaudio',
    });

    const audioStream = ytdl(videoUrl, { format });

    ffmpeg(audioStream)
      .setStartTime(timeStart)
      .setDuration(timeDuration)
      .outputOptions('-acodec', 'libmp3lame')
      .output(outputFilename)
      .on('end', () => {
        console.log(`Audio slice saved to ${outputFilename}`);
      })
      .on('error', (err: Error) => {
        console.error('Error processing audio:', err);
      })
      .run();
  } catch (error) {
    console.error('Error downloading audio:', error);
  }
}

downloadAudioSlice();
