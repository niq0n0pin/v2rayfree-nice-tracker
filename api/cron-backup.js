// api/cron-backup.js - 增强GitHub API错误诊断版
const { getNodeContent } = require('./fetch-latest.js');
const { getTrackerContent } = require('./merged-trackers.js'); // 确保这个函数也已用同样方式导出

async function handler(req, res) {
  // 正确的授权验证代码 (只有以下三行)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 备份任务开始 (增强诊断模式)');
  const results = [];
  // === 请务必检查并修改以下三个变量 ===
  const ghToken = process.env.GH_BACKUP_TOKEN; // 环境变量中的GitHub Token
  const repoOwner = 'niq0n0pin'; // 例如：niqOnOpin
  const repoName = 'v2rayfree-nice-tracker'; 
  const targetDir = 'backup';    // 在仓库内创建的子目录
  // === 配置结束 ===

  const backupTasks = [
    { name: '节点列表', getContent: getNodeContent, targetPath: 'backup/nodes.txt' },
    { name: 'Tracker列表', getContent: getTrackerContent, targetPath: 'backup/trackers.txt' }
  ];

  for (const task of backupTasks) {
    let fileContent = '';
    try {
      console.log(`  处理：${task.name}`);
      // 1. 获取内容
      fileContent = await task.getContent();
      console.log(`    ✅ 内容获取成功，长度: ${fileContent.length}`);

      // 2. 准备GitHub API参数
      const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${task.targetPath}`;
      console.log(`[DEBUG] 准备请求的完整API URL: ${apiUrl}`);   
      const headers = {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };

      // 3. 尝试获取文件当前SHA（用于更新）
      let sha = null;
      try {
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
          console.log(`    ℹ️ 文件已存在，获取到SHA`);
        } else if (getRes.status === 404) {
          console.log(`    ℹ️ 文件不存在，将创建新文件`);
        } else {
          // 其他错误
          const errorBody = await getRes.text();
          console.error(`    ❌ 获取文件状态失败 (HTTP ${getRes.status}):`, errorBody.substring(0, 300));
        }
      } catch (e) {
        console.error(`    ❌ 获取文件状态时发生异常:`, e.message);
      }

      // 4. 创建或更新文件 (这是最可能失败的地方)
      const body = {
        message: `自动备份 ${task.name} @ ${new Date().toISOString()}`,
        content: Buffer.from(fileContent).toString('base64'),
        branch: 'main',
      };
      if (sha) body.sha = sha;

      console.log(`    正在推送至: ${apiUrl}`);
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(body)
      });

      const responseText = await putRes.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: '响应不是有效JSON', raw: responseText.substring(0, 200) };
      }

      if (!putRes.ok) {
        // 这里是关键！GitHub API返回了错误详情
        console.error(`    ❌ GitHub API 请求失败 (HTTP ${putRes.status}):`);
        console.error(`       错误详情:`, result);
        // 根据常见错误给出提示
        if (putRes.status === 404) {
          throw new Error(`仓库或路径未找到 (${repoOwner}/${repoName})，请检查仓库名、所有者用户名是否正确，以及Token是否有访问权限。`);
        } else if (putRes.status === 401 || putRes.status === 403) {
          throw new Error(`Token权限不足或已失效。请确认GH_BACKUP_TOKEN有效且具有repo权限。`);
        } else {
          throw new Error(`GitHub API错误: ${result.message || putRes.statusText}`);
        }
      }

      console.log(`    ✅ ${task.name}备份成功！文件URL: ${result.content.html_url}`);
      results.push({ task: task.name, success: true, url: result.content.html_url });

    } catch (error) {
      console.error(`    ❌ ${task.name}处理失败:`, error.message);
      // 如果fileContent已获取，可以打印前100字符辅助调试
      if (fileContent) {
        console.log(`    已获取但未推送的内容预览:`, fileContent.substring(0, 100).replace(/\n/g, '\\n'));
      }
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

module.exports = handler;
