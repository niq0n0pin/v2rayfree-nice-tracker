节点每4小时更新，tracker也是

一.对于v2rayfree-nice介绍

知道v2rayfree

这个项目吗？

如果你知道的话应该也发现了  从作者上一次合并分支以后

1.由于它的一些特殊操作导致应该独立上传的节点文件上传统统都失败了

2.同时他还有个大问题就是节点的获取链接是随着时间的改变而改变的

面对上面这两个情况

本身2.还可以忍受

但1.一出现我真是不行了

所以我做了这个项目

获取它最新的节点   现在你只需要用这个：

https://raw.githubusercontent.com/niq0n0pin/v2rayfree-nice-tracker/main/backup/nodes.txt

就可以了

原理【虽然那位作者的节点文件上传失败 但他还是有一个难得的好习惯“会将节点发送到readme”文件中

又因为readme中的节点放在了代码块中所以用https://raw.githubusercontent.com/获取的文件里

节点的上方下方各自有特别的标识符  “‘‘‘”  所以我直接获取标识符然后把中间的节点薅下来了】

二.对于tracker介绍

知道qBittorrent吗

我们都知道它的tracker只能有一个链接

但是我想要很多个

所以我就把多个链接自己整合为一个链接


整合的链接被我放在了

api/tracker_sources.txt中【其实就两个】

最后你们可以输入qBittorrent为

https://raw.githubusercontent.com/niq0n0pin/v2rayfree-nice-tracker/main/backup/trackers.txt

[好像对于https://raw.githubusercontent.com读取有点问题]

所以可以用

https://ghfast.top/https://raw.githubusercontent.com/niq0n0pin/v2rayfree-nice-tracker/main/backup/trackers.txt

如果还是有问题那么总的来讲就是找个镜像下载就行

三.关于项目构建

域名代码  用的vercel

定时获取  用的github
