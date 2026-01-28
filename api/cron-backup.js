// api/cron-backup.js
export default async function handler(req, res) {
  // 用于验证请求来自Vercel Cron，防止别人随便调用
  //if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //  return res.status(401).json({ error: 'Unauthorized' });
  //}

  console.log('🔔 备份任务开始');
  const report = []; // 记录执行结果

  // === 配置区 === (修改这里！)
  const GITHUB_REPO_OWNER = 'niqOnOpin'; // 例如：niqOnOpin
  const GITHUB_REPO_NAME = 'yang';   // 例如：my-backup-repo
  const GITHUB_TOKEN = process.env.GH_BACKUP_TOKEN; // 从环境变量读取Token
  // === 配置区结束 ===

  // 1. 定义要备份的两个任务
  const backupTasks = [
    {
      name: '节点列表',
      sourceUrl: `/api/fetch-latest`, // 从你现有的服务获取节点
      targetPath: 'backup/nodes.txt' // 在GitHub仓库中保存的位置
    },
    {
      name: 'Tracker列表',
      sourceUrl: `/api/merged-trackers`, // 从你现有的服务获取Tracker
      targetPath: 'backup/trackers.txt'
    }
  ];

  // 2. 逐个执行备份任务
  for (const task of backupTasks) {
    try {
      console.log(`  处理：${task.name}`);
      // 2.1 从你现有的Vercel服务获取内容
      const contentRes = await fetch(task.sourceUrl);
      if (!contentRes.ok) throw new Error(`获取失败，状态码: ${contentRes.status}`);
      const fileContent = await contentRes.text();

      // 2.2 准备GitHub API请求
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${task.targetPath}`;
      const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      };

      // 2.3 检查文件是否已存在（为了获取sha，更新时需要）
      let sha = null;
      try {
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) sha = (await getRes.json()).sha;
      } catch (e) { /* 文件不存在，正常 */ }

      // 2.4 创建或更新文件
      const body = {
        message: `自动备份 ${task.name} @ ${new Date().toISOString()}`,
        content: Buffer.from(fileContent).toString('base64'), // GitHub要求内容为Base64
        branch: 'main',
      };
      if (sha) body.sha = sha; // 如果文件存在，必须提供sha才能更新

      const putRes = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
      const result = await putRes.json();

      if (!putRes.ok) throw new Error(result.message || '更新失败');

      console.log(`    ✅ 成功：${result.content.html_url}`);
      report.push({ task: task.name, success: true, url: result.content.html_url });

    } catch (error) {
      console.error(`    ❌ 失败：${error.message}`);
      report.push({ task: task.name, success: false, error: error.message });
      // 一个任务失败，继续下一个
    }
  }

  // 3. 返回所有任务执行报告
  const allSuccess = report.every(r => r.success);
  res.status(allSuccess ? 200 : 207).json({
    message: `备份完成，成功 ${report.filter(r => r.success).length} 项，失败 ${report.filter(r => !r.success).length} 项`,
    report,
    timestamp: new Date().toISOString()
  });
}
