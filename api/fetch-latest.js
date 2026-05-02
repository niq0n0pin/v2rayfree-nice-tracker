// api/fetch-latest.js - 重构为可复用模块，支持多节点源合并
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

// ========== 核心功能函数 ==========

// 从原始仓库 (free-nodes/v2rayfree) 获取节点
async function getOriginalNodes() {
  console.log('[getOriginalNodes] 正在提取原始节点...');
  const readmeRawUrl = 'https://raw.githubusercontent.com/free-nodes/v2rayfree/main/README.md';
  const readmeRes = await fetch(readmeRawUrl);
  if (!readmeRes.ok) {
    throw new Error(`获取原始节点源文件失败: ${readmeRes.status}`);
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
  console.log(`[getOriginalNodes] 提取到 ${nodeListText.split('\n').length} 个节点`);
  return nodeListText;
}

// 从免费节点备份仓库 (free-v2ray/free-v2ray.github.io) 获取节点
async function getFreeV2rayNodes() {
  console.log('[getFreeV2rayNodes] 开始从 free-v2ray 仓库获取节点...');
  try {
    // 1. 获取 README.md
    const readmeUrl = 'https://raw.githubusercontent.com/free-v2ray/free-v2ray.github.io/main/README.md';
    const readmeRes = await fetch(readmeUrl);
    if (!readmeRes.ok) {
      console.warn(`[getFreeV2rayNodes] 无法获取 README.md，状态码: ${readmeRes.status}`);
      return ''; // 失败时返回空字符串，不中断整体流程
    }
    const readmeText = await readmeRes.text();

    // 2. 匹配所有类似 https://free-v2ray.github.io/uploads/2026/04/1-20260429.txt 的链接
    const linkRegex = /https:\/\/free-v2ray\.github\.io\/uploads\/\d{4}\/\d{2}\/[\w\-]+\.txt/g;
    const allLinks = readmeText.match(linkRegex) || [];
    const uniqueLinks = [...new Set(allLinks)];
    console.log(`[getFreeV2rayNodes] 在 README 中找到 ${uniqueLinks.length} 个独特的节点文件链接`);

    if (uniqueLinks.length === 0) {
      console.log('[getFreeV2rayNodes] 未找到任何链接，跳过');
      return '';
    }

    let allNodes = '';
    let successCount = 0;

    for (const link of uniqueLinks) {
      try {
        console.log(`   正在抓取: ${link}`);
        const nodeFileRes = await fetch(link);
        if (!nodeFileRes.ok) {
          console.warn(`   ⚠️ 抓取失败: ${link} (${nodeFileRes.status})`);
          continue;
        }
        let content = await nodeFileRes.text();

        // 尝试 Base64 解码（如果内容看起来是 Base64）
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(content.trim()) && content.length % 4 === 0) {
          try {
            content = Buffer.from(content, 'base64').toString('utf-8');
            console.log(`   ✅ 成功获取并解码 (Base64): ${link}`);
          } catch (e) {
            console.warn(`   ⚠️ Base64 解码失败，保留原始内容: ${link}`);
          }
        } else {
          console.log(`   ✅ 成功获取 (纯文本): ${link}`);
        }

        allNodes += content + '\n';
        successCount++;
      } catch (err) {
        console.error(`   ❌ 处理节点文件时出错: ${link}`, err.message);
      }
    }

    console.log(`[getFreeV2rayNodes] 完成，成功从 ${successCount}/${uniqueLinks.length} 个链接获取节点`);
    return allNodes;
  } catch (error) {
    console.error('[getFreeV2rayNodes] 发生错误:', error);
    return ''; // 返回空字符串，不中断流程
  }
}

// 主函数：合并所有来源的节点
export async function getNodeContent() {
  console.log('[getNodeContent] 开始合并多源节点...');

  try {
    // 获取原始节点
    const originalNodes = await getOriginalNodes();
    // 获取 free-v2ray 节点
    const freeV2rayNodes = await getFreeV2rayNodes();

    // 合并并去重（按行去重）
    let combined = originalNodes;
    if (freeV2rayNodes.trim().length > 0) {
      combined = originalNodes + '\n' + freeV2rayNodes;
    }

    // 基础去重：每行一个节点，去除重复行
    const lines = combined.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    const uniqueLines = [...new Set(lines)];
    const result = uniqueLines.join('\n');

    console.log(`[getNodeContent] 合并完成，总节点数: ${uniqueLines.length} (原始: ${originalNodes.split('\n').filter(l=>l.trim()).length}, 新增: ${freeV2rayNodes.split('\n').filter(l=>l.trim()).length})`);
    return result;
  } catch (error) {
    console.error('[getNodeContent] 发生错误:', error);
    throw error;
  }
}
