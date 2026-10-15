import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Tuning constants
const DOT_COLOR = 0xffffff;
const DOT_COLOR_ALT = 0xf59e0b; // Amber / Gold futuristic glow
const DOT_ALT_COLOR_CHANCE = 0.45;
const DOT_SIZE = 1.2;
const DOT_OPACITY = 1.0;
const DOT_TARGET_COUNT = 11000;
const DOT_TARGET_COUNT_MOBILE = 4500;
const FLICKER_SPEED = 0.04;

const LINE_OPACITY = 0.22;
const LINE_TARGET_COUNT = 2400;
const LINE_TARGET_COUNT_MOBILE = 950;

const HOVER_RADIUS = 0.085;
const HOVER_HEIGHT = 0.022;
const HOVER_LERP = 0.16;
const HOVER_BRIGHTNESS_BOOST = 2.8;
const RAYCAST_THRESHOLD = 0.02;

const ASSEMBLE_DELAY_MS = 200;
const ASSEMBLE_DURATION_MS = 2200;
const STAGGER_SPAN = 0.36;
const SPHERE_SCATTER_MIN_RADIUS = 2.0;
const SPHERE_SCATTER_MAX_RADIUS = 4.8;
const SPHERE_SCATTER_MIN_RADIUS_MOBILE = 1.0;
const SPHERE_SCATTER_MAX_RADIUS_MOBILE = 2.2;
const START_VISIBLE_FRACTION = 0.28;
const START_VISIBLE_FRACTION_MOBILE = 1;
const APPEAR_FADE = 0.16;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function falloffAt(bx, by, bz, hx, hy, hz, radiusSq, hoverStrength) {
  const dx = bx - hx;
  const dy = by - hy;
  const dz = bz - hz;
  const distSq = dx * dx + dy * dy + dz * dz;
  if (distSq >= radiusSq) return 0;
  const dist = Math.sqrt(distSq);
  const t = 1 - dist / HOVER_RADIUS;
  return t * t * (3 - 2 * t) * hoverStrength;
}

function localAssembleEase(globalProgress, aRand) {
  const t = Math.min(Math.max((globalProgress - aRand * STAGGER_SPAN) / (1 - STAGGER_SPAN), 0), 1);
  return easeOutCubic(t);
}

