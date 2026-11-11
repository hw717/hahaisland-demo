const els = {
  sceneFrame: document.querySelector("#sceneFrame"),
  sceneTransform: document.querySelector("#sceneTransform"),
  worldNodes: document.querySelector("#worldNodes"),
  activeCount: document.querySelector("#activeCount"),
  themeDock: document.querySelector("#themeDock"),
  zoomValue: document.querySelector("#zoomValue"),
  progressValue: document.querySelector("#progressValue"),
  progressTotal: document.querySelector("#progressTotal"),
  progressFill: document.querySelector("#progressFill"),
  activityPanel: document.querySelector("#activityPanel"),
  panelNpc: document.querySelector("#panelNpc"),
  panelGuideName: document.querySelector("#panelGuideName"),
  activityKicker: document.querySelector("#activityKicker"),
  activityTitle: document.querySelector("#activityTitle"),
  activityDescription: document.querySelector("#activityDescription"),
  activityDuration: document.querySelector("#activityDuration"),
  activityReward: document.querySelector("#activityReward"),
  startActivity: document.querySelector("#startActivity"),
  toast: document.querySelector("#toast"),
  toastText: document.querySelector("#toastText"),
  dragTip: document.querySelector("#dragTip"),
  mapViewport: document.querySelector("#mapViewport"),
  campusMapView: document.querySelector("#campusMapView"),
  mapStage: document.querySelector("#mapStage"),
  mapCanvas: document.querySelector("#mapCanvas"),
  campusMapImage: document.querySelector("#campusMapImage"),
  mapPins: document.querySelector("#mapPins"),
  poiPins: document.querySelector("#poiPins"),
  poiExplorer: document.querySelector("#poiExplorer"),
  poiExplorerToggle: document.querySelector("#poiExplorerToggle"),
  poiExplorerPanel: document.querySelector("#poiExplorerPanel"),
  poiDatasetLabel: document.querySelector("#poiDatasetLabel"),
  poiTotalCount: document.querySelector("#poiTotalCount"),
  poiVisibleCount: document.querySelector("#poiVisibleCount"),
  poiVisitedCount: document.querySelector("#poiVisitedCount"),
  poiFilters: document.querySelector("#poiFilters"),
  poiDetail: document.querySelector("#poiDetail"),
  mapThemeSwitcher: document.querySelector("#mapThemeSwitcher"),
  mapViewTitle: document.querySelector("#mapViewTitle"),
  mapViewSubtitle: document.querySelector("#mapViewSubtitle"),
  locateButtonText: document.querySelector("#locateButton span"),
  locationDebugToggle: document.querySelector("#locationDebugToggle"),
  locationDebugPanel: document.querySelector("#locationDebugPanel"),
  mockLocationPreset: document.querySelector("#mockLocationPreset"),
  mockLatitude: document.querySelector("#mockLatitude"),
  mockLongitude: document.querySelector("#mockLongitude"),
  pickLocation: document.querySelector("#pickLocation"),
  randomLocation: document.querySelector("#randomLocation"),
  applyMockLocation: document.querySelector("#applyMockLocation"),
  geoCalibrationLabel: document.querySelector("#geoCalibrationLabel"),
  locationAccuracy: document.querySelector("#locationAccuracy"),
  geoNorthWest: document.querySelector("#geoNorthWest"),
  geoNorthEast: document.querySelector("#geoNorthEast"),
  geoSouthWest: document.querySelector("#geoSouthWest"),
  geoSouthEast: document.querySelector("#geoSouthEast"),
  playerLocation: document.querySelector("#playerLocation"),
  playerCoordinates: document.querySelector("#playerCoordinates"),
  playLayer: document.querySelector("#playLayer"),
  playScrim: document.querySelector("#playScrim"),
  playClose: document.querySelector("#playClose"),
  playKicker: document.querySelector("#playKicker"),
  playTitle: document.querySelector("#playTitle"),
  playModeBadge: document.querySelector("#playModeBadge"),
  playProgressFill: document.querySelector("#playProgressFill"),
  playProgressText: document.querySelector("#playProgressText"),
  playNpc: document.querySelector("#playNpc"),
  playGuideText: document.querySelector("#playGuideText"),
  playWorkspace: document.querySelector("#playWorkspace"),
  playHint: document.querySelector("#playHint"),
  playSecondary: document.querySelector("#playSecondary"),
  playPrimary: document.querySelector("#playPrimary"),
  referenceMapToggle: document.querySelector("#referenceMapToggle"),
  referenceLocator: document.querySelector("#referenceLocator"),
  referenceTileMap: document.querySelector("#referenceTileMap"),
  referenceTiles: document.querySelector("#referenceTiles"),
  referenceCoordinates: document.querySelector("#referenceCoordinates"),
  referenceScale: document.querySelector("#referenceScale"),
  referenceCollapse: document.querySelector("#referenceCollapse"),
  mapScaleRatio: document.querySelector("#mapScaleRatio"),
  mapScaleBar: document.querySelector("#mapScaleBar"),
  mapScaleDistance: document.querySelector("#mapScaleDistance"),
  nearbyTaskPrompt: document.querySelector("#nearbyTaskPrompt"),
  nearbyTaskIcon: document.querySelector("#nearbyTaskIcon"),
  nearbyTaskStatus: document.querySelector("#nearbyTaskStatus"),
  nearbyTaskName: document.querySelector("#nearbyTaskName"),
  nearbyTaskDistance: document.querySelector("#nearbyTaskDistance"),
  nearbyTaskAction: document.querySelector("#nearbyTaskAction"),
  movementPrecision: document.querySelector("#movementPrecision"),
  joystickBase: document.querySelector("#joystickBase"),
  joystickKnob: document.querySelector("#joystickKnob")
};

const state = {
  data: null,
  poiData: null,
  poiCommunityData: null,
  navigationOpen: false,
  myIslandOpen: false,
  islandId: null,
  selectedSpotId: null,
  selectedPoiId: null,
  poiFilter: "all",
  scale: 1,
  x: 0,
  y: 0,
  drag: null,
  view: "home",
  mapScale: 1,
  mapX: 0,
  mapY: 0,
  mapDrag: null,
  mapPickStart: null,
  location: null,
  locationByIsland: {},
  locationPicking: false,
  sceneTransitionTimer: null,
  mapTransitionTimer: null,
  driftProfiles: new Map(),
  toastTimer: null,
  playTimer: null,
  playAudio: null,
  game: null,
  referenceVisible: true,
  referenceExpanded: false,
  referenceRenderTime: 0,
  nearbyPointId: null,
  nearbyPoint: null,
  nearbyInRange: false,
  proximityAutoZoom: false,
  preProximityScale: 1,
  suppressProximityAutoZoom: false,
  joystick: { active: false, pointerId: null, x: 0, y: 0, frame: null, lastTime: 0 },
  movementKeys: new Set(),
  saved: { completed: {}, moods: [], community: [], visitedPois: {}, layers: {}, activityRecords: {} },
  layers: { grid: true, labels: true, points: true, reference: true }
};

const STORAGE_KEY = "hahaisland-blueprint-demo-v1";
const activityExtensions = new Map();
const INTERACTION_RADIUS_METERS = 10;
const NEARBY_NOTICE_RADIUS_METERS = 60;
const PROXIMITY_ZOOM_RADIUS_METERS = 40;
const BASE_MAP_SCALE_DENOMINATOR = 1000;
const PROXIMITY_SCALE_DENOMINATOR = 400;
const PROXIMITY_ZOOM_SCALE = BASE_MAP_SCALE_DENOMINATOR / PROXIMITY_SCALE_DENOMINATOR;
const MAX_MAP_SCALE = PROXIMITY_ZOOM_SCALE;
const MAP_ZOOM_TRANSITION_MS = 900;
const SIMULATED_LOCATION_ACCURACY_METERS = 3;
const CRUISE_SPEED_METERS_PER_SECOND = 60;
const APPROACH_SPEED_METERS_PER_SECOND = 24;
const PRECISION_SPEED_METERS_PER_SECOND = 6;
const CAMPUS_TILE_ZOOM = 17;

function currentIsland() {
  return state.data.islands.find((island) => island.id === state.islandId);
}

function currentSpot() {
  return currentIsland()?.hotspots.find((spot) => spot.id === state.selectedSpotId);
}

function currentPointDataset() {
  const datasetId = currentIsland()?.pointDataset;
  return datasetId ? state.poiData?.datasets?.[datasetId] : null;
}

function pointDatasetForIsland(island) {
  return island?.pointDataset ? state.poiData?.datasets?.[island.pointDataset] : null;
}

function poiVisitKey(point, islandId = state.islandId) {
  return `${islandId}:${point.id}`;
}

function completedPointCount(island) {
  const dataset = pointDatasetForIsland(island);
  return dataset ? dataset.points.filter((point) => state.saved.visitedPois[poiVisitKey(point, island.id)]).length : 0;
}

function currentPoi() {
  return currentPointDataset()?.points.find((point) => point.id === state.selectedPoiId);
}

function poiCommunityEntry(point) {
  if (!point || currentIsland()?.pointDataset !== state.poiCommunityData?.dataset) return null;
  return state.poiCommunityData?.points?.[point.id] || null;
}

function currentGeoReference() {
  const island = currentIsland();
  const dataset = currentPointDataset();
  if (dataset && state.poiData?.bounds) {
    const bounds = dataset.bounds || state.poiData.bounds;
    return {
      label: `${dataset.label}点位标定`,
      crs: state.poiData.crs || "WGS84",
      bounds,
      defaultLocation: island.defaultLocation || {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2,
        accuracy: SIMULATED_LOCATION_ACCURACY_METERS
      },
      controlPoints: [
        { name: "西北角", x: 0, y: 0, lat: bounds.north, lng: bounds.west },
        { name: "东北角", x: 100, y: 0, lat: bounds.north, lng: bounds.east },
        { name: "西南角", x: 0, y: 100, lat: bounds.south, lng: bounds.west },
        { name: "东南角", x: 100, y: 100, lat: bounds.south, lng: bounds.east }
      ]
    };
  }
  return state.data.geoReference;
}

function geoBounds() {
  return currentGeoReference().bounds;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function loadSavedState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state.saved.completed = saved.completed && typeof saved.completed === "object" ? saved.completed : {};
      state.saved.moods = Array.isArray(saved.moods) ? saved.moods.slice(-20) : [];
      state.saved.community = Array.isArray(saved.community) ? saved.community.slice(-12) : [];
      state.saved.visitedPois = saved.visitedPois && typeof saved.visitedPois === "object" ? saved.visitedPois : {};
      state.saved.layers = saved.layers && typeof saved.layers === "object" ? saved.layers : {};
      state.saved.activityRecords = saved.activityRecords && typeof saved.activityRecords === "object" && !Array.isArray(saved.activityRecords) ? saved.activityRecords : {};
      Object.keys(state.layers).forEach((key) => {
        if (typeof state.saved.layers[key] === "boolean") state.layers[key] = state.saved.layers[key];
      });
    }
  } catch (error) {
    console.warn("Local demo progress could not be restored", error);
  }
}

function persistSavedState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved));
    return true;
  } catch (error) {
    console.warn("Local demo progress could not be saved", error);
    showToast("存储空间不足，这次记录暂未保存。可先导出已有作品。");
    return false;
  }
}

function hydrateCompletedSpots() {
  state.data.islands.forEach((island) => {
    island.hotspots.forEach((spot) => {
      spot.status = activityStatus(island, spot);
    });
  });
}

function islandActivities(island) {
  return island.hotspots.filter(spot => spot.id !== "nearby" && !(island.id === "art" && spot.id === "moon"));
}

function activityStatus(island, spot) {
  if (state.saved.completed[island.id + ":" + spot.id]) return "completed";
  if (spot.requires && !state.saved.completed[island.id + ":" + spot.requires]) return "locked";
  return "available";
}

function completedActivityCount(island) {
  return islandActivities(island).filter(spot => state.saved.completed[island.id + ":" + spot.id]).length;
}

function activitySnapshots(island) {
  return islandActivities(island).map(spot => ({id:spot.id,title:spot.title,description:spot.description,
    duration:spot.duration,reward:spot.reward,status:activityStatus(island,spot),
    requires:spot.requires ? island.hotspots.find(item=>item.id===spot.requires)?.title : null,
    record:state.saved.activityRecords[island.id+":"+spot.id] || null}));
}

function openIslandActivities(islandId = state.islandId) {
  if (!state.data.islands.some(island=>island.id===islandId)) return;
  closeGameplay(); closePanel();
  if (state.islandId !== islandId) showIslandMap(islandId);
  document.dispatchEvent(new CustomEvent("hahaisland:open-island-activities", {detail:{islandId}}));
}

function playIslandActivity(islandId, spotId) {
  const island = state.data.islands.find(item=>item.id===islandId);
  const spot = island && islandActivities(island).find(item=>item.id===spotId);
  if (!spot || activityStatus(island,spot)==="locked") return;
  if (state.islandId !== islandId) showIslandMap(islandId);
  state.selectedSpotId = spotId;
  openGameplay();
}

function openActivityRecord(islandId, spotId) {
  const island = state.data.islands.find(item=>item.id===islandId);
  const record = state.saved.activityRecords[islandId+":"+spotId];
  if (!island || !record) return;
  const image = typeof record.artwork === "string" && /^data:image\/(png|jpeg);base64,/.test(record.artwork)
    ? `<img class="activity-record-image" src="${escapeHtml(record.artwork)}" alt="${escapeHtml(record.title)}的作品">` : "";
  openUtilityDialog({kicker:island.name+" · 我的收藏",title:record.title,mode:"activity-record",
    guide:"这是你在这台设备上完成的岛屿探索记录。",
    content:`<article class="activity-record"><small>${escapeHtml(new Date(record.completedAt).toLocaleString("zh-CN"))}</small>${image}<h3>${escapeHtml(record.title)}</h3><p>${escapeHtml(record.summary)}</p><span>${escapeHtml(record.reward)}</span></article>`});
}

function geoToPercent(lat, lng) {
  const bounds = geoBounds();
  const northWest = lonLatToWorldPixel(bounds.north, bounds.west, CAMPUS_TILE_ZOOM);
  const southEast = lonLatToWorldPixel(bounds.south, bounds.east, CAMPUS_TILE_ZOOM);
  const point = lonLatToWorldPixel(lat, lng, CAMPUS_TILE_ZOOM);
  return {
    x: clamp((point.x - northWest.x) / (southEast.x - northWest.x) * 100, 0, 100),
    y: clamp((point.y - northWest.y) / (southEast.y - northWest.y) * 100, 0, 100)
  };
}

function percentToGeo(x, y) {
  const bounds = geoBounds();
  const northWest = lonLatToWorldPixel(bounds.north, bounds.west, CAMPUS_TILE_ZOOM);
  const southEast = lonLatToWorldPixel(bounds.south, bounds.east, CAMPUS_TILE_ZOOM);
  return worldPixelToLonLat(
    northWest.x + clamp(x, 0, 100) / 100 * (southEast.x - northWest.x),
    northWest.y + clamp(y, 0, 100) / 100 * (southEast.y - northWest.y),
    CAMPUS_TILE_ZOOM
  );
}

