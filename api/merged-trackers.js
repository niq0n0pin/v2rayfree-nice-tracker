// api/merged-trackers.js - 重构为可复用模块
export default async function handler(request, response) {
  try {
    // 调用新封装的 getTrackerContent 函数
    const mergedText = await getTrackerContent();
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(200).send(mergedText);
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(500).send('服务器处理失败: ' + error.message);
  }
}

// ========== 核心功能函数 ==========
// 此函数封装了获取并合并 Tracker 的核心逻辑
export async function getTrackerContent() {
  try {
    console.log('[getTrackerContent] 开始获取并合并Tracker列表...');
    // 1. 读取配置文件 (注意：需根据你的实际仓库和路径修改)
    const configUrl = 'https://raw.githubusercontent.com/niq0n0pin/v2rayfree-nice-tracker/main/api/tracker_sources.txt';
    // 如果是私有仓库，这里需要带上 Token（建议通过环境变量），以下为示例：
    // const ghToken = process.env.YOUR_GH_TOKEN; // 从环境变量读取
    // const headers = ghToken ? { 'Authorization': `token ${ghToken}` } : {};
    // const configResponse = await fetch(configUrl, { headers });
    const configResponse = await fetch(configUrl); // 公开仓库直接访问
    if (!configResponse.ok) {
      throw new Error(`无法读取配置文件: ${configResponse.status}`);
    }
    const configText = await configResponse.text();
    const trackerUrls = configText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    console.log(`[getTrackerContent] 从配置文件加载了 ${trackerUrls.length} 个Tracker源。`);
    if (trackerUrls.length === 0) {
      throw new Error('配置文件中未找到有效的Tracker链接。');
    }
    // 2. 并发抓取
    const fetchPromises = trackerUrls.map(url =>
      fetch(url).then(res => {
        if (!res.ok) {
          console.warn(`抓取失败 [${url}]: ${res.status}`);
          return null;
        }
        return res.text();
      }).catch(err => {
        console.error(`抓取异常 [${url}]:`, err.message);
        return null;
      })
    );
    const contents = await Promise.all(fetchPromises);
    // 3. 合并并去重
    const validContents = contents.filter(c => c != null && c.trim().length > 0);
    if (validContents.length === 0) {
      throw new Error('所有Tracker源均抓取失败。');
    }
    let mergedText = validContents.join('\n');
    const lines = mergedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const uniqueLines = [...new Set(lines)];
    mergedText = uniqueLines.join('\n');
    console.log(`[getTrackerContent] 合并完成，共 ${uniqueLines.length} 个唯一Tracker地址。`);
    return mergedText;
  } catch (error) {
    console.error('[getTrackerContent] 发生错误:', error);
    throw error;
  }
}