function appearAmount(globalProgress, aRand, visibleFraction) {
  if (visibleFraction >= 1) return 1;
  const startAt = aRand * (1 - APPEAR_FADE + visibleFraction) - visibleFraction;
  const t = (globalProgress - startAt) / APPEAR_FADE;
  return Math.min(Math.max(t, 0), 1);
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');

export function initRobotViewer(container) {
  const modelUrl = container.dataset.model || 'assets/models/robot_web.glb';
  const isMobileWidth = window.innerWidth <= 900;
  const hideDots = container.dataset.hideDots === 'true';
  const hideLines = container.dataset.hideLines === 'true';
  const enableScrollRotate = container.dataset.scrollRotate !== 'false';
  const autoRotateSpeed = parseFloat(container.dataset.autoRotateSpeed || '0.7');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.01,
    100
  );
  camera.position.set(-1.28, 0.1, 1.28);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = isMobileWidth ? 0.35 : autoRotateSpeed;
  controls.touches.ONE = null;
  controls.touches.TWO = THREE.TOUCH.ROTATE;
  renderer.domElement.style.touchAction = 'pan-y';

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = RAYCAST_THRESHOLD;
  const pointerNDC = new THREE.Vector2();
  let pointerActive = false;

  const scatterMinRadius = isMobileWidth ? SPHERE_SCATTER_MIN_RADIUS_MOBILE : SPHERE_SCATTER_MIN_RADIUS;
  const scatterMaxRadius = isMobileWidth ? SPHERE_SCATTER_MAX_RADIUS_MOBILE : SPHERE_SCATTER_MAX_RADIUS;
  const startVisibleFraction = isMobileWidth ? START_VISIBLE_FRACTION_MOBILE : START_VISIBLE_FRACTION;

  function randomSphereScatterLocal() {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = scatterMinRadius + Math.random() * (scatterMaxRadius - scatterMinRadius);
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.sin(phi) * Math.sin(theta) * r,
      Math.cos(phi) * r
    );
  }

  let liveGroup = null;
  let liveSpinGroup = null;
  let pointsMesh = null;
  let basePositions = null;
  let normals = null;
  let flickerSeeds = null;
  let flickerMaxBrightness = null;
  let dotBaseColors = null;

  let lineMesh = null;
  let lineBasePositions = null;
  let lineNormals = null;

  let dotScatterPositions = null;
  let lineScatterPositions = null;
  let dotAssembleDelays = null;
  let lineAssembleDelays = null;
  let assembling = false;
  let assembleStartTime = 0;

  const hoverTargetLocal = new THREE.Vector3();
  const hoverCurrentLocal = new THREE.Vector3();
  let hoverActive = false;
  let hoverStrength = 0;

  function onPointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerActive = true;
  }
  function onPointerLeave() {
    pointerActive = false;
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  loader.load(
    modelUrl,
    (gltf) => {
      let sourceGeometry = null;
      gltf.scene.traverse((child) => {
        if (child.isMesh && !sourceGeometry) {
          sourceGeometry = child.geometry.clone();
          sourceGeometry.applyMatrix4(child.matrixWorld);
        }
      });
      if (!sourceGeometry) return;
      sourceGeometry.computeVertexNormals();

      const srcPos = sourceGeometry.attributes.position;
      const srcNorm = sourceGeometry.attributes.normal;
      const totalVerts = srcPos.count;

      const normalByPos = new Map();
      const quantize = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      for (let i = 0; i < totalVerts; i++) {
        const key = quantize(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i));
        if (!normalByPos.has(key)) {
          normalByPos.set(key, [srcNorm.getX(i), srcNorm.getY(i), srcNorm.getZ(i)]);
        }
      }

      const group = new THREE.Group();
      group.rotation.x = Math.PI / 2; // CAD Z-up -> Three.js Y-up

      // Edges
      const EDGE_ANGLE_THRESHOLD = 14;
      const rawEdges = new THREE.EdgesGeometry(sourceGeometry, EDGE_ANGLE_THRESHOLD);
      const rawPos = rawEdges.attributes.position;

      const edgeList = [];
      const ev1 = new THREE.Vector3();
      const ev2 = new THREE.Vector3();
      for (let i = 0; i < rawPos.count; i += 2) {
        ev1.fromBufferAttribute(rawPos, i);
        ev2.fromBufferAttribute(rawPos, i + 1);
        const n1 = normalByPos.get(quantize(ev1.x, ev1.y, ev1.z)) || [0, 0, 0];
        const n2 = normalByPos.get(quantize(ev2.x, ev2.y, ev2.z)) || [0, 0, 0];
        edgeList.push({
          pos: [ev1.x, ev1.y, ev1.z, ev2.x, ev2.y, ev2.z],
          norm: [n1[0], n1[1], n1[2], n2[0], n2[1], n2[2]],
        });
      }

      const lineTarget = isMobileWidth ? LINE_TARGET_COUNT_MOBILE : LINE_TARGET_COUNT;
      for (let i = edgeList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = edgeList[i];
        edgeList[i] = edgeList[j];
        edgeList[j] = tmp;
      }
      const keepEdgeCount = Math.min(edgeList.length, lineTarget);
      lineBasePositions = new Float32Array(keepEdgeCount * 6);
      lineNormals = new Float32Array(keepEdgeCount * 6);
      const lineDisplayPositions = new Float32Array(keepEdgeCount * 6);
      const lineColors = new Float32Array(keepEdgeCount * 8);
      for (let e = 0; e < keepEdgeCount; e++) {
        lineBasePositions.set(edgeList[e].pos, e * 6);
        lineNormals.set(edgeList[e].norm, e * 6);
        lineColors.fill(1, e * 8, e * 8 + 8);
      }
      lineDisplayPositions.set(lineBasePositions);

      const wireGeometry = new THREE.BufferGeometry();
      wireGeometry.setAttribute('position', new THREE.BufferAttribute(lineDisplayPositions, 3));
      wireGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 4));
      const wireMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: LINE_OPACITY,
      });
      lineMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
      lineMesh.visible = !hideLines;
      group.add(lineMesh);

      // Point cloud
      const dotTarget = isMobileWidth ? DOT_TARGET_COUNT_MOBILE : DOT_TARGET_COUNT;
      const keepCount = Math.min(totalVerts, dotTarget);
      const indices = new Array(totalVerts);
      for (let i = 0; i < totalVerts; i++) indices[i] = i;
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }

      basePositions = new Float32Array(keepCount * 3);
      normals = new Float32Array(keepCount * 3);
      const displayPositions = new Float32Array(keepCount * 3);

      for (let k = 0; k < keepCount; k++) {
        const srcIdx = indices[k];
        basePositions[k * 3] = srcPos.getX(srcIdx);
        basePositions[k * 3 + 1] = srcPos.getY(srcIdx);
        basePositions[k * 3 + 2] = srcPos.getZ(srcIdx);
        normals[k * 3] = srcNorm.getX(srcIdx);
        normals[k * 3 + 1] = srcNorm.getY(srcIdx);
        normals[k * 3 + 2] = srcNorm.getZ(srcIdx);
      }
      displayPositions.set(basePositions);

      const whiteColor = new THREE.Color(DOT_COLOR);
      const amberColor = new THREE.Color(DOT_COLOR_ALT);
      const dotColors = new Float32Array(keepCount * 4);
      dotBaseColors = new Float32Array(keepCount * 3);
      for (let k = 0; k < keepCount; k++) {
        const c = Math.random() < DOT_ALT_COLOR_CHANCE ? amberColor : whiteColor;
        dotBaseColors[k * 3] = c.r;
        dotBaseColors[k * 3 + 1] = c.g;
        dotBaseColors[k * 3 + 2] = c.b;
        dotColors[k * 4] = c.r;
        dotColors[k * 4 + 1] = c.g;
        dotColors[k * 4 + 2] = c.b;
        dotColors[k * 4 + 3] = 1;
      }

      flickerSeeds = new Float32Array(keepCount);
      for (let k = 0; k < keepCount; k++) flickerSeeds[k] = Math.random() * 1000;

      flickerMaxBrightness = new Float32Array(keepCount);
      for (let k = 0; k < keepCount; k++) flickerMaxBrightness[k] = Math.random() < 0.4 ? 0.5 : 1;

      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute('position', new THREE.BufferAttribute(displayPositions, 3));
      dotGeometry.setAttribute('color', new THREE.BufferAttribute(dotColors, 4));

      const dotMaterial = new THREE.PointsMaterial({
        size: DOT_SIZE,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: DOT_OPACITY,
        depthWrite: false,
      });

      pointsMesh = new THREE.Points(dotGeometry, dotMaterial);
      pointsMesh.visible = !hideDots;
      group.add(pointsMesh);

      // Fit & center
      group.updateMatrixWorld(true);
      const sizeBox = new THREE.Box3().setFromObject(group);
      const size = sizeBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const FIT_MARGIN = isMobileWidth ? 0.75 : 0.82;
      group.scale.setScalar(FIT_MARGIN / maxDim);
      group.updateMatrixWorld(true);

      const centerBox = new THREE.Box3().setFromObject(group);
      const center = centerBox.getCenter(new THREE.Vector3());
      group.position.sub(center);
      group.updateMatrixWorld(true);

      // Scatter intro
      dotScatterPositions = new Float32Array(keepCount * 3);
      dotAssembleDelays = new Float32Array(keepCount);
      const lineVertexCount = lineBasePositions.length / 3;
      const edgeCount = lineVertexCount / 2;
      lineScatterPositions = new Float32Array(lineBasePositions.length);
      lineAssembleDelays = new Float32Array(edgeCount);

      for (let k = 0; k < keepCount; k++) {
        const p = randomSphereScatterLocal();
        dotScatterPositions[k * 3] = p.x;
        dotScatterPositions[k * 3 + 1] = p.y;
        dotScatterPositions[k * 3 + 2] = p.z;
        dotAssembleDelays[k] = Math.random();
      }
      for (let e = 0; e < edgeCount; e++) {
        lineAssembleDelays[e] = Math.random();
      }
      for (let i = 0; i < lineBasePositions.length; i += 3) {
        const p = randomSphereScatterLocal();
        lineScatterPositions[i] = p.x;
        lineScatterPositions[i + 1] = p.y;
        lineScatterPositions[i + 2] = p.z;
      }
      displayPositions.set(dotScatterPositions);
      dotGeometry.attributes.position.needsUpdate = true;
      lineDisplayPositions.set(lineScatterPositions);
      wireGeometry.attributes.position.needsUpdate = true;

      const spinGroup = new THREE.Group();
      spinGroup.add(group);
      scene.add(spinGroup);
      liveGroup = group;
      liveSpinGroup = spinGroup;

      assembling = true;
      assembleStartTime = performance.now();

      // Trigger dispatch event that model loaded
      window.dispatchEvent(new CustomEvent('cad-loaded'));
    },
    undefined,
    (error) => {
      console.error('Failed to load model', modelUrl, error);
    }
  );

  function updateHover() {
    if (!pointsMesh || !liveGroup) return;

    const wasAssembling = assembling;
    let globalProgress = 1;
    if (assembling) {
      const assembleElapsed = performance.now() - assembleStartTime;
      const rawT = Math.min(Math.max((assembleElapsed - ASSEMBLE_DELAY_MS) / ASSEMBLE_DURATION_MS, 0), 1);
      globalProgress = easeInOutQuad(rawT);
      if (rawT >= 1) assembling = false;
    }

    let intersected = false;
    if (pointerActive) {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(pointsMesh, false);
      if (hits.length > 0) {
        liveGroup.worldToLocal(hoverTargetLocal.copy(hits[0].point));
        intersected = true;
      }
    }
    hoverActive = intersected;

    const targetStrength = hoverActive ? 1 : 0;
    hoverStrength += (targetStrength - hoverStrength) * HOVER_LERP;
    if (hoverActive) {
      hoverCurrentLocal.lerp(hoverTargetLocal, HOVER_LERP);
    }

    const posAttr = pointsMesh.geometry.attributes.position;
    const colorAttr = pointsMesh.geometry.attributes.color;
    const arr = posAttr.array;
    const carr = colorAttr.array;
    const count = posAttr.count;
    const radiusSq = HOVER_RADIUS * HOVER_RADIUS;
    const hx = hoverCurrentLocal.x;
    const hy = hoverCurrentLocal.y;
    const hz = hoverCurrentLocal.z;
    const active = hoverStrength > 0.001;
    const t = performance.now() * 0.001 * FLICKER_SPEED;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let bx = basePositions[idx];
      let by = basePositions[idx + 1];
      let bz = basePositions[idx + 2];

      let appear = 1;
      if (wasAssembling) {
        const aRand = dotAssembleDelays[i];
        const pointEase = localAssembleEase(globalProgress, aRand);
        bx = dotScatterPositions[idx] + (bx - dotScatterPositions[idx]) * pointEase;
        by = dotScatterPositions[idx + 1] + (by - dotScatterPositions[idx + 1]) * pointEase;
        bz = dotScatterPositions[idx + 2] + (bz - dotScatterPositions[idx + 2]) * pointEase;
        appear = appearAmount(globalProgress, aRand, startVisibleFraction);
      }

      const falloff = active ? falloffAt(bx, by, bz, hx, hy, hz, radiusSq, hoverStrength) : 0;

      arr[idx] = bx + normals[idx] * HOVER_HEIGHT * falloff;
      arr[idx + 1] = by + normals[idx + 1] * HOVER_HEIGHT * falloff;
      arr[idx + 2] = bz + normals[idx + 2] * HOVER_HEIGHT * falloff;

      const n = Math.sin(flickerSeeds[i] + t) * 43758.5453;
      const flicker = n - Math.floor(n);

      const boost = 1 + falloff * HOVER_BRIGHTNESS_BOOST;
      const cIdx = i * 4;
      carr[cIdx] = dotBaseColors[idx] * boost;
      carr[cIdx + 1] = dotBaseColors[idx + 1] * boost;
      carr[cIdx + 2] = dotBaseColors[idx + 2] * boost;
      carr[cIdx + 3] = Math.min(flicker * flickerMaxBrightness[i] * appear * boost, 1);
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    if (lineMesh) {
      const linePosAttr = lineMesh.geometry.attributes.position;
      const lineColorAttr = lineMesh.geometry.attributes.color;
      const larr = linePosAttr.array;
      const lcarr = lineColorAttr.array;
      const lineCount = linePosAttr.count;

      for (let i = 0; i < lineCount; i++) {
        const idx = i * 3;
        let bx = lineBasePositions[idx];
        let by = lineBasePositions[idx + 1];
        let bz = lineBasePositions[idx + 2];

        let appear = 1;
        if (wasAssembling) {
          const aRand = lineAssembleDelays[Math.floor(i / 2)];
          const edgeEase = localAssembleEase(globalProgress, aRand);
          bx = lineScatterPositions[idx] + (bx - lineScatterPositions[idx]) * edgeEase;
          by = lineScatterPositions[idx + 1] + (by - lineScatterPositions[idx + 1]) * edgeEase;
          bz = lineScatterPositions[idx + 2] + (bz - lineScatterPositions[idx + 2]) * edgeEase;
          appear = appearAmount(globalProgress, aRand, startVisibleFraction);
        }

        const falloff = active ? falloffAt(bx, by, bz, hx, hy, hz, radiusSq, hoverStrength) : 0;

        larr[idx] = bx + lineNormals[idx] * HOVER_HEIGHT * falloff;
        larr[idx + 1] = by + lineNormals[idx + 1] * HOVER_HEIGHT * falloff;
        larr[idx + 2] = bz + lineNormals[idx + 2] * HOVER_HEIGHT * falloff;

        const boost = 1 + falloff * HOVER_BRIGHTNESS_BOOST;
        const cIdx = i * 4;
        lcarr[cIdx] = boost;
        lcarr[cIdx + 1] = boost;
        lcarr[cIdx + 2] = boost;
        lcarr[cIdx + 3] = Math.min(appear * boost, 1);
      }
      linePosAttr.needsUpdate = true;
      lineColorAttr.needsUpdate = true;
    }
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  let targetScrollRotationY = 0;
  let currentScrollRotationY = 0;
  if (enableScrollRotate) {
    const SCROLL_FACTOR = 0.0028;
    function onPageScroll() {
      targetScrollRotationY = window.scrollY * SCROLL_FACTOR;
    }
    window.addEventListener('scroll', onPageScroll, { passive: true });
    onPageScroll();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (liveSpinGroup && enableScrollRotate) {
      currentScrollRotationY += (targetScrollRotationY - currentScrollRotationY) * 0.08;
      liveSpinGroup.rotation.y = currentScrollRotationY;
    }

    updateHover();
    renderer.render(scene, camera);
  }
  animate();
}

// Auto-init all .robot-viewer elements
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.robot-viewer').forEach((el) => {
    initRobotViewer(el);
  });
});
