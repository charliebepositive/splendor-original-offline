# 素材与规则核对记录

核对日期：2026-09-05。目标为 Splendor 经典 2014 基础版，不含 Duel、宝可梦版或任何扩展。

## 官方规则

- 发行商产品页：https://www.spacecowboys-games.com/game/splendor/
- Asmodee 英文原版规则：https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/02/Splendor-EN.pdf
- 本地副本：`Splendor-EN.pdf`。中文整理：`rules.html`。
- 库存耗尽 FAQ：https://rules.dized.com/game/vdDSzuu4RsC8F45PsW0TKw/faq

引擎核对项目：2/3/4 人普通色供应 4/5/7、黄金始终 5；发展卡 40/30/20，每级展示 4；贵族人数加一；保留上限 3；购买使用永久折扣与黄金；筹码上限 10；每回合贵族最多一位；15 分后完成当前轮；平分比较已购卡数量，仍相同共享胜利。

取不同色通常必须取 3 枚。依据 FAQ，仅当不足 3 种颜色有库存时，取所有剩余颜色各一枚。先手由座位 1 担任，玩家可将最年轻者安排为座位 1。

## 90 张发展卡的实际卡面与数据

- 拍摄、透视校正、转录来源：https://github.com/anicolao/splendor
- 查看器：https://anicolao.github.io/splendor/
- 元数据：https://anicolao.github.io/splendor/data/cards.json
- 单卡 URL 模式：`https://anicolao.github.io/splendor/data/cards/{id}.png`
- 转录 CSV：https://github.com/anicolao/splendor/blob/main/data/verified_card_properties.csv
- 本地原始元数据：`source-cards.json`；本地图片：`../assets/cards/*.png`。

下载 90 张 630×880 PNG，共 55,371,253 字节。`../tools/build-data.cjs` 从保存的原始元数据生成 `../js/data.js`，不随机生成牌值。测试检查 90 个 ID、每色每级数量、所有图片存在、贵族唯一性，以及已知卡牌价格。

采用的是实体卡的照片裁切，并非该仓库另行绘制的 15 张场景插画。未把重绘插画标作官方卡面。其转录备注说明部分公开卡表存在错值，因此保留原图与对应数据一起用于复核。

## 贵族与牌背

基础版 10 位贵族均为 3 分，条件如下（顺序仅用于本程序 ID，无人物身份含义）：

| ID | 条件 |
| --- | --- |
| 1 | 绿 4、红 4 |
| 2 | 白 3、红 3、黑 3 |
| 3 | 白 4、蓝 4 |
| 4 | 白 4、黑 4 |
| 5 | 蓝 4、绿 4 |
| 6 | 蓝 3、绿 3、红 3 |
| 7 | 白 3、蓝 3、绿 3 |
| 8 | 红 4、黑 4 |
| 9 | 白 3、蓝 3、黑 3 |
| 10 | 绿 3、红 3、黑 3 |

贵族块使用皇冠与需求数字的 CSS 重绘，牌背使用等级数字与纹理重绘；两者均不包含官方原画，已在游戏来源弹窗中注明。发展卡则全部使用对应的原版实拍卡面。

## 权利与实现关系

Splendor 设计 Marc André，原画 Pascal Quidault，发行 SPACE Cowboys；游戏卡牌原画版权属于原权利人。原图整理仓库使用 GPL-3.0，许可副本见 `CARD-SOURCE-LICENSE.txt`。该许可不表示游戏发行商放弃了卡牌原画版权。本项目用于非官方本地学习，不配置发布与在线服务。

参考现有 Pokémon 项目的纯静态结构、引擎与 UI 分离、热座、AI 和本地存档设计。经典引擎、AI 与界面另行实现，避免加载进化、神兽、商店或联机逻辑。原目录完整保留。
