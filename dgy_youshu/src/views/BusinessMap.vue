<template>
  <div>
    <div class="page-head">
      <h2>商机地图</h2>
      <p>查看上海园区分布、企业规模与招商线索</p>
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
              <div class="mp-meta">{{ m.district }} · {{ m.industry }}</div>
              <div class="mp-clue">{{ m.enterprises.toLocaleString() }} 家企业 <span>·</span> {{ m.clues }} 条线索</div>
            </div>
          </div>
        </PageCard>
      </div>

      <PageCard class="map-card" :class="{ 'map-card-full': mapFull }">
        <div class="map-toolbar">
          <div class="map-toolbar-top">
            <div class="map-legend">
              <span><i class="dot pin-featured"></i> 特色园区</span>
              <span><i class="dot pin-general"></i> 综合园区</span>
              <span class="map-source"><span class="map-live-indicator" :class="amapState"></span>{{ amapState === 'ready' ? '高德地图 · 演示点位' : amapState === 'loading' ? '正在加载地图' : '本地示意图' }}</span>
            </div>
            <a-input-search
              v-model:value="addressKeyword"
              class="map-address-search"
              placeholder="搜索地址，如：东方美谷"
              enter-button="定位"
              allow-clear
              :loading="addressSearching"
              :disabled="amapState !== 'ready' || selectionActive"
              @search="searchAddress"
            />
          </div>
          <div class="map-toolbar-bottom">
            <div class="map-actions">
              <a-button size="small" :disabled="amapState !== 'ready'" @click="enablePanMode"><DragOutlined /> 拖动画布</a-button>
              <a-button size="small" type="primary" :disabled="amapState !== 'ready'" @click="startRectangleSelection"><SelectOutlined /> {{ selectionActive ? '正在框选' : hasSelection ? '重新框选' : '框选企业' }}</a-button>
              <a-button v-if="hasSelection" size="small" :disabled="selectionActive" @click="enterpriseDrawer = true"><UnorderedListOutlined /> 查看框选企业</a-button>
              <a-button size="small" @click="resetMap"><ReloadOutlined /> 重置</a-button>
              <a-button size="small" @click="mapFull = !mapFull"><FullscreenExitOutlined v-if="mapFull" /><FullscreenOutlined v-else /> {{ mapFull ? '退出全屏' : '全屏查看' }}</a-button>
            </div>
            <span v-if="hasSelection && !selectionActive" class="selection-result">注册 {{ selectionAnalysis.registered.length }} · 办公 {{ selectionAnalysis.offices.length }}</span>
          </div>
          <div class="map-notice" :class="noticeTone" aria-live="polite">{{ mapNotice }}</div>
        </div>
        <div class="map-canvas" :class="{ full: mapFull, selecting: selectionActive }">
          <div ref="mapRoot" class="map-live"></div>
          <div v-if="amapState !== 'ready'" class="map-fallback">
            <svg class="map-bg" viewBox="0 0 800 520" preserveAspectRatio="none" aria-hidden="true">
              <rect width="800" height="520" fill="#F2F4F7" />
              <path d="M60 210 C140 120, 300 80, 420 120 C520 150, 560 90, 660 130 C740 165, 760 260, 700 320 C650 370, 690 440, 580 460 C460 480, 360 430, 250 460 C140 490, 40 400, 60 320 Z" fill="#F2F4F7" stroke="#B7CDE9" stroke-width="2" />
              <path d="M120 260 C200 200, 300 220, 340 280 C380 340, 480 300, 560 250" fill="none" stroke="#B7CDE9" stroke-width="8" stroke-linecap="round" />
              <path d="M200 180 C280 260, 420 220, 500 340 C540 400, 620 400, 660 360" fill="none" stroke="#B7CDE9" stroke-width="7" stroke-linecap="round" />
              <path d="M100 340 L700 340" stroke="#B7CDE9" stroke-width="1" stroke-dasharray="4 5" />
              <path d="M400 100 L400 470" stroke="#B7CDE9" stroke-width="1" stroke-dasharray="4 5" />
              <text x="80" y="150" fill="#777168" font-size="13">嘉定区</text>
              <text x="330" y="110" fill="#777168" font-size="13">杨浦区</text>
              <text x="470" y="200" fill="#777168" font-size="13">浦东新区</text>
              <text x="160" y="430" fill="#777168" font-size="13">松江区</text>
              <text x="590" y="450" fill="#777168" font-size="13">奉贤区</text>
            </svg>
            <div
              v-for="m in filteredMarkers"
              :key="m.id"
              class="map-marker"
              :class="[{ active: current?.id === m.id }, m.type === '特色园区' ? 'featured' : 'general']"
              :style="{ left: m.x + '%', top: m.y + '%' }"
              @click="selectMarker(m)"
            >
              <span class="marker-dot"><EnvironmentOutlined /></span>
              <span class="marker-label">{{ m.name }}</span>
            </div>
            <div v-if="amapState === 'missing'" class="map-setup-note">
              <strong>地图服务尚未配置</strong>
              <span>接入高德地图后显示实时底图；当前为园区点位示意图。</span>
            </div>
            <div v-else-if="amapState === 'error'" class="map-setup-note map-error-note">
              <strong>地图暂时无法加载</strong>
              <span>请检查网络及高德地图配置后重试。</span>
              <a-button size="small" @click="initAmap">重试</a-button>
            </div>
          </div>

          <div v-if="current && !selectionActive" class="map-popup">
            <button class="popup-close" aria-label="关闭园区详情" @click="current = null"><CloseOutlined /></button>
            <div class="popup-title">{{ current.name }}</div>
            <div class="popup-tag">{{ current.district }} · {{ current.industry }}</div>
            <div class="popup-stats">
              <div><b>{{ current.enterprises }}</b><span>入驻企业</span></div>
              <div><b>{{ current.clues }}</b><span>在库商机</span></div>
              <div><b>92%</b><span>入驻率</span></div>
            </div>
            <div class="popup-actions">
              <a-button size="small" @click="$router.push('/parksBuildings/index')">园区详情</a-button>
              <a-button size="small" type="primary" @click="openClueDrawer">查看商机</a-button>
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

    <BusinessMapEnterpriseDrawer v-model:open="enterpriseDrawer" :analysis="selectionAnalysis" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, nextTick, ref, shallowRef, watch } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import {
  CloseOutlined,
  DragOutlined,
  EnvironmentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  SelectOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import BusinessMapEnterpriseDrawer from '../components/BusinessMapEnterpriseDrawer.vue';
import { mapMarkers, districts, industriesShort, clues } from '../data/mock';
import { emptyEnterpriseAnalysis, filterEnterprisesByBounds } from '../utils/business-map';

const district = ref('');
const industry = ref('');
const clueTypes = ref(['增资扩产', '新设总部']);
const keyword = ref('');
const current = ref(mapMarkers[0]);
const clueDrawer = ref(false);
const mapFull = ref(false);
const amapState = ref('loading');
const mapRoot = ref(null);
const mapInstance = shallowRef(null);
const amapMarkers = shallowRef([]);
const markerPins = new Map();
let markerSyncFrame = 0;
let activeAMap = null;
let mouseTool = null;
let placeSearch = null;
let selectionRectangle = null;
let searchMarker = null;
let disposed = false;

const addressKeyword = ref('');
const addressSearching = ref(false);
const selectionActive = ref(false);
const hasSelection = ref(false);
const enterpriseDrawer = ref(false);
const selectionAnalysis = ref(emptyEnterpriseAnalysis());
const mapNotice = ref('可拖动画布浏览园区，或点击“框选企业”分析指定范围内的企业。');
const noticeTone = ref('info');

const amapKey = (import.meta.env.VITE_AMAP_KEY || '').trim();
const amapSecurityCode = (import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim();
const filteredMarkers = computed(() => mapMarkers.filter((m) => {
  const query = keyword.value.trim().toLowerCase();
  if (query && !`${m.name} ${m.district} ${m.industry}`.toLowerCase().includes(query)) return false;
  if (district.value && m.district !== district.value) return false;
  if (industry.value && m.industry !== industry.value) return false;
  if (clueTypes.value.length && !m.clueTypes.some((type) => clueTypes.value.includes(type))) return false;
  return true;
}));
const mapClues = computed(() => clues.slice(0, 4));

function setNotice(text, tone = 'info') {
  mapNotice.value = text;
  noticeTone.value = tone;
}

function selectMarker(m, focusMap = true) {
  if (!m) return;
  current.value = m;
  updateActiveMarker();
  if (focusMap && mapInstance.value) {
    mapInstance.value.setZoomAndCenter(Math.max(11, mapInstance.value.getZoom()), [m.lng, m.lat]);
  }
}

function openClueDrawer() {
  mapFull.value = false;
  clueDrawer.value = true;
}

function syncAmapMarkers(fitView = false) {
  const map = mapInstance.value;
  const AMap = window.AMap;
  if (!map || !AMap) return;
  const markers = filteredMarkers.value.map((item) => {
    const pin = document.createElement('div');
    pin.className = `amap-park-pin ${item.type === '特色园区' ? 'featured' : 'general'}${current.value?.id === item.id ? ' active' : ''}`;
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', item.name);
    pin.innerHTML = '<span></span>';
    const marker = new AMap.Marker({
      position: [item.lng, item.lat],
      content: pin,
      offset: new AMap.Pixel(0, -3),
      title: item.name,
      topWhenClick: true,
    });
    marker.on('click', () => selectMarker(item));
    return marker;
  });
  amapMarkers.value.forEach((marker) => marker.setMap(null));
  markerPins.clear();
  amapMarkers.value = markers;
  markers.forEach((marker, index) => markerPins.set(filteredMarkers.value[index].id, marker.getContent()));
  if (markers.length) {
    map.add(markers);
    if (fitView && markers.length > 1) map.setFitView(markers, false, [54, 54, 54, 54], 10);
    else if (fitView) map.setZoomAndCenter(11, [filteredMarkers.value[0].lng, filteredMarkers.value[0].lat]);
  }
}

function updateActiveMarker() {
  markerPins.forEach((pin, id) => pin.classList.toggle('active', current.value?.id === id));
}

function scheduleMarkerSync(fitView = false) {
  cancelAnimationFrame(markerSyncFrame);
  markerSyncFrame = requestAnimationFrame(() => syncAmapMarkers(fitView));
}

function setDrawingState(selecting) {
  const map = mapInstance.value;
  if (!map) return;
  map.setStatus({ dragEnable: !selecting, zoomEnable: true });
  map.setDefaultCursor(selecting ? 'crosshair' : 'default');
}

function removeSelection() {
  if (selectionRectangle && mapInstance.value) mapInstance.value.remove(selectionRectangle);
  selectionRectangle = null;
  hasSelection.value = false;
  selectionAnalysis.value = emptyEnterpriseAnalysis();
}

function removeSearchMarker() {
  if (searchMarker && mapInstance.value) mapInstance.value.remove(searchMarker);
  searchMarker = null;
}

function handleRectangleDraw(event) {
  if (disposed || !event.obj) return;
  selectionRectangle = event.obj;
  selectionAnalysis.value = filterEnterprisesByBounds(event.obj.getBounds());
  hasSelection.value = true;
  selectionActive.value = false;
  mouseTool?.close(false);
  setDrawingState(false);
  mapFull.value = false;
  enterpriseDrawer.value = true;
  setNotice(`框选完成：注册企业 ${selectionAnalysis.value.registered.length} 家，办公企业 ${selectionAnalysis.value.offices.length} 家。`, 'success');
}

function startRectangleSelection() {
  if (!mapInstance.value || !mouseTool || amapState.value !== 'ready') return;
  mouseTool.close(true);
  removeSelection();
  enterpriseDrawer.value = false;
  current.value = null;
  selectionActive.value = true;
  setDrawingState(true);
  mouseTool.rectangle({
    strokeColor: '#1652B8',
    strokeWeight: 2,
    fillColor: '#1652B8',
    fillOpacity: 0.12,
  });
  setNotice('请在地图上按住鼠标左键并拖动，松开完成矩形框选；点击“拖动画布”可取消。');
}

function enablePanMode() {
  if (!mapInstance.value) return;
  if (selectionActive.value) mouseTool?.close(true);
  selectionActive.value = false;
  setDrawingState(false);
  setNotice(hasSelection.value ? '已恢复拖动画布，原框选结果保留。' : '可按住鼠标左键拖动地图，使用滚轮缩放。');
}

function searchAddress() {
  const query = addressKeyword.value.trim();
  if (!query) {
    setNotice('请输入需要查询的地址或地点名称。', 'warning');
    return;
  }
  if (!placeSearch || !mapInstance.value || addressSearching.value) return;
  addressSearching.value = true;
  setNotice(`正在查询“${query}”…`);
  placeSearch.search(query, (status, result) => {
    addressSearching.value = false;
    if (disposed) return;
    const poi = status === 'complete' ? result?.poiList?.pois?.[0] : null;
    if (!poi?.location) {
      setNotice(status === 'error' ? '地址查询失败，请检查网络后重试。' : '未找到匹配地址，请尝试更完整的地点名称。', 'warning');
      return;
    }
    removeSearchMarker();
    searchMarker = new activeAMap.Marker({
      position: poi.location,
      title: poi.name,
    });
    mapInstance.value.add(searchMarker);
    mapInstance.value.setZoomAndCenter(15, poi.location);
    setNotice(`已定位到“${poi.name}”，可继续拖动或框选周边企业。`, 'success');
  });
}

async function initAmap() {
  if (!amapKey || !amapSecurityCode) {
    amapState.value = 'missing';
    setNotice('当前为本地示意图，配置高德地图后可使用拖动、框选及地址搜索。', 'warning');
    return;
  }
  amapState.value = 'loading';
  window._AMapSecurityConfig = { securityJsCode: amapSecurityCode };
  try {
    const AMap = await AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.MouseTool', 'AMap.PlaceSearch'],
    });
    if (disposed || !mapRoot.value) return;
    activeAMap = AMap;
    mapInstance.value?.destroy();
    mapInstance.value = new AMap.Map(mapRoot.value, {
      viewMode: '2D',
      zoom: 9.5,
      center: [121.4737, 31.2304],
      resizeEnable: true,
      dragEnable: true,
      zoomEnable: true,
    });
    mapInstance.value.addControl(new AMap.Scale());
    mouseTool = new AMap.MouseTool(mapInstance.value);
    mouseTool.on('draw', handleRectangleDraw);
    placeSearch = new AMap.PlaceSearch({ city: '上海', citylimit: true, pageSize: 1 });
    amapState.value = 'ready';
    setDrawingState(false);
    await nextTick();
    syncAmapMarkers(true);
  } catch {
    if (!disposed) {
      amapState.value = 'error';
      setNotice('地图暂时无法加载，请检查网络及高德配置后重试。', 'warning');
    }
  }
}

