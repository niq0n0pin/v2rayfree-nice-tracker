// api/merged-trackers.js
export default async function handler(req, res) {
  // 定义要抓取的两个Tracker列表地址
  const trackerUrls = [
    'https://cf.trackerslist.com/best.txt',
    'https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt'
  ];

  try {
    // 并发抓取所有Tracker列表
    const fetchPromises = trackerUrls.map(url =>
      fetch(url).then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return response.text();
      })
    );

    const results = await Promise.all(fetchPromises);
    
    // 将两个文件的内容用两个换行符连接（更清晰）
    const mergedContent = results.join('\n\n');
    
    // 设置为纯文本格式返回
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(mergedContent);
    
  } catch (error) {
    console.error('Error fetching trackers:', error);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Failed to fetch tracker list. Please try again later.');
  }
}
