const fs = require('fs');
const ytdl = require('ytdl-core');

const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const outputFilename = 'video.mp4';

async function downloadVideo() {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(videoInfo.formats, {
      quality: 'highestvideo',
      filter: 'audioandvideo',
    });

    const videoStream = ytdl(videoUrl, { format, begin: '10s' });
    const writeStream = fs.createWriteStream(outputFilename);

    videoStream.pipe(writeStream);

    writeStream.on('finish', () => {
      console.log('Video downloaded successfully!');
    });
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

downloadVideo();