function resetMap() {
  mouseTool?.close(true);
  selectionActive.value = false;
  setDrawingState(false);
  removeSelection();
  removeSearchMarker();
  enterpriseDrawer.value = false;
  addressKeyword.value = '';
  addressSearching.value = false;
  current.value = filteredMarkers.value[0] || null;
  if (mapInstance.value) scheduleMarkerSync(true);
  setNotice('已清除框选及地址定位结果，并恢复园区视野。');
}

function handleKeydown(event) {
  if (event.key !== 'Escape') return;
  if (selectionActive.value) enablePanMode();
  else if (mapFull.value) mapFull.value = false;
}

watch(filteredMarkers, (markers) => {
  if (!markers.length) current.value = null;
  else if (!markers.some((item) => item.id === current.value?.id)) current.value = markers[0];
}, { deep: true });
watch(filteredMarkers, () => scheduleMarkerSync(true));
watch(current, updateActiveMarker);
watch(mapFull, () => nextTick(() => mapInstance.value?.resize()));
onMounted(() => {
  disposed = false;
  window.addEventListener('keydown', handleKeydown);
  initAmap();
});
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('keydown', handleKeydown);
  cancelAnimationFrame(markerSyncFrame);
  mouseTool?.off('draw', handleRectangleDraw);
  mouseTool?.close(true);
  amapMarkers.value.forEach((marker) => marker.setMap(null));
  markerPins.clear();
  mapInstance.value?.destroy();
});
</script>