function hotspotGeo(spot) {
  return spot.lat != null && spot.lng != null
    ? { lat: spot.lat, lng: spot.lng }
    : percentToGeo(spot.x, spot.y);
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function distanceMeters(from, to) {
  if (!from || !to) return Infinity;
  const earthRadius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.lng - from.lng);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceToPoint(point) {
  return distanceMeters(state.location, point);
}

function pointIsInRange(point) {
  return distanceToPoint(point) <= INTERACTION_RADIUS_METERS;
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "--";
  if (distance < .5) return "0 m";
  if (distance < 20) return `${distance.toFixed(1)} m`;
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

function nearestTaskDistance(location = state.location) {
  const dataset = currentPointDataset();
  if (!dataset || !location) return Infinity;
  return dataset.points.reduce((nearest, point) => Math.min(nearest, distanceMeters(location, point)), Infinity);
}

function currentMovementSpeed() {
  const nearest = nearestTaskDistance();
  if (nearest <= 20) return PRECISION_SPEED_METERS_PER_SECOND;
  if (nearest <= NEARBY_NOTICE_RADIUS_METERS) return APPROACH_SPEED_METERS_PER_SECOND;
  return CRUISE_SPEED_METERS_PER_SECOND;
}

function updateMovementPrecision() {
  if (!els.movementPrecision) return;
  const speed = currentMovementSpeed();
  const mode = speed === PRECISION_SPEED_METERS_PER_SECOND ? "精确移动" : speed === APPROACH_SPEED_METERS_PER_SECOND ? "接近减速" : "巡航";
  els.movementPrecision.textContent = `${mode} ${speed} m/s · 定位 ±${SIMULATED_LOCATION_ACCURACY_METERS} m`;
}

function directionToPoint(point) {
  if (!point || !state.location) return "目标";
  const north = (point.lat - state.location.lat) * 111320;
  const east = (point.lng - state.location.lng) * 111320 * Math.cos(state.location.lat * Math.PI / 180);
  if (Math.hypot(east, north) < .5) return "目标";
  const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const bearing = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
  return directions[Math.round(bearing / 45) % directions.length];
}

function currentScaleDenominator() {
  if (state.proximityAutoZoom) return PROXIMITY_SCALE_DENOMINATOR;
  const raw = BASE_MAP_SCALE_DENOMINATOR / state.mapScale;
  return Math.max(PROXIMITY_SCALE_DENOMINATOR, Math.round(raw / 100) * 100);
}

function formatScaleDenominator(value) {
  return Number(value).toLocaleString("en-US");
}

function niceScaleDistance(rawMeters) {
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(rawMeters, 1))));
  const normalized = rawMeters / power;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * power;
}

function updateMapScaleIndicator() {
  const denominator = currentScaleDenominator();
  const ratio = `1 : ${formatScaleDenominator(denominator)}`;
  const metersPerPixel = denominator * .000264583;
  const distance = niceScaleDistance(metersPerPixel * 54);
  const barWidth = clamp(distance / metersPerPixel, 30, 78);
  if (els.mapScaleRatio) els.mapScaleRatio.textContent = ratio;
  if (els.referenceScale) els.referenceScale.textContent = ratio;
  if (els.mapScaleBar) els.mapScaleBar.style.width = `${barWidth.toFixed(1)}px`;
  if (els.mapScaleDistance) els.mapScaleDistance.textContent = distance >= 1000 ? `${distance / 1000} km` : `${distance} m`;
}

function pixelMarkerIndex(point) {
  if (!point) return 0;
  if (point.category === "人物雕塑" || point.category === "历史原址") return 7;
  const name = point.label || point.name || "";
  if (/二校门|西校门|校门/.test(name)) return 0;
  if (/大礼堂|新清华学堂/.test(name)) return 1;
  if (/清华学堂|图书馆|科学馆|理学院|工字厅|古月堂/.test(name)) return 2;
  if (/水木|近春园|荷塘|亭|日晷|情人坡|校河/.test(name)) return 3;
  if (/主楼|教学楼|土木|博物馆|美术学院|天文台/.test(name)) return 4;
  if (/体育|操场/.test(name)) return 5;
  if (/公寓|宿舍/.test(name)) return 6;
  return Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7;
}

function lonLatToWorldPixel(lat, lng, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin(safeLat * Math.PI / 180);
  return {
    x: (lng + 180) / 360 * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size
  };
}

function worldPixelToLonLat(x, y, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const normalizedY = .5 - y / size;
  return {
    lat: 90 - 360 * Math.atan(Math.exp(-normalizedY * 2 * Math.PI)) / Math.PI,
    lng: x / size * 360 - 180
  };
}

function renderCampusMap(useAffineCalibration) {
  const island = currentIsland();
  els.campusMapView.dataset.mapTheme = island.id;
  els.campusMapImage.src = island.map;
  els.campusMapImage.hidden = false;
  els.campusMapImage.classList.toggle("is-affine-map", Boolean(useAffineCalibration));
}

function renderReferenceMap(force = false) {
  if (!state.location || !els.referenceTileMap || !state.referenceVisible || !state.referenceExpanded) return;
  const now = performance.now();
  if (!force && now - state.referenceRenderTime < 120) return;
  state.referenceRenderTime = now;
  // Standard OSM raster tiles stop at zoom 19; requesting zoom 20 returns 400.
  const zoom = clamp(Math.round(18 + Math.log2(state.mapScale)), 16, 19);
  const tileSize = 256;
  const width = els.referenceTileMap.clientWidth || 286;
  const height = els.referenceTileMap.clientHeight || 176;
  const center = lonLatToWorldPixel(state.location.lat, state.location.lng, zoom);
  const startX = Math.floor((center.x - width / 2) / tileSize);
  const endX = Math.floor((center.x + width / 2) / tileSize);
  const startY = Math.floor((center.y - height / 2) / tileSize);
  const endY = Math.floor((center.y + height / 2) / tileSize);
  const fragment = document.createDocumentFragment();
  for (let tileY = startY; tileY <= endY; tileY += 1) {
    for (let tileX = startX; tileX <= endX; tileX += 1) {
      const tile = document.createElement("img");
      tile.alt = "";
      tile.decoding = "async";
      tile.draggable = false;
      tile.src = "https://tile.openstreetmap.org/" + zoom + "/" + tileX + "/" + tileY + ".png";
      tile.style.left = (tileX * tileSize - center.x + width / 2) + "px";
      tile.style.top = (tileY * tileSize - center.y + height / 2) + "px";
      fragment.append(tile);
    }
  }
  els.referenceTiles.replaceChildren(fragment);
  els.referenceCoordinates.textContent = formatCoordinate(state.location.lat) + ", " + formatCoordinate(state.location.lng);
}

function moveVirtualLocation(eastMeters, northMeters) {
  if (!state.location) return;
  const metersPerLat = 111320;
  const metersPerLng = metersPerLat * Math.cos(state.location.lat * Math.PI / 180);
  const previousLocation = { lat: state.location.lat, lng: state.location.lng };
  let nextLat = state.location.lat + northMeters / metersPerLat;
  let nextLng = state.location.lng + eastMeters / metersPerLng;
  const bounds = geoBounds();
  nextLat = clamp(nextLat, bounds.south, bounds.north);
  nextLng = clamp(nextLng, bounds.west, bounds.east);
  const nextLocation = { lat: nextLat, lng: nextLng };
  const snapPoint = currentPointDataset()?.points.find((point) => {
    const before = distanceMeters(previousLocation, point);
    const after = distanceMeters(nextLocation, point);
    return before > 1.25 && after <= 1.25 && after < before;
  });
  state.location.lat = snapPoint ? snapPoint.lat : nextLat;
  state.location.lng = snapPoint ? snapPoint.lng : nextLng;
  state.location.accuracy = SIMULATED_LOCATION_ACCURACY_METERS;
  state.location.source = "joystick";
  state.locationByIsland[state.islandId] = { ...state.location };
  updateLocationUI();
  centerMapOnLocation(false);
}

function updateJoystickVector(clientX, clientY) {
  const rect = els.joystickBase.getBoundingClientRect();
  const radius = rect.width * .32;
  let x = clientX - rect.left - rect.width / 2;
  let y = clientY - rect.top - rect.height / 2;
  const distance = Math.hypot(x, y);
  if (distance > radius) {
    x = x / distance * radius;
    y = y / distance * radius;
  }
  state.joystick.x = x / radius;
  state.joystick.y = y / radius;
  els.joystickKnob.style.transform = "translate(" + x + "px," + y + "px)";
}

function stopJoystick() {
  state.joystick.active = false;
  state.joystick.pointerId = null;
  state.joystick.x = 0;
  state.joystick.y = 0;
  state.joystick.lastTime = 0;
  els.joystickKnob.style.transform = "translate(0,0)";
  renderReferenceMap(true);
}

function movementLoop(time) {
  const keys = state.movementKeys;
  let keyX = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
  let keyY = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
  const active = state.view === "map" && !state.game && !state.navigationOpen && !state.myIslandOpen && (state.joystick.active || keyX || keyY);
  if (active) {
    if (keyX || keyY) {
      const length = Math.hypot(keyX, keyY) || 1;
      keyX /= length;
      keyY /= length;
    } else {
      keyX = state.joystick.x;
      keyY = state.joystick.y;
    }
    const delta = state.joystick.lastTime ? Math.min((time - state.joystick.lastTime) / 1000, .05) : 0;
    const speed = currentMovementSpeed();
    moveVirtualLocation(keyX * speed * delta, -keyY * speed * delta);
  }
  state.joystick.lastTime = time;
  state.joystick.frame = window.requestAnimationFrame(movementLoop);
}

