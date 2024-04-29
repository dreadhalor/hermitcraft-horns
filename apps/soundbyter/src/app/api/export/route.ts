import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const { videoUrl, startTime, endTime } = await request.json();

  try {
    // Download the video using ytdl-core
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });
    const tempVideoPath = path.join(process.cwd(), 'temp', 'video.mp4');
    const writeStream = fs.createWriteStream(tempVideoPath);

    await new Promise((resolve, reject) => {
      videoStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const outputPath = path.join(process.cwd(), 'public', 'exported.mp4');

    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Clean up the temporary video file
    fs.unlinkSync(tempVideoPath);

    return NextResponse.json({ url: '/exported.mp4' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during video export' },
      { status: 500 }
    );
  }
}