<style scoped>
.map-layout { display: grid; grid-template-columns: minmax(256px, 280px) minmax(0, 1fr); gap: 14px; align-items: stretch; }
.map-side { display:flex; flex-direction:column; gap:12px; min-width:0; }
.map-side .page-card { margin:0; }
.map-side .page-card:last-child { flex:1; min-height:0; }
.map-filter { display: flex; flex-direction: column; gap: 9px; font-size: 13px; color: #555149; }
.map-filter label { margin-top: 3px; }
.map-park-list { height: 280px; overflow-y: auto; margin: 0 -4px -4px; padding-right:2px; }
.map-park-item { padding: 12px 11px; border-radius: 7px; cursor: pointer; border: 1px solid transparent; }
.map-park-item:hover { background: #F2F4F7; }
.map-park-item.active { background: #F2F4F7; border-color: #B7CDE9; }
.mp-name { font-size: 13.5px; color: #303b49; font-weight: 600; line-height: 1.5; }
.mp-meta { font-size: 12px; color: #6f6a62; margin-top: 4px; }
.mp-clue { font-size: 12px; color: #1652B8; margin-top: 5px; }
.mp-clue span { margin-inline: 4px; color:#aaa39a; }
.map-card { display:flex; min-width:0; flex-direction:column; padding: 0; overflow: hidden; }
.map-card.map-card-full { position:fixed; inset:0; z-index:2000; border-radius:0; }
.map-toolbar { display:flex; flex-direction:column; gap:9px; padding:10px 16px; border-bottom:1px solid #e9edf2; background:#fff; }
.map-toolbar-top,.map-toolbar-bottom { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.map-toolbar-bottom { min-height:28px; }
.map-address-search { width:min(320px,38vw); }
.map-actions { display:flex; flex-wrap:wrap; gap:8px; }
.map-actions .ant-btn + .ant-btn { margin-inline-start:0; }
.map-legend { display: flex; align-items:center; flex-wrap:wrap; gap: 14px; font-size: 12px; color: #5f5a52; }
.map-legend .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 5px; }
.dot.pin-featured { background: #1652B8; } .dot.pin-general { background: #647B96; }
.map-source { display:inline-flex; align-items:center; gap:6px; margin-left:4px; padding-left:13px; border-left:1px solid #e6ebf0; color:#69645c; }
.map-live-indicator { width:7px; height:7px; border-radius:50%; background:#1652B8; }
.map-live-indicator.ready { background:#5d806d; }
.map-live-indicator.error { background:#a75943; }
.selection-result { flex:none; color:#1652b8; font-size:12px; font-weight:600; }
.map-notice { color:#6b7580; font-size:11.5px; line-height:1.5; }
.map-notice.success { color:#346b4e; }
.map-notice.warning { color:#8a5a24; }
.map-canvas { position: relative; flex:1; min-height:520px; height:clamp(520px, calc(var(--workspace-height, 900px) - 320px), 720px); overflow: hidden; isolation:isolate; }
.map-canvas.full { height:auto; min-height:0; }
.map-canvas.selecting :deep(.amap-container) { cursor:crosshair; }
.map-live,.map-fallback { position:absolute; inset:0; }
.map-live { z-index:1; }
.map-fallback { z-index:1; overflow:hidden; background:#F2F4F7; }
.map-bg { display:block; width: 100%; height: 100%; }
.map-marker { position: absolute; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center; z-index: 3; }
.marker-dot { width: 27px; height: 27px; border:2px solid rgba(255,255,255,.95); border-radius: 50% 50% 50% 0; background: #1652B8; color: #fff; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(43,37,31,.24); }
.map-marker.general .marker-dot { background:#647B96; }
.marker-dot .anticon { transform: rotate(45deg); font-size: 12px; }
.marker-label { margin-top: 5px; font-size: 12px; font-weight:600; color: #303b49; background: rgba(255, 254, 250, .97); border:1px solid rgba(220,214,202,.9); border-radius: 4px; padding: 2px 7px; white-space: nowrap; box-shadow: 0 1px 3px rgba(34,31,27,.1); }
.map-marker.active .marker-dot { background: #1652B8; box-shadow: 0 0 0 4px rgba(22,82,184,.18),0 2px 6px rgba(43,37,31,.22); }
:global(.amap-park-pin) { position:relative; width:22px; height:22px; border:3px solid #fff; border-radius:50%; background:#1652B8; box-shadow:0 2px 7px rgba(42,37,31,.35); cursor:pointer; }
:global(.amap-park-pin.featured) { background:#1652B8!important; }
:global(.amap-park-pin.general) { background:#647B96; }
:global(.amap-park-pin)::after { position:absolute; inset:4px; border-radius:50%; background:#fff; content:""; }
:global(.amap-park-pin.active) { outline:4px solid rgba(22,82,184,.20); transform:scale(1.12); }
.map-setup-note { position:absolute; z-index:4; left:18px; bottom:18px; display:flex; max-width:300px; flex-direction:column; gap:4px; padding:11px 14px; border:1px solid rgba(219,213,202,.92); border-radius:7px; background:rgba(255,254,250,.94); box-shadow:0 3px 12px rgba(39,35,30,.07); }
.map-setup-note strong { color:#49443d; font-size:12px; }
.map-setup-note span { color:#716c63; font-size:11.5px; }
.map-error-note { border-color:#B7CDE9; }
.map-popup { position: absolute; right: 18px; bottom: 18px; width: 292px; background: #F2F4F7; border:1px solid #F2F4F7; border-radius: 9px; padding: 16px; box-shadow: 0 8px 25px rgba(37,34,29,.16); z-index: 6; }
.popup-close { position: absolute; display:grid; place-items:center; width:28px; height:28px; right: 8px; top: 8px; border:0; border-radius:5px; background:transparent; color: #817a70; cursor: pointer; font-size: 12px; }
.popup-close:hover { background:#F2F4F7; color:#303b49; }
.popup-close:focus-visible { outline:2px solid #1652b8; outline-offset:2px; }
.popup-title { font-size: 15px; font-weight: 650; color: #303b49; line-height: 1.5; padding-right: 22px; }
.popup-tag { font-size: 12px; color: #1652B8; margin: 4px 0 12px; }
.popup-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F2F4F7; border:1px solid #F2F4F7; border-radius: 6px; padding: 10px; margin-bottom: 12px; }
.popup-stats div { text-align: center; }
.popup-stats b { display: block; font-size: 16px; color: #303b49; }
.popup-stats span { font-size: 11px; color: #706a61; }
.popup-actions { display: flex; gap: 8px; justify-content: flex-end; }
.map-clue-item { border: 1px solid #F2F4F7; border-radius: 7px; padding: 13px; margin-bottom: 10px; }
.map-clue-desc { font-size: 13px; color: #49453f; margin: 8px 0 5px; line-height: 1.7; }
.map-clue-meta { font-size: 12px; color: #706b63; }
@media (max-width: 1050px) {
  .map-layout { grid-template-columns: minmax(235px, 260px) minmax(0,1fr); }
  .map-canvas { min-height:500px; }
  .map-toolbar-top { align-items:flex-start; flex-direction:column; }
  .map-address-search { width:100%; }
}
@media (max-width: 760px) {
  .map-layout { grid-template-columns:1fr; }
  .map-side { display:grid; grid-template-columns:1fr 1fr; align-items:start; }
  .map-park-list { height:260px; min-height:260px; }
  .map-canvas { min-height:520px; height:65vh; }
  .map-legend { gap:8px; }
  .map-source { border:0; margin:0; padding:0; }
  .map-popup { right:10px; bottom:10px; width:min(292px,calc(100% - 20px)); }
  .map-actions :deep(.ant-btn) { min-height:36px; }
}
@media (max-width: 520px) {
  .map-side { grid-template-columns:1fr; }
  .map-filter { display:grid; grid-template-columns:1fr 1fr; align-items:center; }
  .map-filter label { margin:0; }
  .map-filter .ant-input-search { grid-column:1/-1; }
  .map-canvas { min-height:470px; height:60vh; }
  .map-toolbar { padding:10px 12px; }
  .map-toolbar-bottom { align-items:flex-start; flex-direction:column; }
}
@media (prefers-reduced-motion:reduce) {
  .map-card,.map-canvas { scroll-behavior:auto; }
}
</style>
