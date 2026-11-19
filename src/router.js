import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('./views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('./layout/MainLayout.vue'),
    redirect: '/home/index',
    children: [
      { path: 'home/index', name: 'Home', component: () => import('./views/Home.vue'), meta: { title: '首页' } },
      { path: 'policy/index', name: 'Policy', component: () => import('./views/Policy.vue'), meta: { title: '政策管理' } },
      { path: 'policy/detail/:id', name: 'PolicyDetail', component: () => import('./views/PolicyDetail.vue'), meta: { title: '政策详情' } },
      { path: 'industryChain/industryChart/index', name: 'IndustryChart', component: () => import('./views/IndustryChart.vue'), meta: { title: '产业图谱' } },
      { path: 'industryChain/industrySupply/index', name: 'IndustrySupply', component: () => import('./views/IndustrySupply.vue'), meta: { title: '供应链' } },
      { path: 'parksBuildings/index', name: 'ParksBuildings', component: () => import('./views/ParksBuildings.vue'), meta: { title: '园区楼宇' } },
      { path: 'businessMap/index', name: 'BusinessMap', component: () => import('./views/BusinessMap.vue'), meta: { title: '商机地图' } },
      { path: 'subsidy/index', name: 'Subsidy', component: () => import('./views/Subsidy.vue'), meta: { title: '企业查询' } },
      { path: 'subsidy/company/:id', name: 'CompanyDetail', component: () => import('./views/CompanyDetail.vue'), meta: { title: '企业详情' } },
      { path: 'business/businessInvestigate/index', name: 'BusinessInvestigate', component: () => import('./views/BusinessInvestigate.vue'), meta: { title: '商机摸排' } },
      { path: 'business/businessHall/index', name: 'BusinessHall', component: () => import('./views/BusinessHall.vue'), meta: { title: '商机大厅' } },
      { path: 'business/projectClues/index', name: 'ProjectClues', component: () => import('./views/ProjectClues.vue'), meta: { title: '企业扩张' } },
      { path: 'clue/detail/:id', name: 'ClueDetail', component: () => import('./views/ClueDetail.vue'), meta: { title: '线索详情' } },
      { path: 'business/aiOutbound/tasks', name: 'AiTasks', component: () => import('./views/AiOutbound.vue'), meta: { title: '外呼任务' } },
      { path: 'business/aiOutbound/records', name: 'AiRecords', component: () => import('./views/AiOutbound.vue'), meta: { title: '通话记录' } },
      { path: 'business/aiOutbound/dashboard', name: 'AiDashboard', component: () => import('./views/AiOutbound.vue'), meta: { title: '数据看板' } },
      { path: 'business/projectCluesUpdate/index', name: 'ProjectCluesUpdate', component: () => import('./views/ProjectCluesUpdate.vue'), meta: { title: '项目线索' } },
      { path: 'setting/index', name: 'Setting', component: () => import('./views/Setting.vue'), meta: { title: '门店装修' } },
      { path: 'member/index', name: 'Member', component: () => import('./views/Member.vue'), meta: { title: '人员管理' } },
      { path: 'member/log', name: 'MemberLog', component: () => import('./views/MemberLog.vue'), meta: { title: '操作日志' } },
      { path: 'member/logStatistics', name: 'MemberLogStatistics', component: () => import('./views/MemberLogStatistics.vue'), meta: { title: '操作日志统计' } },
      { path: 'member/role', name: 'MemberRole', component: () => import('./views/MemberRole.vue'), meta: { title: '角色管理' } },
      { path: 'interfaceBilling/index', name: 'InterfaceBilling', component: () => import('./views/InterfaceBilling.vue'), meta: { title: '接口计费' } },
      { path: 'myCampus/panoramicLnsight/index', name: 'PanoramicInsight', component: () => import('./views/PanoramicInsight.vue'), meta: { title: '全景洞察' } },
      { path: 'myCampus/campusAdmin/index', name: 'CampusAdmin', component: () => import('./views/CampusAdmin.vue'), meta: { title: '园区管理' } },
      { path: 'myCampus/corporateArchives/index', name: 'CorporateArchives', component: () => import('./views/CorporateArchives.vue'), meta: { title: '企业档案' } },
      { path: 'myCampus/migrationWarning/index', name: 'MigrationWarning', component: () => import('./views/MigrationWarning.vue'), meta: { title: '迁移预警' } },
      { path: 'myCampus/guarantee/index', name: 'Guarantee', component: () => import('./views/Guarantee.vue'), meta: { title: '企服保障' } },
      { path: 'myCampus/visitManage/index', name: 'VisitManage', component: () => import('./views/VisitManage.vue'), meta: { title: '走访管理' } },
      { path: 'bidding/index', name: 'Bidding', component: () => import('./views/Bidding.vue'), meta: { title: '招投标查询' } },
      { path: 'park/detail/:id', name: 'ParkDetail', component: () => import('./views/ParkDetail.vue'), meta: { title: '园区详情' } },
      { path: ':pathMatch(.*)*', name: 'NotFound', component: () => import('./views/NotFound.vue'), meta: { title: '404' } },
    ],
  },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  try {
    const response = await fetch('/api/auth/status');
    if (response.ok && (await response.json()).authenticated) return true;
  } catch { /* Login page explains backend connectivity. */ }
  return { path: '/login', query: { redirect: to.fullPath } };
});

export default router;
