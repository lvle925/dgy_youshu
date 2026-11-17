<template>
  <div>
    <div class="page-head">
      <h2>商机地图</h2>
      <p>以空间视角呈现园区载体、商机线索与产业分布，辅助精准招商决策</p>
    </div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="覆盖园区" value="15" unit="个" tone="info" />
      <StatCard title="在库商机" value="1,682" unit="条" tone="purple" foot="其中 A 级线索 286 条" />
      <StatCard title="本月新增" value="126" unit="条" tone="success" foot="较上月 +18.6%" />
      <StatCard title="意向投资额" value="86.4" unit="亿元" tone="warning" />
    </div>

    <div class="map-layout">
      <div class="map-side">
        <PageCard title="筛选条件">
          <div class="map-filter">
            <label>所属区域</label>
            <a-select v-model:value="district" size="small" style="width: 100%">
              <a-select-option value="">全部区域</a-select-option>
              <a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option>
            </a-select>
            <label>产业方向</label>
            <a-select v-model:value="industry" size="small" style="width: 100%">
              <a-select-option value="">全部产业</a-select-option>
              <a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option>
            </a-select>
            <label>商机类型</label>
            <a-checkbox-group v-model:value="clueTypes" style="display: flex; flex-direction: column; gap: 4px">
              <a-checkbox value="增资扩产">增资扩产</a-checkbox>
              <a-checkbox value="新设总部">新设总部</a-checkbox>
              <a-checkbox value="研发中心">研发中心</a-checkbox>
              <a-checkbox value="迁移选址">迁移选址</a-checkbox>
            </a-checkbox-group>
            <a-input-search v-model:value="keyword" placeholder="搜索园区 / 商机" size="small" style="margin-top: 6px" />
          </div>
        </PageCard>
        <PageCard title="园区列表" :sub="`${filteredMarkers.length} 个`">
          <div class="map-park-list">
            <div
              v-for="m in filteredMarkers"
              :key="m.id"
              class="map-park-item"
              :class="{ active: current?.id === m.id }"
              @click="selectMarker(m)"
            >
              <div class="mp-name">{{ m.name }}</div>
              <div class="mp-meta">{{ m.type }} · {{ m.enterprises }} 家企业</div>
              <div class="mp-clue"><ThunderboltOutlined /> {{ m.clues }} 条商机</div>
            </div>
          </div>
        </PageCard>
      </div>

      <PageCard class="map-card">
        <div class="map-toolbar">
          <div class="map-legend">
            <span><i class="dot blue"></i> 特色园区</span>
            <span><i class="dot teal"></i> 综合园区</span>
            <span><i class="dot red"></i> 高潜商机</span>
          </div>
          <div class="flex gap8">
            <a-button size="small" @click="msg.info('地图已刷新（演示）')"><ReloadOutlined /> 刷新</a-button>
            <a-button size="small" @click="mapFull = !mapFull">{{ mapFull ? '退出全屏' : '全屏查看' }}</a-button>
          </div>
        </div>
        <div class="map-canvas" :class="{ full: mapFull }">
          <svg class="map-bg" viewBox="0 0 800 520" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#eef3ff" />
                <stop offset="1" stop-color="#e7f6f4" />
              </linearGradient>
            </defs>
            <rect width="800" height="520" fill="url(#mapGrad)" />
            <path d="M60 210 C140 120, 300 80, 420 120 C520 150, 560 90, 660 130 C740 165, 760 260, 700 320 C650 370, 690 440, 580 460 C460 480, 360 430, 250 460 C140 490, 40 400, 60 320 Z" fill="#fff" stroke="#c9d7f5" stroke-width="2" />
            <path d="M120 260 C200 200, 300 220, 340 280 C380 340, 480 300, 560 250" fill="none" stroke="#cfe0ff" stroke-width="9" stroke-linecap="round" />
            <path d="M200 180 C280 260, 420 220, 500 340 C540 400, 620 400, 660 360" fill="none" stroke="#d9f0ec" stroke-width="7" stroke-linecap="round" />
            <path d="M100 340 L700 340" stroke="#e2eaf8" stroke-width="1" stroke-dasharray="4 4" />
            <path d="M400 100 L400 470" stroke="#e2eaf8" stroke-width="1" stroke-dasharray="4 4" />
            <text x="80" y="150" fill="#9db4d9" font-size="11">嘉定区</text>
            <text x="330" y="110" fill="#9db4d9" font-size="11">杨浦区</text>
            <text x="470" y="200" fill="#9db4d9" font-size="11">浦东新区</text>
            <text x="160" y="430" fill="#9db4d9" font-size="11">松江区</text>
            <text x="590" y="450" fill="#9db4d9" font-size="11">奉贤区</text>
          </svg>
          <div
            v-for="m in filteredMarkers"
            :key="m.id"
            class="map-marker"
            :class="{ active: current?.id === m.id }"
            :style="{ left: m.x + '%', top: m.y + '%' }"
            @click="selectMarker(m)"
          >
            <span class="marker-pulse"></span>
            <span class="marker-dot"><EnvironmentOutlined /></span>
            <span class="marker-label">{{ m.name }}</span>
          </div>

          <div v-if="current" class="map-popup">
            <div class="popup-close" @click="current = null"><CloseOutlined /></div>
            <div class="popup-title">{{ current.name }}</div>
            <div class="popup-tag">{{ current.type }}</div>
            <div class="popup-stats">
              <div><b>{{ current.enterprises }}</b><span>入驻企业</span></div>
              <div><b>{{ current.clues }}</b><span>在库商机</span></div>
              <div><b>92%</b><span>入驻率</span></div>
            </div>
            <div class="popup-actions">
              <a-button size="small" @click="$router.push('/parksBuildings/index')">园区详情</a-button>
              <a-button size="small" type="primary" @click="clueDrawer = true">查看商机</a-button>
            </div>
          </div>
        </div>
      </PageCard>
    </div>

    <a-drawer v-model:open="clueDrawer" :title="(current?.name || '') + ' · 商机线索'" width="480px">
      <div v-for="c in mapClues" :key="c.id" class="map-clue-item">
        <div class="flex-between">
          <b>{{ c.company }}</b>
          <span class="tag-soft" :class="c.level === 'A' ? 'red' : 'orange'">{{ c.level }} 级</span>
        </div>
        <div class="map-clue-desc">{{ c.intent }}</div>
        <div class="map-clue-meta">{{ c.industry }} · {{ c.date }} · {{ c.status }}</div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { EnvironmentOutlined, ReloadOutlined, ThunderboltOutlined, CloseOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { mapMarkers, districts, industriesShort, clues } from '../data/mock';

const msg = message;
const district = ref('');
const industry = ref('');
const clueTypes = ref(['增资扩产', '新设总部']);
const keyword = ref('');
const current = ref(mapMarkers[0]);
const clueDrawer = ref(false);
const mapFull = ref(false);
const filteredMarkers = computed(() => mapMarkers.filter((m) => {
  if (keyword.value && !m.name.includes(keyword.value)) return false;
  return true;
}));
const mapClues = computed(() => clues.slice(0, 4));
function selectMarker(m) {
  current.value = m;
}
</script>

<style scoped>
.map-layout { display: grid; grid-template-columns: 300px 1fr; gap: 14px; align-items: start; }
.map-side .page-card { margin-bottom: 14px; }
.map-filter { display: flex; flex-direction: column; gap: 7px; font-size: 12px; color: #667085; }
.map-filter label { margin-top: 3px; }
.map-park-list { max-height: 420px; overflow-y: auto; margin: -4px -4px 0; }
.map-park-item { padding: 10px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.map-park-item:hover { background: #f7f9fe; }
.map-park-item.active { background: #f2f6ff; border-color: #c9d6fb; }
.mp-name { font-size: 12.5px; color: #344054; font-weight: 500; line-height: 1.5; }
.mp-meta { font-size: 11px; color: #98a2b3; margin-top: 3px; }
.mp-clue { font-size: 11px; color: #e08a2b; margin-top: 5px; }
.map-card { padding: 0; overflow: hidden; }
.map-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f3f8; }
.map-legend { display: flex; gap: 16px; font-size: 11.5px; color: #667085; }
.map-legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
.dot.blue { background: #4a62e7; } .dot.teal { background: #52c7b8; } .dot.red { background: #e04a4a; }
.map-canvas { position: relative; height: 620px; overflow: hidden; }
.map-canvas.full { position: fixed; inset: 0; z-index: 2000; height: 100vh; background: #eef3ff; }
.map-bg { width: 100%; height: 100%; }
.map-marker { position: absolute; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center; z-index: 3; }
.marker-dot { width: 28px; height: 28px; border-radius: 50% 50% 50% 0; background: #4a62e7; color: #fff; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(74, 98, 231, .4); }
.marker-dot .anticon { transform: rotate(45deg); font-size: 13px; }
.marker-label { margin-top: 5px; font-size: 10.5px; color: #344054; background: rgba(255, 255, 255, .92); border-radius: 3px; padding: 1px 6px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0, 0, 0, .08); }
.marker-pulse { position: absolute; top: -6px; width: 40px; height: 40px; border-radius: 50%; background: rgba(74, 98, 231, .16); animation: pulse 2s infinite; }
.map-marker.active .marker-dot { background: #e04a4a; box-shadow: 0 3px 10px rgba(224, 74, 74, .5); }
.map-marker.active .marker-pulse { background: rgba(224, 74, 74, .16); }
@keyframes pulse { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.4); opacity: 0; } }
.map-popup { position: absolute; right: 20px; bottom: 20px; width: 270px; background: #fff; border-radius: 8px; padding: 14px; box-shadow: 0 10px 30px rgba(16, 24, 40, .16); z-index: 6; }
.popup-close { position: absolute; right: 10px; top: 8px; color: #98a2b3; cursor: pointer; font-size: 11px; }
.popup-title { font-size: 13.5px; font-weight: 600; color: #344054; line-height: 1.5; padding-right: 14px; }
.popup-tag { font-size: 11px; color: #4a62e7; margin: 4px 0 10px; }
.popup-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #f8fafd; border-radius: 6px; padding: 9px; margin-bottom: 10px; }
.popup-stats div { text-align: center; }
.popup-stats b { display: block; font-size: 15px; color: #344054; }
.popup-stats span { font-size: 10px; color: #98a2b3; }
.popup-actions { display: flex; gap: 8px; justify-content: flex-end; }
.map-clue-item { border: 1px solid #eef0f5; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
.map-clue-desc { font-size: 12.5px; color: #4b5563; margin: 8px 0 5px; line-height: 1.7; }
.map-clue-meta { font-size: 11px; color: #98a2b3; }
</style>
