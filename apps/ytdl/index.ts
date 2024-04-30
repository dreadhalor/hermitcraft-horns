import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const outputFilename = 'audio_slice.mp3';
const timeStart = '00:00:10'; // Start time in HH:MM:SS format
const timeDuration = '00:00:05'; // Duration in HH:MM:SS format

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
