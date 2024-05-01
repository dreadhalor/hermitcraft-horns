import express from 'express';
import bodyParser from 'body-parser';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(bodyParser.json());

app.post('/api/extract-audio', async (req, res) => {
  try {
    const { videoUrl, start, end } = req.body;
    console.log('Request received:', { videoUrl, start, end });
    const outputFilename = await downloadAudioSlice(videoUrl, start, end);
    res.json({ outputFilename });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

async function downloadAudioSlice(
  videoUrl: string,
  start: number,
  end: number
): Promise<string> {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(videoInfo.formats, {
      quality: 'highestaudio',
    });
    const audioStream = ytdl(videoUrl, { format });

    const outputFilename = `media-output/audio_slice_${Date.now()}.mp3`;
    const duration = end - start;
    const timeStart = `${start}s`;
    const timeDuration = `${duration}s`;

    return new Promise((resolve, reject) => {
      ffmpeg(audioStream)
        .setStartTime(timeStart)
        .setDuration(timeDuration)
        .outputOptions('-acodec', 'libmp3lame')
        .output(outputFilename)
        .on('end', () => {
          console.log(`Audio slice saved to ${outputFilename}`);
          resolve(outputFilename);
        })
        .on('error', (err: Error) => {
          console.error('Error processing audio:', err);
          reject(err);
        })
        .run();
    });
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw error;
  }
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
