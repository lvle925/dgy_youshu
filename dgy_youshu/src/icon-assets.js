const semanticIcons = [
  [/招投标|中标|采购/, 'bidding'],
  [/政策|申报|公示|通知/, 'policy'],
  [/外呼|电话|通话|接通/, 'phone'],
  [/走访|预约|日程|拜访/, 'calendar'],
  [/资金|金额|补贴|投资|余额|计费|账单|营收/, 'billing'],
  [/人员|账号|用户|访问|团队|企业数|获批企业/, 'users'],
  [/权限|角色|保障|风险|预警/, 'shield'],
  [/日志|记录|历史/, 'history'],
  [/地图|区域|地区/, 'map'],
  [/图谱|产业链|供应链/, 'network'],
  [/商机|招商/, 'globe'],
  [/档案|项目|线索|任务/, 'folder'],
  [/园区|楼宇|空间|企业/, 'building'],
  [/筛选|查询|检索/, 'search'],
  [/设置|配置|装修/, 'settings'],
];

export function iconForTitle(title) {
  return semanticIcons.find(([pattern]) => pattern.test(title))?.[1] || 'dashboard';
}
