import postgres from 'postgres';

const DATABASE_URL = 'postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require';

async function testLatest() {
  const sql = postgres(DATABASE_URL);
  
  try {
    // Get the very latest production request
    const [latest] = await sql`
      SELECT "taskId", "userId", "source", "status", "errorMessage", "createdAt"
      FROM "generationLogs" 
      WHERE "userId" = 'user_2gbjlQQWoLD5IM34f4fuugMdOk6'
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;
    
    if (!latest) {
      console.log('No production requests found yet from dreadhalor prod account');
      return;
    }
    
    console.log('📊 Latest Production Request (dreadhalor):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TaskID:', latest.taskId || 'N/A');
    console.log('Status:', latest.status);
    console.log('Source:', latest.source);
    console.log('Time:', new Date(latest.createdAt).toLocaleString());
    
    if (latest.errorMessage) {
      console.log('');
      console.log('🔍 Error Details:');
      console.log(latest.errorMessage);
    }
    
    if (latest.status === 'completed') {
      console.log('');
      console.log('🎉 SUCCESS! Production is working!');
    } else if (latest.errorMessage?.includes('401')) {
      console.log('');
      console.log('❌ Still getting 401 - API key not available to production build');
      console.log('   This means turbo.json fix needs to fully deploy');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

testLatest();
