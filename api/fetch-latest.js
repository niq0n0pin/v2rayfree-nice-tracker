// api/fetch-latest.js - 修订版（直接解析README）
export default async function handler(request, response) {
  try {
    console.log('开始从README提取节点...');
    
    // 1. 获取最新的 README 内容
    const readmeUrl = 'https://raw.githubusercontent.com/free-nodes/v2rayfree/main/README.md';
    const readmeRes = await fetch(readmeUrl);
    
    if (!readmeRes.ok) {
      throw new Error(`获取README失败，状态码: ${readmeRes.status}`);
    }
    
    const readmeText = await readmeRes.text();
    
    // 2. 使用正则表达式提取所有节点订阅链接
    // 匹配 ss://, vmess://, vless://, trojan://, hy://, hysteria:// 等常见协议
    // 链接通常持续到空格、换行或引号前
    const nodeLinkRegex = /(?:ss|vmess|vless|trojan|hy|hysteria):\/\/[^\s<>"']+/gi;
    const extractedLinks = readmeText.match(nodeLinkRegex) || [];
    
    console.log(`从README中提取到 ${extractedLinks.length} 个节点链接`);
    
    // 3. 检查是否成功提取到链接
    if (extractedLinks.length === 0) {
      return response.status(404).send('未在README中找到有效的节点订阅链接。');
    }
    
    // 4. 将链接转换为纯文本格式（每行一个），这是V2RayN等客户端支持的格式
    const nodesContent = extractedLinks.join('\n');
    
    // 5. 成功返回
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(200).send(nodesContent);
    
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(500).send('服务器处理失败: ' + error.message);
  }
}
