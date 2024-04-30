const fs = require('fs');
const cp = require('child_process');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');

const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const outputFilename = 'video_slice.mp4';
const timeStart = '00:00:10'; // Start time in HH:MM:SS format
const timeDuration = '00:00:05'; // Duration in HH:MM:SS format

async function downloadVideoSlice() {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(videoInfo.formats, {
      quality: 'highestvideo',
      filter: 'audioandvideo',
    });

    const videoStream = ytdl(videoUrl, { format });
    const tempFilename = 'temp_video.mp4';
    const tempWriteStream = fs.createWriteStream(tempFilename);

    videoStream.pipe(tempWriteStream);

    tempWriteStream.on('finish', () => {
      const ffmpegProcess = cp.spawn(ffmpeg, [
        '-y',
        '-v',
        'error',
        '-i',
        tempFilename,
        '-ss',
        timeStart,
        '-t',
        timeDuration,
        '-c',
        'copy',
        outputFilename,
      ]);

      ffmpegProcess.on('close', () => {
        fs.unlinkSync(tempFilename); // Remove the temporary file
        console.log(`Video slice saved to ${outputFilename}`);
      });
    });
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

downloadVideoSlice();