function applyTransform(animate = false) {
  window.clearTimeout(state.sceneTransitionTimer);
  els.sceneTransform.style.transition = animate
    ? "transform .35s cubic-bezier(.2,.8,.2,1)"
    : "none";
  els.sceneTransform.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale})`;
  els.zoomValue.value = `${Math.round(state.scale * 100)}%`;
  els.zoomValue.textContent = `${Math.round(state.scale * 100)}%`;
  if (animate) state.sceneTransitionTimer = window.setTimeout(() => {
    els.sceneTransform.style.transition = "none";
    state.sceneTransitionTimer = null;
  }, 360);
}

function applyMapTransform(animate = false) {
  window.clearTimeout(state.mapTransitionTimer);
  els.mapCanvas.style.transition = animate
    ? `transform ${MAP_ZOOM_TRANSITION_MS}ms cubic-bezier(.16,1,.3,1)`
    : "none";
  els.mapCanvas.style.transform = `translate(calc(-50% + ${state.mapX}px), calc(-50% + ${state.mapY}px)) scale(${state.mapScale})`;
  els.mapCanvas.style.setProperty("--marker-scale", (1 / state.mapScale).toFixed(4));
  els.zoomValue.value = `${Math.round(state.mapScale * 100)}%`;
  els.zoomValue.textContent = `${Math.round(state.mapScale * 100)}%`;
  updateMapScaleIndicator();
  renderReferenceMap();
  if (animate) state.mapTransitionTimer = window.setTimeout(() => {
    els.mapCanvas.style.transition = "none";
    state.mapTransitionTimer = null;
  }, MAP_ZOOM_TRANSITION_MS + 20);
}

function updateGeoOverlay() {
  const bounds = geoBounds();
  els.geoNorthWest.textContent = `${bounds.north.toFixed(4)}°N  ${bounds.west.toFixed(4)}°E`;
  els.geoNorthEast.textContent = `${bounds.north.toFixed(4)}°N  ${bounds.east.toFixed(4)}°E`;
  els.geoSouthWest.textContent = `${bounds.south.toFixed(4)}°N  ${bounds.west.toFixed(4)}°E`;
  els.geoSouthEast.textContent = `${bounds.south.toFixed(4)}°N  ${bounds.east.toFixed(4)}°E`;
  const reference = currentGeoReference();
  els.geoCalibrationLabel.textContent = `${reference.crs} · 像素地图三点仿射校准`;
}

function updateLocationUI() {
  if (!state.location) return;
  const point = geoToPercent(state.location.lat, state.location.lng);
  els.playerLocation.style.left = `${point.x}%`;
  els.playerLocation.style.top = `${point.y}%`;
  els.mockLatitude.value = formatCoordinate(state.location.lat);
  els.mockLongitude.value = formatCoordinate(state.location.lng);
  els.playerCoordinates.textContent = `${formatCoordinate(state.location.lat)}, ${formatCoordinate(state.location.lng)}`;
  els.locationAccuracy.textContent = `精度 ±${state.location.accuracy ?? SIMULATED_LOCATION_ACCURACY_METERS} m`;
  els.playerLocation.setAttribute("aria-label", `当前模拟位置，纬度 ${formatCoordinate(state.location.lat)}，经度 ${formatCoordinate(state.location.lng)}`);
  updateMovementPrecision();
  renderReferenceMap();
  updatePoiProximity();
}

function centerMapOnLocation(animate = false) {
  if (!state.location) return;
  const point = geoToPercent(state.location.lat, state.location.lng);
  const width = els.mapCanvas.offsetWidth;
  const height = els.mapCanvas.offsetHeight;
  state.mapX = (50 - point.x) / 100 * width * state.mapScale;
  state.mapY = (50 - point.y) / 100 * height * state.mapScale;
  applyMapTransform(animate);
}

function focusMapOnLocation(animate = true) {
  centerMapOnLocation(animate);
}

function setVirtualLocation(lat, lng, label = "自定义坐标") {
  const bounds = geoBounds();
  state.location = {
    lat: clamp(Number(lat), bounds.south, bounds.north),
    lng: clamp(Number(lng), bounds.west, bounds.east),
    accuracy: SIMULATED_LOCATION_ACCURACY_METERS,
    source: "simulated"
  };
  state.locationByIsland[state.islandId] = { ...state.location };
  updateLocationUI();
  centerMapOnLocation(true);
  showToast(`已模拟定位：${label}`);
}

function buildLocationPresets() {
  const island = currentIsland();
  const dataset = currentPointDataset();
  els.mockLocationPreset.replaceChildren();
  const currentOption = document.createElement("option");
  currentOption.value = "";
  currentOption.textContent = `${island.shortName} · 选择定位点`;
  els.mockLocationPreset.append(currentOption);
  if (dataset) {
    const pointGroup = document.createElement("optgroup");
    pointGroup.label = `实景任务点 · ${dataset.points.length} 个`;
    dataset.points.forEach((point) => {
      const option = document.createElement("option");
      option.value = `${point.lat},${point.lng}`;
      option.textContent = point.label || point.name;
      pointGroup.append(option);
    });
    els.mockLocationPreset.append(pointGroup);
  }
}

function toggleLocationDebug(force) {
  const open = force ?? !els.locationDebugPanel.classList.contains("is-open");
  els.locationDebugPanel.classList.toggle("is-open", open);
  els.locationDebugPanel.setAttribute("aria-hidden", String(!open));
  els.locationDebugToggle.setAttribute("aria-expanded", String(open));
}

function toggleLocationPicking(force) {
  state.locationPicking = force ?? !state.locationPicking;
  els.mapStage.classList.toggle("is-picking-location", state.locationPicking);
  els.pickLocation.classList.toggle("is-active", state.locationPicking);
  els.pickLocation.textContent = state.locationPicking ? "请点按地图…" : "点按地图定位";
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toastText.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function completedCount(island) {
  return completedActivityCount(island);
}

function getDriftProfile(island) {
  if (state.driftProfiles.has(island.id)) return state.driftProfiles.get(island.id);
  const radius = island.id === "odyssey" ? 8 : 18;
  const randomOffset = () => Math.round((Math.random() * 2 - 1) * radius);
  const profile = {
    x1: randomOffset(), y1: randomOffset(),
    x2: randomOffset(), y2: randomOffset(),
    x3: randomOffset(), y3: randomOffset(),
    x4: randomOffset(), y4: randomOffset(),
    r1: (Math.random() * 2 - 1).toFixed(2),
    r2: (Math.random() * 2 - 1).toFixed(2),
    duration: (12 + Math.random() * 8).toFixed(2),
    bobDuration: (4.6 + Math.random() * 2.4).toFixed(2),
    delay: (-Math.random() * 10).toFixed(2)
  };
  state.driftProfiles.set(island.id, profile);
  return profile;
}

function buildWorldNodes() {
  els.worldNodes.replaceChildren();
  state.data.islands.forEach((island, index) => {
    const drift = getDriftProfile(island);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `world-node world-node-${island.id}`;
    button.dataset.island = island.id;
    button.setAttribute("aria-label", `探索${island.name}`);
    button.setAttribute("aria-pressed", String(island.id === state.islandId));
    button.style.setProperty("--node-x", `${island.x}%`);
    button.style.setProperty("--node-y", `${island.y}%`);
    button.style.setProperty("--node-scale", island.scale ?? 1);
    button.style.setProperty("--node-color", island.color);
    button.style.setProperty("--node-soft", island.softColor);
    button.style.setProperty("--node-delay", `${index * -0.45}s`);
    button.style.setProperty("--drift-x1", `${drift.x1}px`);
    button.style.setProperty("--drift-y1", `${drift.y1}px`);
    button.style.setProperty("--drift-x2", `${drift.x2}px`);
    button.style.setProperty("--drift-y2", `${drift.y2}px`);
    button.style.setProperty("--drift-x3", `${drift.x3}px`);
    button.style.setProperty("--drift-y3", `${drift.y3}px`);
    button.style.setProperty("--drift-x4", `${drift.x4}px`);
    button.style.setProperty("--drift-y4", `${drift.y4}px`);
    button.style.setProperty("--drift-r1", `${drift.r1}deg`);
    button.style.setProperty("--drift-r2", `${drift.r2}deg`);
    button.style.setProperty("--drift-duration", `${drift.duration}s`);
    button.style.setProperty("--bob-duration", `${drift.bobDuration}s`);
    button.style.setProperty("--drift-delay", `${drift.delay}s`);
    const currentMarker = island.id === state.islandId
      ? `<span class="current-island-marker"><i aria-hidden="true"></i><b>当前位置</b><small>YOU ARE HERE</small></span>`
      : "";
    const dataset = pointDatasetForIsland(island);
    const pointProgress = dataset ? `${completedPointCount(island)}/${dataset.points.length} 任务` : "暂无实景任务";
    button.innerHTML = `
      <span class="node-drifter">
        <span class="node-glow" aria-hidden="true"></span>
        <span class="node-water-ripple" aria-hidden="true"></span>
        <img src="${island.image}" alt="" width="512" height="512" decoding="async" draggable="false">
        <span class="node-label"><i aria-hidden="true"></i><b>${island.name}</b><small>${pointProgress}</small></span>
      </span>
      ${currentMarker}
    `;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      showIslandMap(island.id);
    });
    els.worldNodes.append(button);
  });
  els.activeCount.textContent = state.data.islands.length;
}

function buildThemeDock() {
  els.themeDock.replaceChildren();
  state.data.islands.forEach((island) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-button";
    button.dataset.island = island.id;
    button.setAttribute("aria-label", `查看${island.name}`);
    button.setAttribute("aria-pressed", String(island.id === state.islandId));
    button.style.setProperty("--button-color", island.color);
    button.style.setProperty("--button-soft", island.softColor);
    button.innerHTML = `<span class="theme-swatch" aria-hidden="true"></span><span>${island.shortName}</span>`;
    button.addEventListener("click", () => focusIsland(island.id));
    els.themeDock.append(button);
  });
}

function buildMapPins() {
  els.mapPins.replaceChildren();
}

function togglePoiExplorer(force) {
  if (els.poiExplorer.hidden) return;
  const open = force ?? !els.poiExplorer.classList.contains("is-open");
  els.poiExplorer.classList.toggle("is-open", open);
  els.poiExplorerToggle.setAttribute("aria-expanded", String(open));
  els.poiExplorerPanel.setAttribute("aria-hidden", String(!open));
}

function updatePoiStats() {
  const dataset = currentPointDataset();
  if (!dataset) return;
  const visible = state.poiFilter === "all"
    ? dataset.points.length
    : dataset.points.filter((point) => point.category === state.poiFilter).length;
  const visited = dataset.points.filter((point) => state.saved.visitedPois[poiVisitKey(point)]).length;
  const nearby = dataset.points.filter(pointIsInRange).length;
  els.poiTotalCount.textContent = dataset.points.length;
  els.poiVisibleCount.textContent = `${visible} 个点位${state.poiFilter === "all" ? "" : ` · ${state.poiFilter}`}`;
  els.poiVisitedCount.textContent = `${visited} 已完成 · ${nearby} 可互动`;
}

function renderPoiDetail(point = currentPoi()) {
  const dataset = currentPointDataset();
  if (!dataset || !point) {
    els.poiDetail.innerHTML = "<p>点击地图上的星点，查看地点资料并移动虚拟定位。</p>";
    return;
  }
  const visited = Boolean(state.saved.visitedPois[poiVisitKey(point)]);
  const color = dataset.categoryColors?.[point.category] || currentIsland().color;
  const accuracy = dataset.accuracyLabels?.[point.accuracy] || point.accuracy || "WGS84 点位";
  const description = point.note || point.place || "校园互动点位";
  const distance = distanceToPoint(point);
  const inRange = distance <= INTERACTION_RADIUS_METERS;
  const community = poiCommunityEntry(point);
  const communityAction = community ? `
      <button class="poi-community-action" type="button">
        <span aria-hidden="true">☁</span>
        <b>词云与评论</b>
        <small>${Number(community.totalComments) || community.comments?.length || 0} 条印象</small>
      </button>` : "";
  els.poiDetail.style.setProperty("--poi-color", color);
  els.poiDetail.innerHTML = `
    <div class="poi-detail-head">
      <span><small>${escapeHtml(point.category || dataset.pointLabel)}</small><h3>${escapeHtml(point.label || point.name)}</h3></span>
      ${visited ? '<b class="poi-visited-badge">✓ 任务完成</b>' : ""}
    </div>
    <p class="poi-detail-copy">${escapeHtml(description)}</p>
    <div class="poi-detail-meta"><span>${escapeHtml(accuracy)}</span><span>WGS84 ${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}</span></div>
    <div class="poi-proximity${inRange ? " is-in-range" : ""}"><span aria-hidden="true">${inRange ? "✓" : "◎"}</span><div><small>距离当前角色</small><b class="poi-distance-live">${formatDistance(distance)}</b></div><em>${inRange ? "已进入 10 米互动范围" : "移动到 10 米内解锁任务"}</em></div>
    <div class="poi-detail-actions">
      <button class="poi-task-action" type="button" ${inRange ? "" : "disabled"}>${inRange ? (visited ? "再次体验任务" : "开始点位任务") : `还差 ${formatDistance(distance)}`}</button>
      ${communityAction}
    </div>`;
  els.poiDetail.querySelector(".poi-task-action").addEventListener("click", () => openPoiTask(point));
  els.poiDetail.querySelector(".poi-community-action")?.addEventListener("click", () => openPoiCommunity(point));
}

function hideNearbyTaskPrompt(restoreScale = true) {
  els.nearbyTaskPrompt?.classList.remove("is-visible", "is-in-range");
  els.nearbyTaskPrompt?.setAttribute("aria-hidden", "true");
  state.nearbyPointId = null;
  state.nearbyPoint = null;
  state.nearbyInRange = false;
  if (restoreScale && state.proximityAutoZoom) {
    state.proximityAutoZoom = false;
    state.mapScale = clamp(state.preProximityScale || 1, .72, MAX_MAP_SCALE);
    centerMapOnLocation(true);
  }
}

function updateNearbyTaskPrompt(nearest) {
  if (!nearest || nearest.distance > NEARBY_NOTICE_RADIUS_METERS) {
    hideNearbyTaskPrompt(true);
    return;
  }
  const { point, distance } = nearest;
  const inRange = distance <= INTERACTION_RADIUS_METERS;
  const newlySelectedNearby = state.nearbyPointId !== point.id;
  const enteredRange = inRange && (!state.nearbyInRange || newlySelectedNearby);
  state.nearbyPointId = point.id;
  state.nearbyPoint = point;
  state.nearbyInRange = inRange;

  if (distance <= PROXIMITY_ZOOM_RADIUS_METERS && !state.suppressProximityAutoZoom && !state.proximityAutoZoom && state.mapScale < PROXIMITY_ZOOM_SCALE) {
    state.preProximityScale = state.mapScale;
    state.proximityAutoZoom = true;
    state.mapScale = PROXIMITY_ZOOM_SCALE;
    centerMapOnLocation(true);
  }

  els.nearbyTaskPrompt.classList.add("is-visible");
  els.nearbyTaskPrompt.classList.toggle("is-in-range", inRange);
  els.nearbyTaskPrompt.setAttribute("aria-hidden", "false");
  els.nearbyTaskIcon.className = `nearby-task-icon pixel-type-${pixelMarkerIndex(point)}`;
  els.nearbyTaskStatus.textContent = inRange ? "已进入 10 米任务范围 · 1:400" : distance <= PROXIMITY_ZOOM_RADIUS_METERS ? "任务就在附近 · 已切换 1:400" : "附近发现任务点";
  els.nearbyTaskName.textContent = point.label || point.name;
  els.nearbyTaskDistance.textContent = `${formatDistance(distance)} · ${inRange ? "可以互动" : `向${directionToPoint(point)}移动`}`;
  els.nearbyTaskAction.textContent = inRange ? "立即互动" : "查看位置";
  if (enteredRange) showToast(`已到达「${point.label || point.name}」10 米范围，可以互动`);
}

function updatePoiProximity() {
  const dataset = currentPointDataset();
  if (!dataset || state.view !== "map") {
    hideNearbyTaskPrompt(false);
    return;
  }
  let nearby = 0;
  let nearest = null;
  dataset.points.forEach((point) => {
    const distance = distanceToPoint(point);
    const inRange = distance <= INTERACTION_RADIUS_METERS;
    if (!nearest || distance < nearest.distance) nearest = { point, distance };
    if (inRange) nearby += 1;
    const marker = els.poiPins.querySelector(`[data-point-id="${point.id}"]`);
    if (!marker) return;
    marker.classList.toggle("is-in-range", inRange);
    marker.classList.toggle("is-out-of-range", !inRange);
    marker.dataset.distance = formatDistance(distance);
    marker.setAttribute("aria-label", `${point.label || point.name}，距离 ${formatDistance(distance)}${inRange ? "，可以互动" : "，需进入10米范围"}`);
    const label = marker.querySelector(".poi-label small");
    if (label) label.textContent = `${formatDistance(distance)} · ${inRange ? "可互动" : "靠近后解锁"}`;
  });
  updateNearbyTaskPrompt(nearest);
  const selected = currentPoi();
  if (selected) {
    const distance = distanceToPoint(selected);
    const inRange = distance <= INTERACTION_RADIUS_METERS;
    const proximity = els.poiDetail.querySelector(".poi-proximity");
    const distanceLabel = els.poiDetail.querySelector(".poi-distance-live");
    const action = els.poiDetail.querySelector(".poi-task-action");
    if (distanceLabel) distanceLabel.textContent = formatDistance(distance);
    if (proximity) {
      proximity.classList.toggle("is-in-range", inRange);
      const icon = proximity.querySelector(":scope > span");
      const copy = proximity.querySelector("em");
      if (icon) icon.textContent = inRange ? "✓" : "◎";
      if (copy) copy.textContent = inRange ? "已进入 10 米互动范围" : "移动到 10 米内解锁任务";
    }
    if (action) {
      action.disabled = !inRange;
      const completed = Boolean(state.saved.visitedPois[poiVisitKey(selected)]);
      action.textContent = inRange ? (completed ? "再次体验任务" : "开始点位任务") : `还差 ${formatDistance(distance)}`;
    }
  }
  const visited = dataset.points.filter((point) => state.saved.visitedPois[poiVisitKey(point)]).length;
  els.poiVisitedCount.textContent = `${visited} 已完成 · ${nearby} 可互动`;
}

function selectPoi(pointId) {
  state.selectedPoiId = pointId;
  buildPoiPins();
  renderPoiDetail();
  togglePoiExplorer(true);
}

function buildPoiPins() {
  const dataset = currentPointDataset();
  els.poiPins.replaceChildren();
  if (!dataset) return;
  const points = state.poiFilter === "all"
    ? dataset.points
    : dataset.points.filter((point) => point.category === state.poiFilter);
  points.forEach((point) => {
    const position = geoToPercent(point.lat, point.lng);
    const marker = document.createElement("button");
    const visited = Boolean(state.saved.visitedPois[poiVisitKey(point)]);
    const color = dataset.categoryColors?.[point.category] || currentIsland().color;
    const distance = distanceToPoint(point);
    const inRange = distance <= INTERACTION_RADIUS_METERS;
    marker.type = "button";
    marker.className = `poi-marker${point.id === state.selectedPoiId ? " is-selected" : ""}${visited ? " is-visited" : ""}${inRange ? " is-in-range" : " is-out-of-range"}${point.category === "历史原址" ? " is-historical" : ""}`;
    marker.style.left = `${position.x}%`;
    marker.style.top = `${position.y}%`;
    marker.style.setProperty("--poi-color", color);
    marker.dataset.pointId = point.id;
    marker.dataset.distance = formatDistance(distance);
    marker.setAttribute("aria-label", `${point.label || point.name}，距离 ${formatDistance(distance)}${inRange ? "，可以互动" : "，需进入10米范围"}`);
    marker.innerHTML = `<span class="poi-pixel-avatar pixel-type-${pixelMarkerIndex(point)}" aria-hidden="true"></span><span class="poi-label">${escapeHtml(point.label || point.name)}<small>${formatDistance(distance)} · ${inRange ? "可互动" : "靠近后解锁"}</small></span>`;
    marker.addEventListener("click", (event) => {
      event.stopPropagation();
      selectPoi(point.id);
    });
    els.poiPins.append(marker);
  });
  updatePoiStats();
}

function buildPoiExplorer() {
  const dataset = currentPointDataset();
  if (!dataset) {
    els.poiExplorer.classList.remove("is-open");
    els.poiExplorer.hidden = true;
    els.poiExplorer.setAttribute("aria-hidden", "true");
    els.poiPins.replaceChildren();
    return;
  }
  els.poiExplorer.hidden = false;
  els.poiExplorer.setAttribute("aria-hidden", "false");
  els.poiDatasetLabel.textContent = dataset.label;
  els.poiFilters.replaceChildren();
  const categories = ["all", ...new Set(dataset.points.map((point) => point.category))];
  categories.forEach((category) => {
    const button = document.createElement("button");
    const color = category === "all" ? currentIsland().color : dataset.categoryColors?.[category];
    button.type = "button";
    button.className = "poi-filter";
    button.textContent = category === "all" ? "全部" : category;
    button.style.setProperty("--filter-color", color || currentIsland().color);
    button.setAttribute("aria-pressed", String(state.poiFilter === category));
    button.addEventListener("click", () => {
      state.poiFilter = category;
      if (currentPoi()?.category !== category && category !== "all") state.selectedPoiId = null;
      buildPoiExplorer();
    });
    els.poiFilters.append(button);
  });
  buildPoiPins();
  renderPoiDetail();
}

function buildMapSwitcher() {
  els.mapThemeSwitcher.replaceChildren();
  state.data.islands.forEach((island) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-theme-button";
    button.style.setProperty("--button-color", island.color);
    button.style.setProperty("--button-soft", island.softColor);
    button.setAttribute("aria-pressed", String(island.id === state.islandId));
    button.textContent = island.shortName;
    button.addEventListener("click", () => showIslandMap(island.id));
    els.mapThemeSwitcher.append(button);
  });
}

function setActiveNav(view) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
}

function showIslandMap(islandId = state.islandId) {
  state.myIslandOpen = false;
  const previousIslandId = state.islandId;
  const islandChanged = previousIslandId !== islandId;
  if (state.location && previousIslandId) state.locationByIsland[previousIslandId] = { ...state.location };
  state.islandId = islandId;
  state.selectedSpotId = null;
  state.selectedPoiId = null;
  state.poiFilter = "all";
  state.proximityAutoZoom = false;
  state.preProximityScale = 1;
  state.nearbyPointId = null;
  state.nearbyPoint = null;
  state.nearbyInRange = false;
  state.referenceExpanded = false;
  const island = currentIsland();
  const reference = currentGeoReference();
  if (islandChanged || !state.location) {
    state.location = {
      ...(state.locationByIsland[island.id] || reference.defaultLocation),
      accuracy: SIMULATED_LOCATION_ACCURACY_METERS,
      source: "simulated"
    };
  }
  state.location.accuracy = SIMULATED_LOCATION_ACCURACY_METERS;
  document.documentElement.style.setProperty("--theme", island.color);
  document.documentElement.style.setProperty("--theme-soft", island.softColor);
  const mapTitle = island.id === "odyssey" ? "奥德赛中央地图" : `${island.name}地图`;
  els.campusMapImage.alt = mapTitle;
  els.mapViewTitle.textContent = mapTitle;
  const pointDataset = currentPointDataset();
  renderCampusMap(Boolean(pointDataset));
  els.mapViewSubtitle.textContent = pointDataset
    ? `${island.subtitle} · ${pointDataset.points.length} 个实景任务点 · 像素地图线性校准 · 10 米内可互动`
    : `${island.subtitle} · 暂未接入真实坐标任务点`;
  state.mapScale = 1;
  state.mapX = 0;
  state.mapY = 0;
  state.suppressProximityAutoZoom = true;
  els.mapViewport.scrollTop = 0;
  els.mapViewport.scrollLeft = 0;
  state.view = "map";
  els.nearbyTaskPrompt.classList.remove("is-visible", "is-in-range");
  els.nearbyTaskPrompt.setAttribute("aria-hidden", "true");
  els.referenceLocator.classList.remove("is-expanded");
  els.referenceLocator.setAttribute("aria-hidden", "true");
  els.referenceMapToggle.setAttribute("aria-expanded", "false");
  buildMapPins();
  togglePoiExplorer(false);
  buildPoiExplorer();
  buildMapSwitcher();
  buildLocationPresets();
  updateGeoOverlay();
  updateLocationUI();
  applyLayerSettings();
  els.campusMapView.classList.add("is-open");
  els.campusMapView.setAttribute("aria-hidden", "false");
  els.campusMapView.inert = false;
  els.mapViewport.classList.add("is-map-mode");
  els.sceneFrame.inert = true;
  els.themeDock.inert = true;
  els.locateButtonText.textContent = "中心跟随";
  setActiveNav("map");
  closePanel();
  window.requestAnimationFrame(() => {
    els.mapViewport.scrollTop = 0;
    els.mapViewport.scrollLeft = 0;
    centerMapOnLocation(true);
    updatePoiProximity();
    state.suppressProximityAutoZoom = false;
  });
  document.dispatchEvent(new CustomEvent("hahaisland:map-open", { detail: { islandId } }));
}

function closeMap() {
  state.view = "home";
  els.campusMapView.classList.remove("is-open");
  els.campusMapView.setAttribute("aria-hidden", "true");
  els.campusMapView.inert = true;
  els.mapViewport.classList.remove("is-map-mode");
  els.sceneFrame.inert = false;
  els.themeDock.inert = false;
  els.locateButtonText.textContent = "回到岛屿";
  toggleLocationDebug(false);
  toggleLocationPicking(false);
  togglePoiExplorer(false);
  hideNearbyTaskPrompt(false);
  state.referenceExpanded = false;
  els.referenceLocator.classList.remove("is-expanded");
  els.referenceLocator.setAttribute("aria-hidden", "true");
  els.referenceMapToggle.setAttribute("aria-expanded", "false");
  setActiveNav("home");
  buildWorldNodes();
  buildThemeDock();
  resetView(true);
}

function focusIsland(islandId, openFirstSpot = false) {
  state.islandId = islandId;
  state.selectedSpotId = null;
  const island = currentIsland();
  document.documentElement.style.setProperty("--theme", island.color);
  document.documentElement.style.setProperty("--theme-soft", island.softColor);
  buildWorldNodes();
  buildThemeDock();
  if (openFirstSpot) {
    const firstSpot = islandActivities(island).find((spot) => activityStatus(island,spot) !== "locked");
    if (firstSpot) openSpot(firstSpot.id);
  }
}

function openSpot(spotId) {
  state.selectedSpotId = spotId;
  const island = currentIsland();
  const spot = currentSpot();
  if (!spot || spot.status === "locked") return;
  if (state.view === "map") buildMapPins();
  els.panelNpc.src = island.npc;
  els.panelNpc.alt = `${island.name}向导${island.npcName ? `：${island.npcName}` : ""}`;
  els.panelGuideName.textContent = `本岛向导 · ${island.npcName || island.name}`;
  els.activityKicker.textContent = spot.kicker;
  els.activityTitle.textContent = spot.title;
  els.activityDescription.textContent = spot.description;
  els.activityDuration.textContent = spot.duration;
  els.activityReward.textContent = spot.reward;
  const completed = spot.status === "completed";
  els.startActivity.textContent = completed ? "再玩一次" : "开始玩法";
  els.startActivity.disabled = false;
  els.activityPanel.classList.add("is-open");
  els.activityPanel.setAttribute("aria-hidden", "false");
  window.setTimeout(() => document.querySelector("#panelClose").focus(), 220);
}

function closePanel() {
  els.activityPanel.classList.remove("is-open");
  els.activityPanel.setAttribute("aria-hidden", "true");
}

function setPlayProgress(percent, label) {
  els.playProgressFill.style.width = clamp(percent, 0, 100) + "%";
  els.playProgressText.textContent = label;
}

function setPlayFooter(options = {}) {
  els.playHint.textContent = options.hint || "所有内容均为本地演示，不会上传。";
  els.playPrimary.textContent = options.primaryText || "完成任务";
  els.playPrimary.disabled = Boolean(options.primaryDisabled);
  els.playPrimary.hidden = Boolean(options.hidePrimary);
  els.playPrimary.onclick = options.onPrimary || null;
  els.playSecondary.textContent = options.secondaryText || "重新开始";
  els.playSecondary.hidden = Boolean(options.hideSecondary);
  els.playSecondary.onclick = options.onSecondary || resetGameplay;
}

function clearPlayTimer() {
  if (state.playTimer) {
    window.clearTimeout(state.playTimer);
    window.clearInterval(state.playTimer);
    state.playTimer = null;
  }
  if (state.playAudio) {
    state.playAudio.source.stop();
    state.playAudio.context.close().catch(()=>{});
    state.playAudio = null;
  }
}

function startIslandSound(kind) {
  if (state.playAudio) {
    state.playAudio.source.stop();state.playAudio.context.close().catch(()=>{});state.playAudio=null;
  }
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) {showToast("这个浏览器暂不支持声音，仍可跟随光圈完成活动。");return false;}
  try {
    const context=new Audio(), buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const channel=buffer.getChannelData(0);
    for(let index=0;index<channel.length;index++)channel[index]=(Math.random()*2-1)*.4;
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=buffer;source.loop=true;filter.type="lowpass";filter.frequency.value={海浪:450,风声:850,细雨:1800}[kind]||850;
    gain.gain.value=.05;source.connect(filter).connect(gain).connect(context.destination);source.start();context.resume().catch(()=>{});
    state.playAudio={context,source};return true;
  } catch {showToast("声音暂未打开，可以继续静音体验。");return false;}
}

function refreshExplorationProgress() {
  const taskIslands = state.data.islands.filter((island) => pointDatasetForIsland(island));
  const total = taskIslands.reduce((sum, island) => sum + pointDatasetForIsland(island).points.length, 0);
  const completed = taskIslands.reduce((sum, island) => sum + completedPointCount(island), 0);
  els.progressValue.textContent = completed;
  if (els.progressTotal) els.progressTotal.textContent = total;
  els.progressFill.style.width = (total ? completed / total * 100 : 0) + "%";
}

function finishGameplay(message, onExit) {
  if (!state.game || state.game.finished) return;
  const extension = activityExtensions.get(state.game.key);
  if (extension && !extension.ready(state.game.data)) return;
  clearPlayTimer();
  const island = currentIsland();
  const spot = currentSpot();
  const inHub = document.body.classList.contains("is-island-hub");
  const returnToMap = onExit || (() => {
    if (inHub) return;
    if (state.view !== "map") showIslandMap(island.id);
  });
  if (spot) {
    spot.status = "completed";
    state.saved.completed[island.id + ":" + spot.id] = true;
    state.saved.activityRecords[island.id+":"+spot.id] = {
      title:spot.title,summary:message,reward:spot.reward,completedAt:new Date().toISOString(),
      artwork:typeof state.game.data.artwork === "string" && state.game.data.artwork.length < 200000 ? state.game.data.artwork : null
    };
    persistSavedState();
    hydrateCompletedSpots();
  }
  if (state.view === "map") buildMapPins();
  buildWorldNodes();
  buildThemeDock();
  refreshExplorationProgress();
  if (state.game) state.game.finished = true;
  els.playModeBadge.textContent = "任务完成";
  setPlayProgress(100, "已收集奖励");
  els.playGuideText.textContent = message;
  els.playWorkspace.innerHTML =
    '<div class="play-complete">' +
      '<span class="complete-burst" aria-hidden="true">✦</span>' +
      '<p>CHECK-IN COMPLETE</p>' +
      '<h3>岛屿活动完成</h3>' +
      '<span>' + (spot ? spot.reward : "岛屿纪念") + '</span>' +
      '<div class="complete-stamps"><i>✓</i><i>H</i><i>!</i></div>' +
    '</div>';
  setPlayFooter({
    hint: "进度已经同步到本次本地体验。",
    primaryText: inHub ? "返回岛上活动" : "回到岛屿地图",
    hideSecondary: true,
    onPrimary: () => {
      closeGameplay();
      returnToMap();
    }
  });
  if (spot) {
    els.startActivity.textContent = "再玩一次";
    els.startActivity.disabled = false;
  }
  showToast("“" + (spot ? spot.title : "岛屿任务") + "”体验完成");
  document.dispatchEvent(new CustomEvent("hahaisland:progress-changed"));
}

function finishPoiTask(point) {
  const island = currentIsland();
  state.saved.visitedPois[poiVisitKey(point)] = true;
  persistSavedState();
  buildPoiPins();
  renderPoiDetail(point);
  buildWorldNodes();
  buildThemeDock();
  refreshExplorationProgress();
  if (state.game) state.game.finished = true;
  els.playModeBadge.textContent = "任务完成";
  setPlayProgress(100, "实景点位已打卡");
  els.playGuideText.textContent = `${point.label || point.name}的现场观察已经存入漫游者档案。`;
  els.playWorkspace.innerHTML = `
    <div class="play-complete">
      <span class="complete-burst" aria-hidden="true">✦</span>
      <p>REAL-WORLD TASK COMPLETE</p>
      <h3>${escapeHtml(point.label || point.name)}打卡成功</h3>
      <span>${escapeHtml(island.name)} · 实景点位印章</span>
      <div class="complete-stamps"><i>✓</i><i>${escapeHtml(island.shortName.slice(0, 1))}</i><i>10m</i></div>
    </div>`;
  setPlayFooter({
    hint: "任务进度仅保存在当前浏览器。",
    primaryText: "返回任务地图",
    hideSecondary: true,
    onPrimary: () => {
      closeGameplay();
      selectPoi(point.id);
    }
  });
  showToast(`“${point.label || point.name}”任务完成`);
}

function openPoiTask(point) {
  const island = currentIsland();
  const distance = distanceToPoint(point);
  if (!island || !point || distance > INTERACTION_RADIUS_METERS) {
    showToast(`距离任务点还有 ${formatDistance(distance)}，请移动到 10 米内`);
    return;
  }
  clearPlayTimer();
  const stepLabels = island.id === "art"
    ? ["辨认人物与题名", "观察雕塑姿态和环境", "记录一条艺术印象"]
    : ["确认建筑或地标", "观察空间和方向", "收集一条现场线索"];
  const selectedSteps = new Set();
  state.game = { key: `${island.id}:poi:${point.id}`, data: { pointId: point.id }, pointTask: true, finished: false };
  els.playKicker.textContent = `${point.category || "实景点位"} · 10 米现场任务`;
  els.playTitle.textContent = `${point.label || point.name} · 点位任务`;
  els.playNpc.src = island.npc;
  els.playNpc.alt = `${island.name}向导：${island.npcName}`;
  els.playModeBadge.textContent = "实景互动";
  els.playGuideText.textContent = `已经进入 ${formatDistance(distance)} 互动范围。完成三项现场观察，即可收集这个点位的任务印章。`;
  els.playWorkspace.innerHTML = `
    <section class="point-task-intro">
      <span aria-hidden="true">◎</span>
      <div><small>${escapeHtml(point.category || "实景任务")}</small><b>${escapeHtml(point.label || point.name)}</b><p>${escapeHtml(point.note || point.place || "观察这个真实地点，并完成现场记录。")}</p></div>
      <strong>${formatDistance(distance)}</strong>
    </section>
    <div class="point-task-checks" aria-label="现场观察任务"></div>`;
  const checks = els.playWorkspace.querySelector(".point-task-checks");
  stepLabels.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "point-task-step";
    button.innerHTML = `<span>${index + 1}</span><b>${escapeHtml(label)}</b><i>待完成</i>`;
    button.addEventListener("click", () => {
      if (selectedSteps.has(index)) selectedSteps.delete(index);
      else selectedSteps.add(index);
      const selected = selectedSteps.has(index);
      button.classList.toggle("is-done", selected);
      button.querySelector("i").textContent = selected ? "已完成 ✓" : "待完成";
      setPlayProgress(Math.round(selectedSteps.size / stepLabels.length * 100), selectedSteps.size === stepLabels.length ? "现场观察完成" : `已完成 ${selectedSteps.size} / ${stepLabels.length}`);
      els.playPrimary.disabled = selectedSteps.size !== stepLabels.length;
    });
    checks.append(button);
  });
  setPlayProgress(0, "完成 0 / 3");
  setPlayFooter({
    hint: "必须位于任务点 10 米范围内才能开始；任务内容仅保存在本地。",
    primaryText: "完成任务并打卡",
    primaryDisabled: true,
    secondaryText: "清空选择",
    onPrimary: () => finishPoiTask(point),
    onSecondary: () => {
      selectedSteps.clear();
      checks.querySelectorAll("button").forEach((button) => {
        button.classList.remove("is-done");
        button.querySelector("i").textContent = "待完成";
      });
      setPlayProgress(0, "完成 0 / 3");
      els.playPrimary.disabled = true;
    }
  });
  els.playLayer.classList.add("is-open");
  els.playLayer.setAttribute("aria-hidden", "false");
  els.playLayer.inert = false;
  closePanel();
  window.setTimeout(() => checks.querySelector("button")?.focus(), 80);
}

function openGameplay() {
  const island = currentIsland();
  const spot = currentSpot();
  if (!island || !spot || spot.status === "locked") return;
  clearPlayTimer();
  state.game = { key: island.id + ":" + spot.id, data: {}, finished: false };
  els.playKicker.textContent = spot.kicker + " · 可玩 DEMO";
  els.playTitle.textContent = spot.title;
  els.playNpc.src = island.npc;
  els.playNpc.alt = island.name + "向导：" + island.npcName;
  els.playModeBadge.textContent = "岛上活动";
  els.playLayer.classList.add("is-open");
  els.playLayer.setAttribute("aria-hidden", "false");
  els.playLayer.inert = false;
  closePanel();
  renderGameplay();
  window.setTimeout(() => els.playPrimary.focus(), 80);
}

function closeGameplay() {
  clearPlayTimer();
  els.playLayer.classList.remove("is-open");
  els.playLayer.setAttribute("aria-hidden", "true");
  els.playLayer.inert = true;
  state.game = null;
  document.dispatchEvent(new CustomEvent("hahaisland:game-closed"));
}

function openPersonalizedRoute() {
  if (!state.data) return;
  closeGameplay();
  closePanel();
  state.movementKeys.clear();
  stopJoystick();
  document.dispatchEvent(new CustomEvent("hahaisland:open-planner"));
}

document.addEventListener("hahaisland:planner-visibility", (event) => {
  state.navigationOpen = event.detail?.open === true;
  state.movementKeys.clear();
  stopJoystick();
});

document.addEventListener("hahaisland:my-island-visibility", (event) => {
  state.myIslandOpen = event.detail?.open === true;
  state.movementKeys.clear();
  stopJoystick();
});

function resetGameplay() {
  if (!state.game) return;
  clearPlayTimer();
  state.game.data = {};
  state.game.finished = false;
  els.playModeBadge.textContent = "实景互动";
  renderGameplay();
}

function openUtilityDialog({ kicker, title, mode, guide, content }) {
  clearPlayTimer();
  state.game = { key: "utility:" + mode, data: {}, utility: true };
  const island = currentIsland();
  els.playKicker.textContent = kicker;
  els.playTitle.textContent = title;
  els.playNpc.src = island.npc;
  els.playNpc.alt = island.name + "向导：" + island.npcName;
  els.playModeBadge.textContent = "群岛工具";
  els.playGuideText.textContent = guide;
  els.playWorkspace.innerHTML = content;
  setPlayProgress(100, "信息已同步");
  setPlayFooter({
    hint: "设置与进度仅保存在当前浏览器。",
    primaryText: "完成",
    hideSecondary: true,
    onPrimary: closeGameplay
  });
  els.playLayer.classList.add("is-open");
  els.playLayer.setAttribute("aria-hidden", "false");
  els.playLayer.inert = false;
  closePanel();
}

function openPoiCommunity(point) {
  const entry = poiCommunityEntry(point);
  if (!entry) {
    showToast("这个地标的词云与评论尚未载入");
    return;
  }
  const comments = Array.isArray(entry.comments) ? entry.comments : [];
  const totalComments = Number(entry.totalComments) || comments.length;
  const sourceLabel = entry.generated ? "本地演示" : "压缩包资料";
  const wordCloud = entry.wordCloud
    ? `<figure class="poi-wordcloud-card">
        <img src="${escapeHtml(entry.wordCloud)}" alt="${escapeHtml(point.label || point.name)}评论词云">
        <figcaption><span>原始词云图</span><b>${totalComments} 条评论样本</b></figcaption>
      </figure>`
    : `<figure class="poi-wordcloud-card poi-wordcloud-card-fallback">
        <div class="poi-wordcloud-fallback" aria-label="${escapeHtml(point.label || point.name)}演示词云">
          ${(entry.keywords || []).map((keyword, index) => `<span class="word-rank-${index % 7}">${escapeHtml(keyword)}</span>`).join("")}
        </div>
        <figcaption><span>本地演示词云</span><b>${totalComments} 条体验样例</b></figcaption>
      </figure>`;
  const commentCards = comments.length
    ? comments.map((comment, index) => `
        <article class="poi-comment-card">
          <header>
            <span class="poi-comment-index">${String(index + 1).padStart(2, "0")}</span>
            <div><b>${escapeHtml(comment.author || "匿名漫游者")}</b><small>${escapeHtml(comment.platform || "公开资料")} · ${escapeHtml(comment.date || "日期未标注")}</small></div>
            <em>${escapeHtml(comment.type || "评论")}</em>
          </header>
          <p>${escapeHtml(comment.text || "")}</p>
          ${comment.excerpt ? '<small class="poi-comment-excerpt">长评论节选</small>' : ""}
        </article>`).join("")
    : '<p class="poi-comment-empty">这个地标暂时没有可展示的评论。</p>';
  openUtilityDialog({
    kicker: "奥德赛岛 · 地标印象",
    title: `${point.label || point.name} · 词云与评论`,
    mode: `poi-community-${point.id}`,
    guide: entry.generated
      ? "原压缩包未覆盖这个点位，这里先用明确标注的本地样例补齐演示链路。"
      : `词云使用压缩包原图；右侧从 ${totalComments} 条资料中精选 ${comments.length} 条，保留平台、作者与日期。`,
    content: `<section class="poi-community-shell">
      <div class="poi-community-visual">
        <div class="poi-community-label"><span>${sourceLabel}</span><small>${escapeHtml(point.category || "校园地标")}</small></div>
        ${wordCloud}
      </div>
      <div class="poi-community-comments">
        <header><div><small>LANDMARK VOICES</small><h3>漫游者怎么说</h3></div><b>${comments.length} / ${totalComments}</b></header>
        <div class="poi-comment-list">${commentCards}</div>
      </div>
    </section>`
  });
  els.playModeBadge.textContent = "地标印象";
  setPlayProgress(100, entry.generated ? "演示内容已载入" : "词云与评论已载入");
  document.querySelector(".play-footer p").textContent = entry.generated
    ? "此点位不在本次 20 点压缩包中，内容已明确标注为本地演示样例。"
    : "评论整理自用户提供的公开资料压缩包，仅用于本地 Demo 展示。";
}

function openTaskDashboard() {
  const islands = state.data.islands.filter((island) => pointDatasetForIsland(island));
  const total = islands.reduce((sum, island) => sum + pointDatasetForIsland(island).points.length, 0);
  const completed = islands.reduce((sum, island) => sum + completedPointCount(island), 0);
  const percent = total ? Math.round(completed / total * 100) : 0;
  openUtilityDialog({
    kicker: "实景任务 · 真实坐标",
    title: "探索任务与岛上活动",
    mode: "tasks",
    guide: "实景任务需要进入 10 米范围；岛上活动可以直接体验，完成后会存进各岛的收藏。",
    content: '<section class="task-overview"><div><small>实景任务总进度</small><b>' + completed + " / " + total + '</b><span>' + (completed === total ? "全部实景任务已完成" : "还有 " + (total - completed) + " 个真实点位等待探索") + '</span></div><div class="task-overall-bar" aria-label="总进度 ' + percent + '%"><i style="--task-progress:' + percent + '%"></i></div></section><div class="task-dashboard"></div>'
  });
  const dashboard = els.playWorkspace.querySelector(".task-dashboard");
  islands.forEach((island) => {
    const dataset = pointDatasetForIsland(island);
    const done = completedPointCount(island);
    const islandPercent = dataset.points.length ? Math.round(done / dataset.points.length * 100) : 0;
    const card = document.createElement("article");
    card.className = "task-island-card";
    card.style.setProperty("--card-color", island.color);
    card.innerHTML = '<header><img src="' + island.image + '" alt=""><span><small>' + done + " / " + dataset.points.length + ' 已完成</small><b>' + island.name + '</b><em>' + escapeHtml(dataset.label) + '</em></span><strong>' + islandPercent + '%</strong></header><div class="task-card-progress"><i style="--task-progress:' + islandPercent + '%"></i></div><div class="task-point-preview">' + dataset.points.slice(0, 6).map((point) => '<span>' + escapeHtml(point.label || point.name) + '</span>').join("") + '<span>+' + Math.max(0, dataset.points.length - 6) + ' 个点位</span></div><button class="task-map-action" type="button">进入地图寻找任务点 →</button>';
    card.querySelector(".task-map-action").addEventListener("click", () => {
      closeGameplay();
      showIslandMap(island.id);
      togglePoiExplorer(true);
    });
    dashboard.append(card);
  });
  els.playWorkspace.insertAdjacentHTML("beforeend",'<h3 class="activity-dashboard-title">岛上活动 · 我的收藏</h3><div class="activity-dashboard"></div>');
  const activityDashboard = els.playWorkspace.querySelector(".activity-dashboard");
  state.data.islands.forEach(island=>{
    const activities=islandActivities(island), done=completedActivityCount(island);
    if(!activities.length)return;
    const card=document.createElement("article");card.className="task-island-card";
    card.innerHTML=`<header><img src="${escapeHtml(island.image)}" alt=""><span><small>${done} / ${activities.length} 已完成</small><b>${escapeHtml(island.name)}</b><em>${escapeHtml(island.npcName)}的邀请</em></span></header><div class="task-point-preview">${activities.map(spot=>`<span>${escapeHtml(spot.title)}</span>`).join('')}</div><button class="task-map-action" type="button">查看岛上活动 →</button>`;
    card.querySelector("button").addEventListener("click",()=>openIslandActivities(island.id));activityDashboard.append(card);
  });
  document.querySelector(".play-footer p").textContent = "地图只显示真实任务坐标；岛上活动独立保存进度。";
}

function setReferenceExpanded(force) {
  const expanded = Boolean(force && state.referenceVisible);
  state.referenceExpanded = expanded;
  els.referenceLocator.classList.toggle("is-expanded", expanded);
  els.referenceLocator.setAttribute("aria-hidden", String(!expanded));
  els.referenceMapToggle.setAttribute("aria-expanded", String(expanded));
  const helper = els.referenceMapToggle.querySelector("small");
  if (helper) helper.textContent = expanded ? "收起对照" : "展开对照";
  if (expanded) window.requestAnimationFrame(() => renderReferenceMap(true));
}

function applyLayerSettings() {
  els.campusMapView.classList.toggle("hide-geo-grid", !state.layers.grid);
  els.campusMapView.classList.toggle("hide-pin-labels", !state.layers.labels);
  els.campusMapView.classList.toggle("hide-poi-pins", !state.layers.points);
  state.referenceVisible = state.layers.reference;
  els.referenceLocator.classList.toggle("is-hidden", !state.referenceVisible);
  els.referenceMapToggle.hidden = !state.referenceVisible;
  if (!state.referenceVisible) setReferenceExpanded(false);
  else els.referenceMapToggle.setAttribute("aria-expanded", String(state.referenceExpanded));
}

function openLayerControls() {
  openUtilityDialog({
    kicker: "地图设置 · 图层",
    title: "岛屿图层控制",
    mode: "layers",
    guide: "按需要打开坐标网格、实景任务点、任务标签和右下角权威地图参照。主地图固定使用线性校准后的像素地图。",
    content: '<div class="layer-options"><label><span><b>坐标标定网格</b><small>显示四角经纬度与网格线</small></span><input type="checkbox" data-layer="grid"></label><label><span><b>实景任务点</b><small>显示校园 POI 与人物雕塑任务坐标</small></span><input type="checkbox" data-layer="points"></label><label><span><b>任务点位标签</b><small>靠近或选中坐标时显示任务名称与距离</small></span><input type="checkbox" data-layer="labels"></label><label><span><b>权威地图参照</b><small>显示右下角可展开的标准地图控件</small></span><input type="checkbox" data-layer="reference"></label></div><div class="layer-actions"><span><b>自动保存</b><small>设置会保留在当前浏览器</small></span><button type="button" data-layer-reset>恢复默认图层</button></div>'
  });
  els.playWorkspace.querySelectorAll("[data-layer]").forEach((input) => {
    input.checked = state.layers[input.dataset.layer];
    input.addEventListener("change", () => {
      state.layers[input.dataset.layer] = input.checked;
      state.saved.layers = { ...state.layers };
      persistSavedState();
      applyLayerSettings();
      setPlayProgress(100, "图层设置已保存");
    });
  });
  els.playWorkspace.querySelector("[data-layer-reset]").addEventListener("click", () => {
    state.layers = { grid: true, labels: true, points: true, reference: true };
    state.saved.layers = { ...state.layers };
    persistSavedState();
    els.playWorkspace.querySelectorAll("[data-layer]").forEach((input) => { input.checked = true; });
    applyLayerSettings();
    setPlayProgress(100, "已恢复默认图层");
    showToast("图层已恢复并保存");
  });
  document.querySelector(".play-footer p").textContent = state.view === "map" ? "关闭后继续探索当前岛屿地图。" : "进入任意岛屿地图即可查看效果。";
}

function openProfile() {
  const taskIslands = state.data.islands.filter((island) => pointDatasetForIsland(island));
  const total = taskIslands.reduce((sum, island) => sum + pointDatasetForIsland(island).points.length, 0);
  const completed = taskIslands.reduce((sum, island) => sum + completedPointCount(island), 0);
  const explored = state.data.islands.filter((island) => completedPointCount(island) + completedActivityCount(island) > 0).length;
  const islandProgress = taskIslands.map((island) => {
    const islandTotal = pointDatasetForIsland(island).points.length;
    const islandDone = completedPointCount(island);
    const islandPercent = islandTotal ? Math.round(islandDone / islandTotal * 100) : 0;
    return '<div class="profile-island-row" style="--profile-color:' + island.color + '"><span><b>' + escapeHtml(island.name) + '</b><small>' + islandDone + " / " + islandTotal + ' 个实景任务</small></span><div><i style="--profile-progress:' + islandPercent + '%"></i></div><strong>' + islandPercent + '%</strong></div>';
  }).join("");
  const badges = [{ label: "H", name: "漫游启程", unlocked: true }].concat(state.data.islands.map((island) => {
    return { label: island.shortName.slice(0, 1), name: island.name, unlocked: completedPointCount(island) + completedActivityCount(island) > 0 };
  }));
  openUtilityDialog({
    kicker: "漫游者档案 · 本地进度",
    title: "岛屿漫游者",
    mode: "profile",
    guide: "实景任务与岛上活动都会留下探索足迹，各岛的作品与手记保留在这台设备上。",
    content: '<div class="profile-summary"><div><small>完成任务</small><b>' + completed + " / " + total + '</b></div><div><small>实景任务岛</small><b>' + explored + " / " + taskIslands.length + '</b></div><div><small>互动半径</small><b>10 m</b></div><div><small>匿名共创</small><b>' + (state.saved.moods.length + state.saved.community.length) + '</b></div></div><section class="profile-progress-panel"><header><b>实景任务进度</b><small>到达 10 米内并完成现场观察后自动更新</small></header><div class="profile-island-list">' + islandProgress + '</div></section><section class="profile-stamp-panel"><header><b>岛屿印章</b><small>完成对应岛的任一真实点位任务即可点亮</small></header><div class="profile-badges">' + badges.map((badge) => '<span class="' + (badge.unlocked ? "is-unlocked" : "is-locked") + '" title="' + escapeHtml(badge.name) + '">' + escapeHtml(badge.label) + '<small>' + (badge.unlocked ? "已获得" : "待解锁") + '</small></span>').join("") + '</div></section>'
  });
  const activityTotal=state.data.islands.reduce((sum,island)=>sum+islandActivities(island).length,0);
  const activityDone=state.data.islands.reduce((sum,island)=>sum+completedActivityCount(island),0);
  els.playWorkspace.insertAdjacentHTML("beforeend",`<section class="profile-progress-panel"><header><b>岛上活动与收藏</b><small>${activityDone} / ${activityTotal} 项已完成</small></header><div class="profile-island-list">${state.data.islands.map(island=>`<div class="profile-island-row"><span><b>${escapeHtml(island.name)}</b><small>${completedActivityCount(island)} / ${islandActivities(island).length} 个岛上活动</small></span><button type="button" class="activity-profile-link" data-profile-island="${island.id}">打开 →</button></div>`).join('')}</div></section>`);
  els.playWorkspace.querySelectorAll('[data-profile-island]').forEach(button=>button.addEventListener('click',()=>openIslandActivities(button.dataset.profileIsland)));
  const exploredCard=els.playWorkspace.querySelector('.profile-summary > div:nth-child(2)');
  exploredCard.querySelector('small').textContent='探索岛屿';exploredCard.querySelector('b').textContent=explored+' / '+state.data.islands.length;
  els.playWorkspace.querySelector('.profile-summary > div:first-child small').textContent='实景任务';
  els.playWorkspace.querySelector('.profile-summary > div:last-child small').textContent='心情与留言';
  els.playWorkspace.querySelector('.profile-stamp-panel header small').textContent='完成任一实景任务或岛上活动即可点亮对应岛屿';
  els.playWorkspace.insertAdjacentHTML("beforeend", '<button class="island-route-shortcut profile-route-action" type="button" data-profile-route><b>个性化寻路与漫步记录 →</b><small>查看路线、四维偏好和已经保存的漫步体验。</small></button>');
  els.playWorkspace.querySelector("[data-profile-route]").addEventListener("click", openPersonalizedRoute);
}

function renderRouteChoice() {
  const choices = state.data.islands.filter((island) => island.id !== "odyssey");
  els.playGuideText.textContent = "罗盘已经展开。选一座岛，我来帮你生成今天的漫游航线。";
  els.playWorkspace.innerHTML =
    '<button class="island-route-shortcut" type="button" data-personalized-route><b>个性化寻路 →</b><small>按四维偏好与时间预算，规划真实道路上的通勤或漫步路线。</small></button>' +
    '<div class="route-compass" aria-hidden="true"><span>✦</span><i></i></div>' +
    '<div class="route-grid" aria-label="选择目的岛"></div>';
  els.playWorkspace.querySelector("[data-personalized-route]").addEventListener("click", openPersonalizedRoute);
  const grid = els.playWorkspace.querySelector(".route-grid");
  choices.forEach((island) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-option";
    button.style.setProperty("--route-color", island.color);
    button.innerHTML = '<i></i><b>' + island.name + '</b><small>' + island.subtitle + '</small>';
    button.addEventListener("click", () => {
      state.game.data.choice = island.name;
      state.game.data.choiceId = island.id;
      grid.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      els.playPrimary.disabled = false;
      setPlayProgress(60, "航线已锁定");
    });
    grid.append(button);
  });
  setPlayProgress(20, "等待选择目的地");
  setPlayFooter({
    hint: "选择只影响本次 Demo 航线。",
    primaryText: "确认启航",
    primaryDisabled: true,
    onPrimary: () => {
      const destination = state.game.data.choiceId;
      finishGameplay("航线校准完成，下一站：" + state.game.data.choice + "。", () => showIslandMap(destination));
    }
  });
}

function renderNearbyRadar() {
  const scanned = state.game.data.scanned;
  els.playGuideText.textContent = scanned ? "附近发现了三位漫游者，选一位交换岛屿见闻吧。" : "按下扫描，我会搜索这片海域里正在漫游的人。";
  if (!scanned) {
    els.playWorkspace.innerHTML =
      '<div class="radar-card"><div class="radar-screen"><i></i><span></span><b>0</b></div>' +
      '<p>附近搜索尚未启动</p><small>搜索范围 · 200 米</small></div>';
    setPlayProgress(10, "雷达待机");
    setPlayFooter({
      primaryText: "扫描附近漫游者",
      hideSecondary: true,
      onPrimary: () => {
        els.playPrimary.disabled = true;
        els.playWorkspace.querySelector(".radar-card").classList.add("is-scanning");
        els.playWorkspace.querySelector(".radar-screen b").textContent = "…";
        setPlayProgress(45, "正在扫描海面");
        state.playTimer = window.setTimeout(() => {
          state.game.data.scanned = true;
          renderNearbyRadar();
        }, 900);
      }
    });
    return;
  }
  const island = currentIsland();
  const people = [
    ["岛屿观察员", island.name, "正在记录附近的新发现"],
    ["海风记录者", "疗愈岛", "刚完成一次呼吸"],
    ["像素涂鸦师", "涂鸦岛", "带来一张新贴纸"],
    ["月光策展人", "文艺岛", "正在交换雕塑线索"]
  ];
  els.playWorkspace.innerHTML = '<div class="nearby-list"></div>';
  const list = els.playWorkspace.querySelector(".nearby-list");
  people.forEach((person, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "nearby-person";
    card.innerHTML = '<span>' + (index + 1) + '</span><div><b>' + person[0] + '</b><small>' + person[1] + ' · ' + person[2] + '</small></div><i>打招呼</i>';
    card.addEventListener("click", () => {
      state.game.data.greeted = person[0];
      list.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === card));
      card.querySelector("i").textContent = "已交换";
      els.playPrimary.disabled = false;
      setPlayProgress(80, "已交换一份见闻");
    });
    list.append(card);
  });
  setPlayProgress(60, "找到 3 位附近漫游者");
  setPlayFooter({
    primaryText: "收下见闻并完成",
    primaryDisabled: true,
    secondaryText: "重新扫描",
    onSecondary: resetGameplay,
    onPrimary: () => finishGameplay("你和" + state.game.data.greeted + "交换了岛屿见闻，海面又热闹了一点。")
  });
}

function renderVoyageLog() {
  els.playGuideText.textContent = "启航前写下一件想完成的小事，等回到奥德赛时再打开看看。";
  els.playWorkspace.innerHTML =
    '<div class="logbook-card"><span>SEP · 12</span><label for="voyageGoal">今天想在群岛完成什么？</label>' +
    '<textarea id="voyageGoal" maxlength="80" placeholder="例如：在文艺岛找到第三座雕塑……"></textarea>' +
    '<div class="prompt-chips"><button type="button">认识一个新朋友</button><button type="button">完成一次共创</button><button type="button">给情绪放个假</button></div>' +
    '<small id="goalCount">0 / 80</small></div>';
  const input = els.playWorkspace.querySelector("#voyageGoal");
  const count = els.playWorkspace.querySelector("#goalCount");
  const sync = () => {
    state.game.data.goal = input.value.trim();
    count.textContent = input.value.length + " / 80";
    els.playPrimary.disabled = state.game.data.goal.length < 2;
    setPlayProgress(state.game.data.goal ? 70 : 20, state.game.data.goal ? "航海目标已写入" : "等待写下目标");
  };
  input.addEventListener("input", sync);
  els.playWorkspace.querySelectorAll(".prompt-chips button").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.textContent;
      sync();
    });
  });
  setPlayProgress(20, "等待写下目标");
  setPlayFooter({
    primaryText: "盖章启航",
    primaryDisabled: true,
    onPrimary: () => finishGameplay("今天的航海目标已经封存在日志里，出发吧。")
  });
}

function renderSculptureHunt() {
  const clues = [
    ["月相守望者", "向东北前进 48 米", 28],
    ["听风的人", "沿紫色小径向东 22 米", 108],
    ["海边的诗", "转向西北，靠近月光平台", -42]
  ];
  const step = state.game.data.step || 0;
  const clue = clues[step];
  els.playGuideText.textContent = "跟着方向指针寻找雕塑。抵达后按下打卡，线索会指向下一座。";
  els.playWorkspace.innerHTML =
    '<div class="hunt-board"><div class="hunt-arrow" style="--hunt-angle:' + clue[2] + 'deg"><span>↑</span><i></i></div>' +
    '<div class="hunt-clue"><small>雕塑 ' + (step + 1) + ' / 3</small><h3>' + clue[0] + '</h3><p>' + clue[1] + '</p>' +
    '<div class="hunt-dots"><i></i><i></i><i></i></div></div></div>';
  els.playWorkspace.querySelectorAll(".hunt-dots i").forEach((dot, index) => dot.classList.toggle("is-done", index <= step));
  setPlayProgress((step + 1) / 3 * 80, "正在寻找第 " + (step + 1) + " 座雕塑");
  setPlayFooter({
    hint: "Demo 中点击即可模拟抵达真实点位。",
    primaryText: step === 2 ? "完成定向打卡" : "已抵达，查看下一条线索",
    secondaryText: "从第一座开始",
    onSecondary: resetGameplay,
    onPrimary: () => {
      if (step === 2) finishGameplay("三座月光雕塑全部找到，定向挑战完成。");
      else {
        state.game.data.step = step + 1;
        renderSculptureHunt();
      }
    }
  });
}

function renderPocketGallery() {
  const impressions = ["像一场梦", "有点孤独", "充满力量", "想再看一会"];
  els.playGuideText.textContent = "策展没有标准答案。挑一个最接近你第一感觉的词就好。";
  els.playWorkspace.innerHTML =
    '<div class="gallery-piece"><span>MOONLIGHT / 09</span><div class="gallery-moon">◒</div><p>《海面上没有说完的话》</p></div>' +
    '<div class="impression-grid"></div>';
  const grid = els.playWorkspace.querySelector(".impression-grid");
  impressions.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      state.game.data.impression = label;
      grid.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
      els.playPrimary.disabled = false;
      setPlayProgress(78, "第一印象已收藏");
    });
    grid.append(button);
  });
  setPlayProgress(30, "观看今日作品");
  setPlayFooter({
    primaryText: "留下第一印象",
    primaryDisabled: true,
    onPrimary: () => finishGameplay("你的第一印象“" + state.game.data.impression + "”已放入口袋画廊。")
  });
}

function setupDrawingCanvas(canvas, transparent = false) {
  canvas.width = 720;
  canvas.height = 340;
  const context = canvas.getContext("2d");
  if (!transparent) {
    context.fillStyle = "#fffaf0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(162,138,215,.2)";
    context.lineWidth = 2;
    for (let y = 42; y < canvas.height; y += 42) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
  }
  let drawing = false;
  let keyboardPoint = {x:canvas.width/2,y:canvas.height/2};
  canvas.tabIndex=0;canvas.setAttribute("role","application");
  canvas.setAttribute("aria-keyshortcuts","ArrowUp ArrowDown ArrowLeft ArrowRight Space");
  const help=document.createElement("small");help.className="canvas-keyboard-help";
  help.textContent="拖动手指或鼠标绘画；聚焦画布后，方向键画线，空格画点。";canvas.after(help);
  canvas.onkeydown=event=>{
    const directions={ArrowUp:[0,-18],ArrowDown:[0,18],ArrowLeft:[-18,0],ArrowRight:[18,0]};
    if(!directions[event.key]&&event.key!==" ")return;
    event.preventDefault();
    context.strokeStyle=state.game.data.ink||"#ff9027";context.fillStyle=context.strokeStyle;context.lineWidth=transparent?12:7;context.lineCap="round";
    if(event.key===" "){context.beginPath();context.arc(keyboardPoint.x,keyboardPoint.y,6,0,Math.PI*2);context.fill();}
    else{const [dx,dy]=directions[event.key];const next={x:clamp(keyboardPoint.x+dx,0,canvas.width),y:clamp(keyboardPoint.y+dy,0,canvas.height)};context.beginPath();context.moveTo(keyboardPoint.x,keyboardPoint.y);context.lineTo(next.x,next.y);context.stroke();keyboardPoint=next;}
    state.game.data.drawn=true;els.playPrimary.disabled=false;setPlayProgress(72,"创作已记录");
  };
  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * canvas.width,
      y: (event.clientY - rect.top) / rect.height * canvas.height
    };
  };
  canvas.onpointerdown = (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const current = point(event);
    keyboardPoint=current;
    context.beginPath();
    context.moveTo(current.x, current.y);
  };
  canvas.onpointermove = (event) => {
    if (!drawing) return;
    const current = point(event);
    context.strokeStyle = state.game.data.ink || "#6c58b5";
    context.lineWidth = transparent ? 12 : 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineTo(current.x, current.y);
    context.stroke();
    state.game.data.drawn = true;
    els.playPrimary.disabled = false;
    setPlayProgress(72, "创作已记录");
  };
  canvas.onpointerup = () => { drawing = false; };
  canvas.onpointercancel = () => { drawing = false; };
  return context;
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function rememberArtwork(canvas) {
  const preview = document.createElement("canvas");
  preview.width = 520;
  preview.height = Math.round(canvas.height / canvas.width * 520);
  preview.getContext("2d").drawImage(canvas,0,0,preview.width,preview.height);
  state.game.data.artwork = preview.toDataURL("image/jpeg",.72);
}

function downloadStickerCard(prompt, style, coordinate) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  const palettes = {
    neon: ["#3c1f78", "#f3479a"],
    candy: ["#ff9fc1", "#ffe572"],
    ocean: ["#207ba3", "#67d9cf"]
  };
  const palette = palettes[style] || palettes.candy;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(1, palette[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.22)";
  context.fillRect(54, 52, 792, 456);
  context.strokeStyle = "#464254";
  context.lineWidth = 14;
  context.strokeRect(54, 52, 792, 456);
  context.fillStyle = "#fff5d6";
  context.strokeStyle = "#464254";
  context.lineWidth = 12;
  context.beginPath();
  context.roundRect(108, 116, 188, 188, 42);
  context.fill();
  context.stroke();
  context.fillStyle = "#464254";
  context.font = "900 116px Microsoft YaHei, sans-serif";
  context.fillText("H", 155, 255);
  context.font = "900 28px Microsoft YaHei, sans-serif";
  context.fillText("岛屿创意贴纸", 342, 154);
  context.font = "900 42px Microsoft YaHei, sans-serif";
  context.fillText(prompt.slice(0, 16), 342, 218);
  context.font = "700 24px Consolas, monospace";
  context.fillText("ISLAND STICKER · " + coordinate, 342, 268);
  context.font = "900 22px Microsoft YaHei, sans-serif";
  context.fillText("HAHAISLAND · 涂鸦岛", 108, 444);
  rememberArtwork(canvas);
  downloadCanvas(canvas, "hahaisland-island-sticker.png");
}

function renderPierSketch() {
  els.playGuideText.textContent = "用鼠标或手指画下眼前的海风。几笔也算一张完整的速写。";
  els.playWorkspace.innerHTML =
    '<div class="sketch-tools"><span>码头速写纸</span><div><button data-ink="#6c58b5" class="is-selected" type="button"></button><button data-ink="#ec718f" type="button"></button><button data-ink="#3f9da0" type="button"></button></div></div>' +
    '<canvas class="sketch-canvas" aria-label="可绘制的码头速写画布"></canvas>';
  const canvas = els.playWorkspace.querySelector("canvas");
  const context = setupDrawingCanvas(canvas);
  els.playWorkspace.querySelectorAll("[data-ink]").forEach((button) => {
    button.style.background = button.dataset.ink;
    button.addEventListener("click", () => {
      state.game.data.ink = button.dataset.ink;
      els.playWorkspace.querySelectorAll("[data-ink]").forEach((item) => item.classList.toggle("is-selected", item === button));
    });
  });
  setPlayProgress(25, "画布已经展开");
  setPlayFooter({
    hint: "作品只保留在当前本地页面。",
    primaryText: "收藏这张速写",
    primaryDisabled: true,
    secondaryText: "清空画布",
    onSecondary: () => {
      state.game.data = {};
      renderPierSketch();
    },
    onPrimary: () => {
      rememberArtwork(canvas);
      downloadCanvas(canvas, "hahaisland-pier-sketch.png");
      finishGameplay("海风和线条都被你收进了今天的速写里，作品也已保存。")
    }
  });
  context.strokeStyle = "#6c58b5";
}

function renderMoodMap() {
  const moods = [["☀", "轻快", 5], ["◒", "平静", 4], ["≈", "疲惫", 3], ["☂", "低落", 2], ["⚡", "烦躁", 1]];
  const recentMoodCount = state.saved.moods.length;
  els.playGuideText.textContent = "选一个最接近此刻的情绪，它会化成岛屿情绪地图里的一颗光点。";
  els.playWorkspace.innerHTML =
    '<div class="emotion-map" aria-hidden="true"><span style="--x:18%;--y:24%;--s:44px">☀</span><span style="--x:62%;--y:18%;--s:32px">≈</span><span style="--x:76%;--y:62%;--s:54px">◒</span><span style="--x:34%;--y:70%;--s:38px">☂</span><b>我的情绪海域<br><small>' + recentMoodCount + ' 份本地心情记录</small></b></div>' +
    '<div class="mood-choices" aria-label="选择情绪"></div>';
  const choices = els.playWorkspace.querySelector(".mood-choices");
  moods.forEach((mood) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = '<span>' + mood[0] + '</span><b>' + mood[1] + '</b><small>' + mood[2] + ' / 5</small>';
    button.addEventListener("click", () => {
      state.game.data.mood = mood[1];
      state.game.data.score = mood[2];
      choices.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
      choices.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed",String(item === button)));
      els.playPrimary.disabled = false;
      setPlayProgress(75, "情绪值已选择");
    });
    choices.append(button);
  });
  setPlayProgress(25, "感受此刻的心情");
  setPlayFooter({
    primaryText: "收藏此刻的心情",
    primaryDisabled: true,
    onPrimary: () => {
      state.saved.moods.push({ mood: state.game.data.mood, score: state.game.data.score, time: Date.now() });
      state.saved.moods = state.saved.moods.slice(-20);
      persistSavedState();
      finishGameplay("“" + state.game.data.mood + "”已经变成情绪海域里的一颗匿名光点。")
    }
  });
}

function renderBreathingWalk() {
  els.playGuideText.textContent = "跟随光圈完成三轮短呼吸：吸气、停留、再慢慢呼出。";
  els.playWorkspace.innerHTML =
    '<div class="breath-scene"><div class="breath-ring"><span class="breath-core">准备</span></div><p>任选一种声音，或静音跟随光圈。</p><div class="breath-rounds"><i></i><i></i><i></i></div></div><div class="activity-options ambient-options">'+['海浪','风声','细雨'].map(kind=>'<button type="button" data-ambient="'+kind+'" aria-pressed="'+((state.game.data.sound||'海浪')===kind)+'">'+kind+'</button>').join('')+'<button type="button" data-audio-toggle>声音关闭</button></div><p class="activity-feedback">声音为本地合成，可随时关闭。</p>';
  const audioButton=els.playWorkspace.querySelector('[data-audio-toggle]');
  els.playWorkspace.querySelectorAll('[data-ambient]').forEach(button=>button.addEventListener('click',()=>{
    state.game.data.sound=button.dataset.ambient;
    els.playWorkspace.querySelectorAll('[data-ambient]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    if(state.playAudio)startIslandSound(state.game.data.sound);
  }));
  audioButton.addEventListener('click',()=>{
    if(state.playAudio){state.playAudio.source.stop();state.playAudio.context.close().catch(()=>{});state.playAudio=null;audioButton.textContent='声音关闭';}
    else if(startIslandSound(state.game.data.sound||'海浪'))audioButton.textContent='声音开启';
  });
  setPlayProgress(10, "准备呼吸");
  setPlayFooter({
    primaryText: "开始 3 轮呼吸",
    hideSecondary: true,
    onPrimary: () => {
      els.playPrimary.disabled = true;
      const core = els.playWorkspace.querySelector(".breath-core");
      const ring = els.playWorkspace.querySelector(".breath-ring");
      const rounds = els.playWorkspace.querySelectorAll(".breath-rounds i");
      const phases = ["吸气", "停留", "呼气"];
      let tick = 0;
      const game = state.game;
      const step = () => {
        if (state.game !== game) return;
        const phase = tick % 3;
        const round = Math.floor(tick / 3);
        core.textContent = phases[phase];
        ring.dataset.phase = phases[phase];
        rounds.forEach((dot, index) => dot.classList.toggle("is-done", index < round || (index === round && phase === 2)));
        setPlayProgress(15 + (tick + 1) / 9 * 75, "第 " + (round + 1) + " 轮 · " + phases[phase]);
        tick += 1;
        state.playTimer = window.setTimeout(() => {
          if (state.game !== game) return;
          if (tick >= 9) finishGameplay("三轮呼吸完成。现在的你，已经为情绪留出了一点空间。");
          else step();
        }, [3000,1000,4000][phase]);
      };
      step();
    }
  });
}

function renderHealingCommunity() {
  els.playGuideText.textContent = "先给这次体验打分，再留下一句话。你也可以只评分，不写内容。";
  const savedPosts = state.saved.community.slice(-2).reverse().map((post) => {
    const rating = clamp(Number(post.rating) || 0, 0, 5);
    return '<article><b>我的匿名留言 · 本地</b><span>' + "★".repeat(rating) + "☆".repeat(5 - rating) + '</span><p>' + escapeHtml(post.text || "只留下一份安静的评分。") + '</p></article>';
  }).join("");
  els.playWorkspace.innerHTML =
    '<div class="community-feed">' + (savedPosts || '<p class="activity-empty">这里还没有你的留言。留一句话，给下次回来的自己。</p>') + '</div>' +
    '<div class="community-form"><label>这次体验怎么样？</label><div class="rating-row" aria-label="体验评分"></div><textarea maxlength="100" placeholder="写下想说的话（可选）"></textarea></div>';
  const rating = els.playWorkspace.querySelector(".rating-row");
  const comment = els.playWorkspace.querySelector("textarea");
  comment.addEventListener("input", () => { state.game.data.comment = comment.value.trim(); });
  for (let score = 1; score <= 5; score += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "★";
    button.setAttribute("aria-label", score + " 分");
    button.addEventListener("click", () => {
      state.game.data.rating = score;
      rating.querySelectorAll("button").forEach((item, index) => item.classList.toggle("is-selected", index < score));
      els.playPrimary.disabled = false;
      setPlayProgress(75, score + " 星评价已选择");
    });
    rating.append(button);
  }
  setPlayProgress(30, "浏览匿名交流");
  setPlayFooter({
    primaryText: "保存留言与评分",
    primaryDisabled: true,
    onPrimary: () => {
      state.saved.community.push({ rating: state.game.data.rating, text: state.game.data.comment || "", time: Date.now() });
      state.saved.community = state.saved.community.slice(-12);
      persistSavedState();
      finishGameplay("你的 " + state.game.data.rating + " 星评价与留言已经收藏在这台设备的晚霞留言处。")
    }
  });
}

function renderStickerGenerator() {
  const generated = state.game.data.generated;
  els.playGuideText.textContent = generated ? "贴纸已经生成，可以保存为这次共创的成果。" : "描述一个想象中的校园角落，再选一种像素风格。";
  els.playWorkspace.innerHTML =
    '<div class="generator-form"><label for="stickerPrompt">我的共创描述</label><input id="stickerPrompt" maxlength="48" placeholder="例如：会开花的屋顶花园" value="">' +
    '<div class="style-picks"><button type="button" data-style="neon">霓虹</button><button type="button" data-style="candy">糖果</button><button type="button" data-style="ocean">海洋</button></div></div>' +
    '<div class="sticker-result' + (generated ? " is-visible style-" + state.game.data.style : "") + '"><span>✦</span><i>H</i><b id="generatedCopy">等待生成</b><em>' + (generated ? "ISLAND STICKER · " + state.game.data.coordinate : "等待你的校园想象") + '</em><small>创意贴纸 · 本地合成</small></div>';
  const input = els.playWorkspace.querySelector("#stickerPrompt");
  input.value = state.game.data.prompt || "";
  const resultCopy = els.playWorkspace.querySelector("#generatedCopy");
  if (generated) resultCopy.textContent = state.game.data.prompt;
  const sync = () => {
    state.game.data.prompt = input.value.trim();
    els.playPrimary.disabled = !generated && state.game.data.prompt.length < 2;
  };
  input.addEventListener("input", sync);
  els.playWorkspace.querySelectorAll("[data-style]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.style === state.game.data.style);
    button.addEventListener("click", () => {
      state.game.data.style = button.dataset.style;
      els.playWorkspace.querySelectorAll("[data-style]").forEach((item) => item.classList.toggle("is-selected", item === button));
    });
  });
  setPlayProgress(generated ? 82 : 30, generated ? "像素贴纸已生成" : "等待共创描述");
  setPlayFooter({
    hint: generated ? "贴纸由本地模板合成，可下载并收藏。" : "输入内容只在当前页面中处理。",
    primaryText: generated ? "保存生成作品" : "生成岛屿贴纸",
    primaryDisabled: !generated && !(state.game.data.prompt || "").length,
    secondaryText: "重新创作",
    hideSecondary: !generated,
    onSecondary: resetGameplay,
    onPrimary: () => {
      if (generated) {
        downloadStickerCard(state.game.data.prompt, state.game.data.style, state.game.data.coordinate);
        finishGameplay("你的校园想象“"+state.game.data.prompt+"”已经变成一张岛屿创意贴纸，作品已保存。");
      } else {
        state.game.data.generated = true;
        state.game.data.style = state.game.data.style || "candy";
        state.game.data.coordinate = "X" + Math.floor(18 + Math.random() * 64) + " · Y" + Math.floor(18 + Math.random() * 64);
        renderStickerGenerator();
      }
    }
  });
}

function createPuzzleOrder() {
  const order = Array.from({ length: 9 }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  if (order.every((piece, index) => piece === index)) [order[7], order[8]] = [order[8], order[7]];
  return order;
}

function renderCampusPuzzle() {
  const order = state.game.data.order || createPuzzleOrder();
  state.game.data.order = order;
  state.game.data.moves = state.game.data.moves || 0;
  const correct = order.filter((piece, index) => piece === index).length;
  els.playGuideText.textContent = "连续点击两块切片即可交换位置。还原完整校园图，就能点亮这处公共空间。";
  els.playWorkspace.innerHTML =
    '<div class="puzzle-wrap"><div class="campus-puzzle" aria-label="三乘三校园拼图"></div><div class="puzzle-copy"><b>' + correct + ' / 9</b><span>切片位置正确</span><small>已交换 ' + state.game.data.moves + ' 次 · 连续点击两块交换</small></div></div>';
  const board = els.playWorkspace.querySelector(".campus-puzzle");
  order.forEach((piece, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "puzzle-tile";
    button.style.backgroundImage = "url('./assets/maps/map-graffiti.jpg')";
    button.style.backgroundPosition = (piece % 3) * 50 + "% " + Math.floor(piece / 3) * 50 + "%";
    button.setAttribute("aria-label", "拼图切片 " + (piece + 1));
    button.addEventListener("click", () => {
      if (state.game.data.selected == null) {
        state.game.data.selected = index;
        button.classList.add("is-selected");
        return;
      }
      const from = state.game.data.selected;
      const next = order.slice();
      [next[from], next[index]] = [next[index], next[from]];
      state.game.data.selected = null;
      state.game.data.order = next;
      state.game.data.moves += 1;
      const solved = next.every((pieceIndex, position) => pieceIndex === position);
      if (solved) {
        setPlayProgress(100, "拼图已经还原");
        const game = state.game;
        state.playTimer = window.setTimeout(() => {if(state.game===game)finishGameplay("校园拼图已经完整复原，这处空间被你的共创点亮了。");}, 300);
      } else {
        renderCampusPuzzle();
      }
    });
    board.append(button);
  });
  setPlayProgress(correct / 9 * 90, correct + " 块位置正确");
  setPlayFooter({
    hint: "点击两块图片进行位置交换。",
    hidePrimary: true,
    secondaryText: "重新打乱",
    onSecondary: () => {
      state.game.data = { order: createPuzzleOrder(), moves: 0 };
      renderCampusPuzzle();
    }
  });
}

function renderPhotoGraffiti() {
  els.playGuideText.textContent = "选择一张照片或使用示意底图，在上面涂鸦，再用创意点亮效果完成共创。";
  els.playWorkspace.innerHTML =
    '<div class="photo-tools"><label class="photo-upload">选择照片<input type="file" accept="image/*" capture="environment"></label>' +
    '<div class="paint-palette"><button type="button" data-ink="#ff4d86"></button><button type="button" data-ink="#ffe14f"></button><button type="button" data-ink="#62e6d6"></button></div>' +
    '<button class="ai-spark-button" type="button">✦ 创意点亮</button></div>' +
    '<div class="photo-stage"><img src="./assets/maps/map-graffiti.jpg" alt="待涂鸦的校园照片"><div class="ai-photo-sticker" aria-hidden="true">HAHA!</div><canvas aria-label="照片涂鸦画布"></canvas></div>';
  state.game.data.ink = state.game.data.ink || "#ff4d86";
  const image = els.playWorkspace.querySelector(".photo-stage img");
  const photoGame = state.game;
  const canvas = els.playWorkspace.querySelector("canvas");
  setupDrawingCanvas(canvas, true);
  els.playWorkspace.querySelectorAll("[data-ink]").forEach((button) => {
    button.style.background = button.dataset.ink;
    button.classList.toggle("is-selected", button.dataset.ink === state.game.data.ink);
    button.addEventListener("click", () => {
      state.game.data.ink = button.dataset.ink;
      els.playWorkspace.querySelectorAll("[data-ink]").forEach((item) => item.classList.toggle("is-selected", item === button));
    });
  });
  els.playWorkspace.querySelector("input").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);if(state.game!==photoGame)return;state.game.data.photo=true;els.playPrimary.disabled=false;setPlayProgress(55,"照片已进入画布");
    };
    image.onerror=()=>{URL.revokeObjectURL(url);if(state.game===photoGame)showToast("这张照片未能读取，请换一张图片。");};
    image.src = url;
    els.playPrimary.disabled = true;
  });
  els.playWorkspace.querySelector(".ai-spark-button").addEventListener("click", () => {
    state.game.data.ai = true;
    els.playWorkspace.querySelector(".photo-stage").classList.add("is-ai");
    els.playPrimary.disabled = false;
    setPlayProgress(82, "本地点亮效果已生成");
  });
  setPlayProgress(30, "照片画布已准备");
  setPlayFooter({
    hint: "照片仅在浏览器本地预览，不会上传。",
    primaryText: "保存共创照片",
    primaryDisabled: true,
    secondaryText: "清空重来",
    onSecondary: resetGameplay,
    onPrimary: () => {
      if(!image.complete||!image.naturalWidth){showToast("图片仍在载入，请稍后保存。");return;}
      const output = document.createElement("canvas");
      output.width = 720;
      output.height = 340;
      const context = output.getContext("2d");
      context.drawImage(image, 0, 0, output.width, output.height);
      context.drawImage(canvas, 0, 0, output.width, output.height);
      if (state.game.data.ai) {
        context.fillStyle = "#ffe14f";
        context.strokeStyle = "#464254";
        context.lineWidth = 8;
        context.font = "900 58px Microsoft YaHei, sans-serif";
        context.strokeText("HAHA!", 34, 78);
        context.fillText("HAHA!", 34, 78);
      }
      rememberArtwork(output);
      downloadCanvas(output, "hahaisland-photo-graffiti.png");
      finishGameplay("照片、涂鸦与本地点亮效果已经合成为一张共创作品，并已收藏。")
    }
  });
}

function renderGameplay() {
  if (!state.game) return;
  const extension = activityExtensions.get(state.game.key);
  if (extension) {
    const game = state.game;
    extension.render({key:game.key,data:game.data,workspace:els.playWorkspace,
      guide:text=>{els.playGuideText.textContent=text;},progress:setPlayProgress,footer:setPlayFooter,
      complete:message=>{if(state.game===game)finishGameplay(message);}});
    return;
  }
  const renderers = {
    "odyssey:route": renderRouteChoice,
    "odyssey:nearby": renderNearbyRadar,
    "odyssey:log": renderVoyageLog,
    "art:moon": renderSculptureHunt,
    "art:gallery": renderPocketGallery,
    "art:pier": renderPierSketch,
    "healing:pool": renderMoodMap,
    "healing:gate": renderBreathingWalk,
    "healing:pier": renderHealingCommunity,
    "graffiti:studio": renderStickerGenerator,
    "graffiti:square": renderCampusPuzzle,
    "graffiti:pier": renderPhotoGraffiti
  };
  const spot = currentSpot();
  const render = renderers[state.game.key] || (spot && spot.id === "nearby" ? renderNearbyRadar : null);
  if (render) render();
  else {
    els.playWorkspace.innerHTML='<p class="activity-empty">活动内容未能载入，请关闭后重试。</p>';
    setPlayFooter({primaryText:"返回",hideSecondary:true,onPrimary:closeGameplay});
  }
}

function resetView(animate = true) {
  state.scale = 1;
  state.x = 0;
  state.y = 0;
  applyTransform(animate);
}

function updateScale(nextScale, center) {
  const previous = state.scale;
  state.scale = Math.min(1.55, Math.max(.72, nextScale));
  if (center && previous !== state.scale) {
    const rect = els.sceneFrame.getBoundingClientRect();
    const cx = center.x - rect.left - rect.width / 2;
    const cy = center.y - rect.top - rect.height / 2;
    const factor = state.scale / previous;
    state.x = cx - (cx - state.x) * factor;
    state.y = cy - (cy - state.y) * factor;
  }
  applyTransform();
}

function resetMapView(animate = true) {
  state.mapScale = 1;
  state.proximityAutoZoom = false;
  state.preProximityScale = 1;
  centerMapOnLocation(animate);
  updatePoiProximity();
}

function updateMapScale(nextScale) {
  state.proximityAutoZoom = false;
  state.mapScale = Math.min(MAX_MAP_SCALE, Math.max(.72, nextScale));
  centerMapOnLocation(true);
}

function nextSpot() {
  const island = currentIsland();
  const available = islandActivities(island).filter((spot) => activityStatus(island,spot) !== "locked");
  const index = available.findIndex((spot) => spot.id === state.selectedSpotId);
  openSpot(available[(index + 1) % available.length].id);
}

document.querySelector("#panelClose").addEventListener("click", closePanel);
document.querySelector("#nextSpot").addEventListener("click", nextSpot);
document.querySelector("#enterMap").addEventListener("click", () => showIslandMap());
document.querySelector("#mapBack").addEventListener("click", closeMap);
document.querySelector("#zoomIn").addEventListener("click", () => {
  state.view === "map" ? updateMapScale(state.mapScale + .14) : updateScale(state.scale + .12);
});
document.querySelector("#zoomOut").addEventListener("click", () => {
  state.view === "map" ? updateMapScale(state.mapScale - .14) : updateScale(state.scale - .12);
});
document.querySelector("#resetView").addEventListener("click", () => {
  state.view === "map" ? resetMapView() : resetView();
});
document.querySelector("#locateButton").addEventListener("click", () => {
  if (state.view === "map") {
    focusMapOnLocation();
    showToast("已回到当前位置，地图继续跟随移动");
  } else {
    resetView();
    showToast("已回到群岛全景");
  }
});

els.locationDebugToggle.addEventListener("click", () => toggleLocationDebug());
els.poiExplorerToggle.addEventListener("click", () => togglePoiExplorer());
els.mockLocationPreset.addEventListener("change", () => {
  if (!els.mockLocationPreset.value) return;
  const [lat, lng] = els.mockLocationPreset.value.split(",").map(Number);
  setVirtualLocation(lat, lng, els.mockLocationPreset.selectedOptions[0].textContent);
});
els.applyMockLocation.addEventListener("click", () => {
  const lat = Number(els.mockLatitude.value);
  const lng = Number(els.mockLongitude.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    showToast("请输入有效的经纬度");
    return;
  }
  setVirtualLocation(lat, lng);
});
els.randomLocation.addEventListener("click", () => {
  const bounds = geoBounds();
  const margin = .12;
  const lat = bounds.south + (bounds.north - bounds.south) * (margin + Math.random() * (1 - margin * 2));
  const lng = bounds.west + (bounds.east - bounds.west) * (margin + Math.random() * (1 - margin * 2));
  setVirtualLocation(lat, lng, "随机漫游点");
});
els.pickLocation.addEventListener("click", () => toggleLocationPicking());
els.referenceMapToggle.addEventListener("click", () => {
  setReferenceExpanded(!state.referenceExpanded);
});
els.referenceCollapse.addEventListener("click", () => setReferenceExpanded(false));
els.nearbyTaskAction.addEventListener("click", () => {
  const point = state.nearbyPoint;
  if (!point) return;
  selectPoi(point.id);
  if (pointIsInRange(point)) openPoiTask(point);
});

els.joystickBase.addEventListener("pointerdown", (event) => {
  state.joystick.active = true;
  state.joystick.pointerId = event.pointerId;
  state.joystick.lastTime = performance.now();
  els.joystickBase.setPointerCapture(event.pointerId);
  updateJoystickVector(event.clientX, event.clientY);
});
els.joystickBase.addEventListener("pointermove", (event) => {
  if (!state.joystick.active || state.joystick.pointerId !== event.pointerId) return;
  updateJoystickVector(event.clientX, event.clientY);
});
els.joystickBase.addEventListener("pointerup", stopJoystick);
els.joystickBase.addEventListener("pointercancel", stopJoystick);

window.addEventListener("keydown", (event) => {
  if (state.game || state.navigationOpen || state.myIslandOpen || state.view !== "map" || event.target.matches("input, textarea, select")) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) return;
  event.preventDefault();
  state.movementKeys.add(key);
});
window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.movementKeys.delete(key);
});

window.addEventListener("resize", () => {
  if (state.data && state.view === "map") {
    centerMapOnLocation();
    renderReferenceMap(true);
  }
});

els.startActivity.addEventListener("click", openGameplay);
els.playClose.addEventListener("click", closeGameplay);
els.playScrim.addEventListener("click", closeGameplay);

els.sceneFrame.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".world-node")) return;
  state.drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: state.x, y: state.y };
  els.sceneFrame.setPointerCapture(event.pointerId);
  els.sceneFrame.classList.add("is-dragging");
  els.dragTip.classList.add("is-hidden");
});

els.sceneFrame.addEventListener("pointermove", (event) => {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  state.x = state.drag.x + event.clientX - state.drag.startX;
  state.y = state.drag.y + event.clientY - state.drag.startY;
  applyTransform();
});

function endDrag(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  state.drag = null;
  els.sceneFrame.classList.remove("is-dragging");
}
els.sceneFrame.addEventListener("pointerup", endDrag);
els.sceneFrame.addEventListener("pointercancel", endDrag);

els.sceneFrame.addEventListener("wheel", (event) => {
  event.preventDefault();
  els.dragTip.classList.add("is-hidden");
  updateScale(state.scale + (event.deltaY > 0 ? -.08 : .08), { x: event.clientX, y: event.clientY });
}, { passive: false });

els.mapStage.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".map-pin, .poi-marker")) return;
  if (state.locationPicking) {
    state.mapPickStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    return;
  }
  state.mapDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: state.mapX, y: state.mapY };
  els.mapStage.setPointerCapture(event.pointerId);
  els.mapStage.classList.add("is-dragging");
});

els.mapStage.addEventListener("pointermove", (event) => {
  if (!state.mapDrag || state.mapDrag.pointerId !== event.pointerId) return;
  state.mapX = state.mapDrag.x + event.clientX - state.mapDrag.startX;
  state.mapY = state.mapDrag.y + event.clientY - state.mapDrag.startY;
  applyMapTransform();
});

function endMapDrag(event) {
  if (state.locationPicking && state.mapPickStart?.pointerId === event.pointerId) {
    const distance = Math.hypot(event.clientX - state.mapPickStart.x, event.clientY - state.mapPickStart.y);
    state.mapPickStart = null;
    if (distance <= 10) {
      const rect = els.mapCanvas.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        const geo = percentToGeo((event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100);
        setVirtualLocation(geo.lat, geo.lng, "地图点选位置");
        toggleLocationPicking(false);
      }
    }
    return;
  }
  if (!state.mapDrag || state.mapDrag.pointerId !== event.pointerId) return;
  state.mapDrag = null;
  els.mapStage.classList.remove("is-dragging");
}
els.mapStage.addEventListener("pointerup", endMapDrag);
els.mapStage.addEventListener("pointercancel", endMapDrag);
els.mapStage.addEventListener("wheel", (event) => {
  event.preventDefault();
  updateMapScale(state.mapScale + (event.deltaY > 0 ? -.1 : .1));
}, { passive: false });

document.addEventListener("keydown", (event) => {
  if (state.navigationOpen) return;
  if (event.key !== "Escape") return;
  if (els.playLayer.classList.contains("is-open")) { event.preventDefault(); closeGameplay(); }
  else if (state.myIslandOpen) return;
  else if (els.activityPanel.classList.contains("is-open")) closePanel();
  else if (els.locationDebugPanel.classList.contains("is-open")) toggleLocationDebug(false);
  else if (els.poiExplorer.classList.contains("is-open")) togglePoiExplorer(false);
  else if (state.view === "map") closeMap();
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view === "home") {
      if (document.documentElement.classList.contains("redesign-ready")) {
        closeGameplay();
        closePanel();
        document.dispatchEvent(new CustomEvent("hahaisland:open-my-island"));
      } else closeMap();
      return;
    }
    if (button.dataset.view === "map") {
      showIslandMap();
      return;
    }
    if (button.dataset.view === "route") {
      openPersonalizedRoute();
      return;
    }
    if (button.dataset.tip === "任务") openTaskDashboard();
    else if (button.dataset.tip === "图层") openLayerControls();
  });
});

document.querySelector(".profile-button").addEventListener("click", openProfile);

async function init() {
  try {
    const [response, pointResponse, communityResponse] = await Promise.all([
      fetch("./maps/islands.json?v=10", { cache: "no-store" }),
      fetch("./maps/tsinghua-points.json?v=1", { cache: "no-store" }),
      fetch("./maps/odyssey-community.json?v=1", { cache: "no-store" })
    ]);
    if (!response.ok) throw new Error(`Map data failed: ${response.status}`);
    if (!pointResponse.ok) throw new Error(`Point data failed: ${pointResponse.status}`);
    state.data = await response.json();
    state.poiData = await pointResponse.json();
    state.poiCommunityData = communityResponse.ok ? await communityResponse.json() : null;
    loadSavedState();
    hydrateCompletedSpots();
    state.islandId = state.data.defaultIsland || state.data.islands[0].id;
    state.location = { ...currentGeoReference().defaultLocation, source: "simulated" };
    state.locationByIsland[state.islandId] = { ...state.location };
    const island = currentIsland();
    document.documentElement.style.setProperty("--theme", island.color);
    document.documentElement.style.setProperty("--theme-soft", island.softColor);
    buildWorldNodes();
    buildThemeDock();
    refreshExplorationProgress();
    applyTransform();
    state.joystick.frame = window.requestAnimationFrame(movementLoop);
    document.dispatchEvent(new CustomEvent("hahaisland:ready"));
  } catch (error) {
    console.error(error);
    showToast("群岛数据暂时未载入，请刷新重试");
  }
}

// UI adapters consume a snapshot; task state and coordinates remain owned here.
window.HahaIsland = Object.freeze({
  snapshot() {
    if (!state.data) return null;
    const islands = state.data.islands.map(island => ({
      id: island.id, name: island.name, subtitle: island.subtitle, image: island.image,
      npcName: island.npcName, npc: island.npc,
      total: pointDatasetForIsland(island)?.points.length || 0,
      completed: completedPointCount(island),
      activities:activitySnapshots(island),activityTotal:islandActivities(island).length,
      activityCompleted:completedActivityCount(island)
    }));
    const points = currentPointDataset()?.points || [];
    const nearest = points.reduce((best, point) => {
      const distance = distanceToPoint(point);
      return !best || distance < best.distance ? { id: point.id, distance } : best;
    }, null);
    return { islandId: state.islandId, view: state.view, islands, nearest,
      location: state.location ? { ...state.location } : null,
      total: islands.reduce((sum, island) => sum + island.total, 0),
      completed: islands.reduce((sum, island) => sum + island.completed, 0),
      activityTotal:islands.reduce((sum,island)=>sum+island.activityTotal,0),
      activityCompleted:islands.reduce((sum,island)=>sum+island.activityCompleted,0) };
  },
  enterIsland: showIslandMap,
  visitIsland(islandId) {
    const island = state.data.islands.find(item=>item.id===islandId);
    if (!island) return;
    if (pointDatasetForIsland(island)) showIslandMap(islandId);
    else openIslandActivities(islandId);
  },
  activities:openIslandActivities,
  playActivity:playIslandActivity,
  activityRecord:openActivityRecord,
  registerActivity(key,render,ready) {activityExtensions.set(key,{render,ready});},
  profile: openProfile,
  tasks: openTaskDashboard,
  layers: openLayerControls,
  navigation: openPersonalizedRoute,
  virtualLocation: () => toggleLocationDebug(),
  explore() {
    if (state.view !== "map") showIslandMap();
    const nearest = this.snapshot()?.nearest;
    if (nearest) selectPoi(nearest.id);
    else openIslandActivities();
  }
});

init();
