import postgres from 'postgres';

const DATABASE_URL = 'postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require';

async function compareLogs() {
  const sql = postgres(DATABASE_URL);
  
  try {
    console.log('🔍 Comparing successful vs failed requests...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Get recent successful web requests
    const successful = await sql`
      SELECT "taskId", "userId", "source", "status", "errorMessage", "createdAt"
      FROM "generationLogs" 
      WHERE "source" = 'web' AND "status" = 'completed'
      ORDER BY "createdAt" DESC 
      LIMIT 3
    `;
    
    console.log('✅ SUCCESSFUL Web Requests (local):');
    successful.forEach((log: any) => {
      console.log(`   TaskID: ${log.taskId} | User: ${log.userId?.substring(0,20) || 'null'}`);
      console.log(`   Time: ${new Date(log.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // Get recent failed web requests
    const failed = await sql`
      SELECT "taskId", "userId", "source", "status", "errorMessage", "createdAt"
      FROM "generationLogs" 
      WHERE "source" = 'web' AND "status" = 'failed'
      ORDER BY "createdAt" DESC 
      LIMIT 3
    `;
    
    console.log('❌ FAILED Web Requests (production):');
    failed.forEach((log: any) => {
      console.log(`   TaskID: ${log.taskId || 'N/A'} | User: ${log.userId?.substring(0,20) || 'null'}`);
      console.log(`   Error: ${log.errorMessage}`);
      console.log(`   Time: ${new Date(log.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // Get CLI requests for comparison
    const cli = await sql`
      SELECT "taskId", "status", "createdAt"
      FROM "generationLogs" 
      WHERE "source" = 'cli'
      ORDER BY "createdAt" DESC 
      LIMIT 3
    `;
    
    console.log('🖥️  CLI Requests (working):');
    cli.forEach((log: any) => {
      console.log(`   TaskID: ${log.taskId} | Status: ${log.status}`);
      console.log(`   Time: ${new Date(log.createdAt).toLocaleString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

compareLogs();
