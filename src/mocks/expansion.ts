export const expansionDemands = ["购地需求", "厂房租赁", "楼宇租赁", "人力成本", "人才资源", "政策补贴", "产业匹配", "资源补贴"];
export const expansionSources = ["资本扩张", "团队扩张", "战略动态", "业务增长", "研发投入"];

type ExpansionSeed = [company: string, product: string, intent: string, score: number, target: string, investment: number, output: number, demands: number[], signals: number[]];
const seeds: ExpansionSeed[] = [
  ["澄芯半导体技术", "宽禁带功率器件", "扩建材料验证和测试中心", 96, "上海市浦东新区", 6800, 23800, [1, 4, 5], [0, 4]],
  ["凌川智能制造", "工业移动机器人", "建设交付中心", 88, "江苏省苏州市", 4300, 16600, [1, 2, 6], [1, 3]],
  ["禾沐生命科技", "细胞检测设备", "新设区域研发实验室", 84, "上海市闵行区", 2300, 7900, [2, 4, 7], [4]],
  ["望原新能源", "工业储能系统", "规划区域生产基地", 78, "浙江省杭州市", 12800, 48300, [0, 3, 6], [0, 2]],
  ["天衡数据服务", "产业链数据分析", "拓展区域技术团队", 73, "广东省深圳市", 800, 3200, [2, 3, 4], [1, 3]],
  ["石榕精密装备", "高精密传动系统", "增设售后服务中心", 65, "河南省洛阳市", 1700, 5800, [1, 5], [2, 3]],
  ["源川新材料", "轻量化复合材料", "考察中试资源", 56, "四川省成都市", 3200, 9400, [1, 6, 7], [4]],
  ["新序软件", "研发协同软件", "调研本地政策支持", 43, "湖北省武汉市", 460, 1600, [5, 7], [2]],
  ["沧澜节能技术", "热管理系统", "初步比较用工和场地成本", 36, "天津市滨海新区", 2600, 8500, [0, 3], [2]],
  ["铭杉通信", "光通信模块", "评估研发合作可行性", 19, "北京市海淀区", 920, 3800, [4, 6], [4]],
];
export const expansionSignals = seeds.map(([company, product, intent, score, target, investment, output, demands, signals], index) => ({
  id: "EXP-" + (index + 1), company, product, intent, score, target, investment, output,
  demands: demands.map(item => expansionDemands[item]), signals: signals.map(item => expansionSources[item]),
}));
