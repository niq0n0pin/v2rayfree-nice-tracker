// api/cron-backup.js
import { getNodeContent } from './fetch-latest.js';
import { getTrackerContent } from './merged-trackers.js';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 备份任务开始 (模块调用模式)');
  const results = [];
  const ghToken = process.env.GH_BACKUP_TOKEN;
  const repoOwner = 'niq0n0pin';
  const repoName = 'v2rayfree-nice-tracker';

  const backupTasks = [
    { name: '节点列表', getContent: getNodeContent, targetPath: 'backup/nodes.txt' },
    { name: 'Tracker列表', getContent: getTrackerContent, targetPath: 'backup/trackers.txt' }
  ];

  for (const task of backupTasks) {
    try {
      console.log(`  处理：${task.name}`);
      const fileContent = await task.getContent();
      const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${task.targetPath}`;
      const headers = {
        'Authorization': `token ${ghToken}`,
        'Content-Type': 'application/json',
      };
      let sha = null;
      try {
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) sha = (await getRes.json()).sha;
      } catch (e) { /* 文件不存在 */ }
      const body = {
        message: `自动备份 ${task.name} @ ${new Date().toISOString()}`,
        content: Buffer.from(fileContent).toString('base64'),
        branch: 'main',
      };
      if (sha) body.sha = sha;
      const putRes = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
      const result = await putRes.json();
      if (!putRes.ok) throw new Error(result.message || '更新失败');
      console.log(`    ✅ 成功：${result.content.html_url}`);
      results.push({ task: task.name, success: true, url: result.content.html_url });
    } catch (error) {
      console.error(`    ❌ 失败：${error.message}`);
      results.push({ task: task.name, success: false, error: error.message });
    }
  }

  const allSuccess = results.every(r => r.success);
  res.status(allSuccess ? 200 : 207).json({
    message: `备份完成，成功 ${results.filter(r => r.success).length} 项，失败 ${results.filter(r => !r.success).length} 项`,
    report: results,
    timestamp: new Date().toISOString()
  });
}
