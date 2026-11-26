// “投融引育”页面演示数据。字段结构对应投融资台账、企业培育、风险预警和增量招引场景。
export const monthlyInvestmentTrend = [
  { month: '6月', count: 5, amount: 2.6 },
  { month: '7月', count: 7, amount: 3.8 },
  { month: '8月', count: 6, amount: 3.2 },
  { month: '9月', count: 9, amount: 5.1 },
  { month: '10月', count: 8, amount: 4.6 },
  { month: '11月', count: 11, amount: 6.9 },
];

export const localFinancingRows = [
  { id: 'F001', company: '上海贤芯微电子有限公司', town: '南桥镇', park: '数字江海', industry: '集成电路', round: 'B轮', amount: 12000, investors: '临港科创投、国方资本', date: '2026-11-18', purpose: '车规级芯片研发及测试产线扩建', credit: '科技创新贷 3,000 万元', equity: '新增机构股东 2 家', source: '企业融资公告（演示）' },
  { id: 'F002', company: '上海美谷生物科技有限公司', town: '金汇镇', park: '东方美谷', industry: '生物医药', round: 'A+轮', amount: 8000, investors: '毅达资本、奉贤产业基金', date: '2026-11-16', purpose: '功效原料研发中心及中试平台建设', credit: '科创信用贷 1,500 万元', equity: '创始团队持股比例被动稀释', source: '投融资资讯平台（演示）' },
  { id: 'F003', company: '上海氢晨新能源科技有限公司', town: '奉城镇', park: '临港奉贤园区', industry: '新能源', round: '战略融资', amount: 20000, investors: '中金资本、产业战略投资方', date: '2026-11-12', purpose: '氢燃料电池核心部件量产基地建设', credit: '项目贷款意向授信 1.2 亿元', equity: '引入产业方战略股东', source: '企业融资公告（演示）' },
  { id: 'F004', company: '上海云启智能制造有限公司', town: '青村镇', park: '青港经济园区', industry: '智能制造', round: 'A轮', amount: 5000, investors: '元禾控股、松禾资本', date: '2026-11-08', purpose: '柔性生产线研发与华东市场拓展', credit: '知识产权质押融资 800 万元', equity: '新增董事会观察员席位', source: '工商及公开资讯（演示）' },
  { id: 'F005', company: '上海数澜信息技术有限公司', town: '西渡街道', park: '数字江海', industry: '数字经济', round: 'B+轮', amount: 6500, investors: '深创投、国科投资', date: '2026-10-29', purpose: '工业数据智能平台产品迭代', credit: '研发贷 1,200 万元', equity: '注册资本增加至 1,250 万元', source: '投融资资讯平台（演示）' },
  { id: 'F006', company: '上海康谱医疗器械有限公司', town: '庄行镇', park: '庄行工业园', industry: '医疗器械', round: '天使轮', amount: 1800, investors: '奉贤创业投资、医疗产业资本', date: '2026-10-22', purpose: '微创诊疗器械注册检验及试制', credit: '科技履约贷 500 万元', equity: '完成首轮机构股东引进', source: '企业融资公告（演示）' },
  { id: 'F007', company: '上海绿循新材料有限公司', town: '海湾镇', park: '海湾星火开发区', industry: '新材料', round: 'A轮', amount: 4200, investors: '毅达资本、绿色产业基金', date: '2026-10-15', purpose: '可降解材料产线技改及应用场景验证', credit: '绿色信贷 2,000 万元', equity: '员工持股平台同步增资', source: '公开工商信息（演示）' },
  { id: 'F008', company: '上海湾谷机器人有限公司', town: '奉浦街道', park: '奉浦工业园', industry: '高端装备', round: 'Pre-A轮', amount: 3000, investors: '元禾控股、机器人产业资本', date: '2026-09-28', purpose: '特种机器人控制系统的研发与交付', credit: '科创助力贷 600 万元', equity: '新增机构股东 1 家', source: '投融资资讯平台（演示）' },
];

