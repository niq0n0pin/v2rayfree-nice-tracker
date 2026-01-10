// api/fetch-latest.js
export default async function handler(request, response) {
  try {
    // 1. 调用GitHub API获取 free-nodes/v2rayfree 仓库的文件列表
    const apiResponse = await fetch('https://api.github.com/repos/free-nodes/v2rayfree/contents/');
    
    if (!apiResponse.ok) {
      throw new Error(`GitHub API responded with status: ${apiResponse.status}`);
    }
    
    const files = await apiResponse.json();
    
    // 2. 过滤出以 'v2' 开头的文件，并按文件名（即日期）降序排序
    const v2Files = files
      .filter(file => file.name.startsWith('v2') && file.type === 'file')
      .sort((a, b) => b.name.localeCompare(a.name)); // 最新的排在前面
    
    if (v2Files.length === 0) {
      return response.status(404).send('未找到 v2 开头的节点文件。');
    }
    
    // 3. 获取最新文件的原始下载链接
    const latestFileUrl = v2Files[0].download_url;
    console.log(`即将重定向到最新文件: ${latestFileUrl}`);
    
    // 4. 302 重定向到该文件的原始地址
    // 这样 V2Ray 客户端就能直接下载到内容
    response.redirect(302, latestFileUrl);
    
  } catch (error) {
    console.error('获取最新节点时出错:', error);
    response.status(500).send('服务器内部错误，无法获取最新节点。');
  }
}
