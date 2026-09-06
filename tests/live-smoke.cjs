const fs = require('node:fs');
const base = (process.argv[2] || 'https://rental-tracker-app-2026.web.app').replace(/\/$/, '');
if (!['https:', 'http:'].includes(new URL(base).protocol)) throw new Error('An HTTP(S) deployment URL is required');
(async()=>{
 const checks=[];
 for (const [path,expected] of [['/',200],['/login/',200],['/portal/',200],['/admin/operations/',200],['/landlord/',200],['/api/notifications/get-unread/',401],['/api/notifications/preferences/',401],['/api/landlord/data/',401],['/api/files/nonexistent-live-smoke/',403],['/api/admin/run-operations/',403],['/firebase-messaging-sw.js',200]]) {
  try {
   const r=await fetch(base+path,{signal:AbortSignal.timeout(30000)}); const body=await r.text();
   checks.push({path,expected,status:r.status,pass:r.status===expected && (expected < 400 || (r.headers.get('content-type') || '').includes('application/json')),contentType:r.headers.get('content-type'),cache:r.headers.get('cache-control'),bytes:body.length,buildId:body.match(/"buildId":"([^"]+)"/)?.[1]});
  } catch(e) {checks.push({path,expected,pass:false,error:e.message});}
 }
 fs.mkdirSync('.agent-artifacts',{recursive:true});
 fs.writeFileSync('.agent-artifacts/live-smoke.json',JSON.stringify({base,time:new Date().toISOString(),checks},null,2));
 console.log(JSON.stringify(checks,null,2));
 if (checks.some(check => !check.pass)) process.exitCode = 1;
})();
