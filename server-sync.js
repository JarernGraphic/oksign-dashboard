import http from 'http';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const PORT = 3001;
const baseWatchPath = '\\\\Desktop-sr9bc9m\\งานพิมพ์';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltweotviuakhgugkaluf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_FmIAq1yrSLA6IyeVQS2_GA_rB3oOe0q';

const findMatchingFiles = (dir, jobNum) => {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        results = results.concat(findMatchingFiles(fullPath, jobNum));
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          const cleanNum = jobNum.replace(/\D/g, '');
          const dashedNum = cleanNum.length === 7 ? `${cleanNum.slice(0, 4)}-${cleanNum.slice(4)}` : cleanNum;
          if (file.name.includes(jobNum) || file.name.includes(cleanNum) || file.name.includes(dashedNum)) {
            results.push(fullPath);
          }
        }
      }
    }
  } catch (err) {}
  return results;
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { jobId, jobNum } = JSON.parse(body);
        if (!jobId || !jobNum) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'ระบุ Job ไม่ถูกต้อง' }));
          return;
        }

        const authHeader = req.headers['authorization'];
        console.log(`[LAN Sync] Incoming request for Job #${jobNum}, Auth header present: ${Boolean(authHeader)}`);

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
          global: {
            headers: {
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
          },
        });

        // 1. Get authenticated user and org
        const { data: userData } = await supabase.auth.getUser();
        let userId = userData?.user?.id;
        let orgId = 'a0000000-0000-0000-0000-000000000001';

        console.log(`[LAN Sync] Auth user ID:`, userId);

        if (userId) {
          const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
          if (profile?.organization_id) {
            orgId = profile.organization_id;
          }
        } else {
          // Fallback to job creator
          const { data: jobData } = await supabase.from('jobs').select('organization_id, created_by').eq('id', jobId).maybeSingle();
          if (jobData) {
            orgId = jobData.organization_id;
            userId = jobData.created_by;
          }
        }

        // 2. Scan shared folder
        const matchingFiles = findMatchingFiles(baseWatchPath, jobNum);
        console.log(`[LAN Sync] Found ${matchingFiles.length} matching files for #${jobNum}:`, matchingFiles);

        if (matchingFiles.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `ไม่พบไฟล์รูปภาพที่มีเลขงาน ${jobNum} ในโฟลเดอร์ ${baseWatchPath}` }));
          return;
        }

        matchingFiles.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

        // 3. Check existing proofs in activity_logs
        const { data: allLogs } = await supabase
          .from('activity_logs')
          .select('id, action, metadata')
          .eq('entity_id', jobId)
          .in('action', ['DESIGN_PROOF', 'DESIGN_PROOF_REMOVED']);

        const deletedProofIds = new Set(
          (allLogs || []).filter(l => l.action === 'DESIGN_PROOF_REMOVED').map(l => l.metadata?.deleted_proof_id).filter(Boolean)
        );

        const existingLogs = (allLogs || []).filter(l => l.action === 'DESIGN_PROOF' && !deletedProofIds.has(l.id));
        const existingFileNames = new Set(existingLogs.map(l => l.metadata?.note));

        let syncedCount = 0;
        let lastError = null;

        for (const filePath of matchingFiles) {
          const stats = fs.statSync(filePath);
          if (stats.size > 15 * 1024 * 1024) continue;

          const fileName = path.basename(filePath);
          if (existingFileNames.has(fileName)) continue;

          const ext = path.extname(fileName).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          const fileBuffer = fs.readFileSync(filePath);
          const base64 = fileBuffer.toString('base64');
          const imageUrl = `data:${mime};base64,${base64}`;

          const nextVersion = (existingLogs?.length || 0) + syncedCount + 1;

          const { error: logErr } = await supabase.from('activity_logs').insert({
            organization_id: orgId,
            user_id: userId,
            entity_type: 'JOB',
            entity_id: jobId,
            action: 'DESIGN_PROOF',
            metadata: {
              version: nextVersion,
              image_url: imageUrl,
              note: fileName,
            },
          });

          if (logErr) {
            console.error('[LAN Sync Activity Log Error]:', logErr);
            lastError = logErr.message;
          } else {
            syncedCount++;

            try {
              await supabase.from('job_design_proofs').insert({
                organization_id: orgId,
                job_id: jobId,
                version: nextVersion,
                image_url: imageUrl,
                note: fileName,
                created_by: userId,
              });
            } catch (e) {}
          }
        }

        if (syncedCount > 0) {
          await supabase.from('jobs').update({
            stage: 'DESIGN',
            design_status: 'WAITING_CUSTOMER',
          }).eq('id', jobId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: `ซิงก์สำเร็จ! พบและดึงรูปภาพใหม่ ${syncedCount} รายการเรียบร้อยแล้ว` }));
        } else if (lastError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `เกิดข้อผิดพลาดในการบันทึกรูปภาพ: ${lastError}` }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: `รูปภาพทั้งหมด (${matchingFiles.length} รูป) ถูกซิงก์เข้าสู่ระบบเรียบร้อยแล้ว` }));
        }
      } catch (err) {
        console.error('[LAN Sync Server Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[LAN Sync Daemon] Listening on http://localhost:${PORT}`);
});
