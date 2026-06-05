// api/fetch-latest.js - 只从 free-nodes/v2rayfree 获取节点
export default async function handler(request, response) {
  try {
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

// 核心函数：从指定仓库的 README.md 中提取代码块内的节点
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
    throw error;
  }
}
