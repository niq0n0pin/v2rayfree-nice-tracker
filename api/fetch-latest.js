// api/fetch-latest.js - 使用更兼容的 CommonJS 语法

// 核心功能函数
async function getNodeContent() {
  console.log('[getNodeContent] 正在提取节点...');
  try {
    const readmeRawUrl = 'https://raw.githubusercontent.com/free-nodes/v2rayfree/main/README.md';
    const readmeRes = await fetch(readmeRawUrl);
    
    if (!readmeRes.ok) {
      throw new Error(`获取源文件失败: ${readmeRes.status}`);
    }
    
    const fullText = await readmeRes.text();
    const delimiter = '```';
    const firstIndex = fullText.indexOf(delimiter);
    
    if (firstIndex === -1) {
      throw new Error('未找到代码块起始标记。');
    }
    
    const textAfterFirst = fullText.substring(firstIndex + delimiter.length);
    const secondIndex = textAfterFirst.indexOf(delimiter);
    
    if (secondIndex === -1) {
      throw new Error('未找到匹配的代码块结束标记。');
    }
    
    const nodeListText = textAfterFirst.substring(0, secondIndex).trim();
    console.log(`[getNodeContent] 提取完成，文本长度: ${nodeListText.length}`);
    return nodeListText;
    
  } catch (error) {
    console.error('[getNodeContent] 发生错误:', error);
    throw error; // 重新抛出
  }
}

// Vercel Serverless 函数的主处理函数（默认导出）
async function handler(request, response) {
  try {
    const nodeListText = await getNodeContent();
    const nodeLines = nodeListText.split('\n');
    console.log(`HTTP接口提取完成，共 ${nodeLines.length} 行。`);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(200).send(nodeListText);
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(500).send('服务器处理失败: ' + error.message);
  }
}

// 关键：使用 module.exports 同时暴露默认函数和命名函数
module.exports = handler;          // 作为默认导出，供 Vercel 调用
module.exports.getNodeContent = getNodeContent; // 作为命名导出，供 cron-backup.js 调用
