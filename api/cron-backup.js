// api/cron-backup.js
import { getNodeContent } from './fetch-latest.js';
import { getTrackerContent } from './merged-trackers.js'; // 请确保你在 merged-trackers.js 中导出了同名函数

export default async function handler(req, res) {
  // 授权验证 (保持不变)
  //if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //  return res.status(401).json({ error: 'Unauthorized' });
  //}

  console.log('🚀 备份任务开始 (模块调用模式)');
  const results = [];
  const ghToken = process.env.GH_BACKUP_TOKEN;
  const repoOwner = 'niqOnOpin'; // 例如：niqOnOpin
  const repoName = 'yang';   // 例如：free-nodes-backup

  // 定义备份任务配置
  const backupTasks = [
    { name: '节点列表', getContent: getNodeContent, targetPath: 'backup/nodes.txt' },
    { name: 'Tracker列表', getContent: getTrackerContent, targetPath: 'backup/trackers.txt' }
  ];

  for (const task of backupTasks) {
    try {
      console.log(`  处理：${task.name}`);
      // 1. 直接调用模块函数获取内容，无需HTTP
      const fileContent = await task.getContent();
      
      // 2. 以下是推送到GitHub的逻辑 (与你之前代码一致，确保域名、仓库名正确)
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

  // 返回报告
  const allSuccess = results.every(r => r.success);
  res.status(allSuccess ? 200 : 207).json({
    message: `备份完成，成功 ${results.filter(r => r.success).length} 项，失败 ${results.filter(r => !r.success).length} 项`,
    report: results,
    timestamp: new Date().toISOString()
  });
}