export const growthEnterpriseRows = [
  { id: 'G001', company: '上海贤芯微电子有限公司', town: '南桥镇', industry: '集成电路', signal: 'B 轮融资 1.2 亿元', growthType: '股权融资', policies: ['专精特新中小企业', '高新技术企业'], opportunity: '测试产线扩建，预计新增研发办公需求 2,000㎡', owner: '顾龙飞', status: '待跟进' },
  { id: 'G002', company: '上海氢晨新能源科技有限公司', town: '奉城镇', industry: '新能源', signal: '战略融资 2 亿元', growthType: '大额融资', policies: ['重大产业项目扶持', '人才住房补贴'], opportunity: '量产基地建设，存在增资扩产及上下游导入需求', owner: '李婷', status: '跟进中' },
  { id: 'G003', company: '上海美谷生物科技有限公司', town: '金汇镇', industry: '生物医药', signal: 'A+ 轮融资 8,000 万元', growthType: '股权融资', policies: ['生物医药专项扶持', '高新技术企业'], opportunity: '中试平台建设，建议匹配专业载体和检测服务', owner: '顾龙飞', status: '待跟进' },
  { id: 'G004', company: '上海绿循新材料有限公司', town: '海湾镇', industry: '新材料', signal: '绿色信贷授信 2,000 万元', growthType: '科创授信', policies: ['技术改造补贴', '绿色制造示范'], opportunity: '产线技改，预计新增设备投资和用工需求', owner: '王凯', status: '跟进中' },
  { id: 'G005', company: '上海云启智能制造有限公司', town: '青村镇', industry: '智能制造', signal: 'A 轮融资 5,000 万元', growthType: '股权融资', policies: ['专精特新中小企业', '首台套装备支持'], opportunity: '华东市场拓展，建议跟进生产场地扩容计划', owner: '陈晨', status: '已服务' },
];

export const riskWarningRows = [
  { id: 'R001', company: '上海澄宇智能科技有限公司', town: '南桥镇', industry: '人工智能', riskType: '外地资本控股', level: '高', date: '2026-11-18', detail: '外地产业资本取得控股权，企业经营决策层可能发生调整。', owner: '顾龙飞', status: '待跟进' },
  { id: 'R002', company: '上海晶沐半导体有限公司', town: '金汇镇', industry: '集成电路', riskType: '大股东高频质押', level: '中', date: '2026-11-15', detail: '控股股东近 30 日内发生 2 次股权质押，建议关注资金链及产能布局变化。', owner: '李婷', status: '跟进中' },
  { id: 'R003', company: '上海优衡生物有限公司', town: '奉城镇', industry: '生物医药', riskType: '被外地企业并购', level: '高', date: '2026-11-11', detail: '公开信息显示企业控制权拟转移至外地产业集团，需确认本地研发及纳税主体保留计划。', owner: '顾龙飞', status: '待跟进' },
  { id: 'R004', company: '上海启航工业软件有限公司', town: '西渡街道', industry: '数字经济', riskType: '注册地变更意向', level: '中', date: '2026-11-06', detail: '企业出现跨区地址变更咨询记录，建议结合租约到期时间开展走访。', owner: '王凯', status: '跟进中' },
];

export const financingTrackRows = [
  { id: 'T001', industry: '集成电路', count: 46, amount: 82.4, mom: 18.6, deltaCount: 12, deltaAmount: 26.8, hot: '车规芯片、先进封装' },
  { id: 'T002', industry: '生物医药', count: 38, amount: 65.7, mom: 12.4, deltaCount: 10, deltaAmount: 18.3, hot: '创新药、合成生物' },
  { id: 'T003', industry: '新能源', count: 31, amount: 74.2, mom: 21.8, deltaCount: 8, deltaAmount: 22.5, hot: '氢能、新型储能' },
  { id: 'T004', industry: '智能制造', count: 27, amount: 39.5, mom: 8.7, deltaCount: 9, deltaAmount: 13.6, hot: '工业机器人、机器视觉' },
  { id: 'T005', industry: '数字经济', count: 24, amount: 33.8, mom: -3.2, deltaCount: 7, deltaAmount: 9.4, hot: '工业软件、数据要素' },
  { id: 'T006', industry: '新材料', count: 19, amount: 28.6, mom: 6.5, deltaCount: 6, deltaAmount: 8.1, hot: '电子材料、可降解材料' },
];

