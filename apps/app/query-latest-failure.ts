import postgres from 'postgres';

const DATABASE_URL = 'postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require';

async function queryLatest() {
  const sql = postgres(DATABASE_URL);
  
  try {
    // Get the absolute latest failed request from production user
    const [latest] = await sql`
      SELECT *
      FROM "generationLogs" 
      WHERE "userId" = 'user_2gbjlQQWoLD5IM34f4fuugMdOk6'
        AND "status" = 'failed'
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;
    
    if (!latest) {
      console.log('❌ No failed requests found');
      return;
    }
    
    console.log('📊 Latest Failed Production Request');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🆔 Request ID:', latest.id);
    console.log('📹 Video URL:', latest.videoUrl);
    console.log('⏱️  Start:', latest.start, 'seconds');
    console.log('⏱️  End:', latest.end, 'seconds');
    console.log('👤 User ID:', latest.userId);
    console.log('📡 Source:', latest.source);
    console.log('❌ Status:', latest.status);
    console.log('📅 Created:', new Date(latest.createdAt).toLocaleString());
    console.log('');
    console.log('🔍 FULL ERROR MESSAGE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(latest.errorMessage || 'No error message');
    console.log('');
    
    // Parse out request details if present
    if (latest.errorMessage && latest.errorMessage.includes('API Key Present:')) {
      console.log('📋 Request Details Found in Error:');
      const hasApiKey = latest.errorMessage.match(/API Key Present: (true|false)/);
      const sentTo = latest.errorMessage.match(/Sent to: ([^\s|]+)/);
      
      if (hasApiKey) {
        console.log('   🔑 API Key Present:', hasApiKey[1]);
      }
      if (sentTo) {
        console.log('   🌐 Sent To:', sentTo[1]);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

queryLatest();
