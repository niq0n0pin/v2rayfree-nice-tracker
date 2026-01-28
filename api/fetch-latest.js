// api/fetch-latest.js - 重构为可复用模块
export default async function handler(request, response) {
  try {
    // 调用新封装的 getNodeContent 函数
    const nodeListText = await getNodeContent();
    const nodeLines = nodeListText.split('\n');
    console.log(`提取完成，共 ${nodeLines.length} 行。`);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(200).send(nodeListText);
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(500).send('服务器处理失败: ' + error.message);
  }
}

// ========== 核心功能函数 ==========
// 此函数封装了所有核心逻辑，可被其他模块（如 cron-backup.js）直接调用
export async function getNodeContent() {
  try {
    console.log('[getNodeContent] 正在提取节点...');
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
    return nodeListText;
  } catch (error) {
    console.error('[getNodeContent] 发生错误:', error);
    // 重新抛出错误，让调用者决定如何处理
    throw error;
  }
}