export const targetEnterpriseRows = [
  { id: 'I001', company: '苏州晶湛半导体有限公司', region: '江苏省苏州市', industry: '集成电路', round: 'C轮', amount: 45000, scale: '成长型', business: '氮化镓外延材料研发与规模化生产', investors: '深创投、元禾控股', score: 95, owner: '', status: '待对接' },
  { id: 'I002', company: '深圳市优艾智合机器人科技有限公司', region: '广东省深圳市', industry: '智能制造', round: 'C轮', amount: 30000, scale: '成长型', business: '工业移动机器人及智能调度系统', investors: '中金资本、松禾资本', score: 92, owner: '', status: '待对接' },
  { id: 'I003', company: '北京推想医疗科技股份有限公司', region: '北京市海淀区', industry: '生物医药', round: 'D轮', amount: 50000, scale: '成长型', business: '人工智能医学影像辅助诊断产品', investors: '毅达资本、医疗产业资本', score: 90, owner: '顾龙飞', status: '跟进中' },
  { id: 'I004', company: '杭州群核信息技术有限公司', region: '浙江省杭州市', industry: '数字经济', round: '战略融资', amount: 20000, scale: '成长型', business: '云端工业设计软件与空间智能平台', investors: '国科投资、产业战略方', score: 86, owner: '', status: '待对接' },
  { id: 'I005', company: '合肥国轩高科动力能源有限公司', region: '安徽省合肥市', industry: '新能源', round: '战略融资', amount: 60000, scale: '规模以上', business: '动力电池及储能系统研发制造', investors: '中金资本、绿色产业基金', score: 91, owner: '李婷', status: '跟进中' },
  { id: 'I006', company: '西安铂力特增材技术股份有限公司', region: '陕西省西安市', industry: '高端装备', round: 'B轮', amount: 25000, scale: '成长型', business: '金属增材制造装备及定制化产品', investors: '深创投、装备制造基金', score: 88, owner: '', status: '待对接' },
];

export const investmentInstitutionRows = [
  { id: 'V001', name: '深创投', type: 'VC/PE', stages: 'A轮—Pre-IPO', tracks: '集成电路、智能制造、新能源', cases: '半导体设备、工业机器人、动力电池', local: '已投资属地企业 2 家', contact: '区域投资团队', status: '待对接' },
  { id: 'V002', name: '毅达资本', type: 'VC/PE', stages: '天使轮—C轮', tracks: '生物医药、新材料、高端装备', cases: '创新药、医疗器械、可降解材料', local: '已投资属地企业 2 家', contact: '生物医药投资部', status: '跟进中' },
  { id: 'V003', name: '元禾控股', type: '产业资本', stages: '天使轮—B轮', tracks: '集成电路、智能制造、数字经济', cases: '车规芯片、柔性生产线、工业软件', local: '已投资属地企业 1 家', contact: '先进制造投资部', status: '待对接' },
  { id: 'V004', name: '中金资本', type: '产业资本', stages: 'B轮—Pre-IPO', tracks: '新能源、生物医药、高端装备', cases: '氢能、储能、创新医疗器械', local: '已投资属地企业 1 家', contact: '战略新兴产业团队', status: '跟进中' },
  { id: 'V005', name: '临港科创投', type: '地方国资', stages: '天使轮—B轮', tracks: '集成电路、数字经济、生物医药', cases: '车规芯片、工业数据平台、合成生物', local: '已投资属地企业 3 家', contact: '科创投资部', status: '已建立联系' },
];
