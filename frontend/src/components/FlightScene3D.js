import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';

const DISTANCE_SCALE = 0.12;
const ALTITUDE_SCALE = 0.25;
const ARRIVAL_RUNWAY_Z = -370;
const ARRIVAL_RUNWAY_MIN_Z = -455;
const ARRIVAL_RUNWAY_MAX_Z = -292;
const OCEAN_TILE_WIDTH = 620;
const OCEAN_TILE_DEPTH = 320;
const OCEAN_TILE_COUNT = 6;

export default {
  name: 'FlightScene3D',
  props: {
    flight: {
      type: Object,
      required: true
    },
    controls: {
      type: Object,
      required: true
    },
    viewMode: {
      type: String,
      default: 'external'
    },
    sceneInfo: {
      type: Object,
      default: () => ({ name: '机场跑道' })
    }
  },
  emits: ['toggle-view'],
  setup(props) {
    const host = ref(null);
    let renderer;
    let scene;
    let externalCamera;
    let cockpitCamera;
    let plane;
    let propeller;
    let flapLeft;
    let flapRight;
    let gearGroup;
    let vectorGroup;
    let liftArrow;
    let weightArrow;
    let thrustArrow;
    let dragArrow;
    let airflowGroup;
    let airflowLines = [];
    let engineFailureMarker;
    let oceanLines = [];
    let oceanTiles = [];
    let frameId = 0;
    let lastTime = 0;
    let width = 1;
    let height = 1;
    let lastProbeAt = 0;
    const externalCameraPosition = new THREE.Vector3();
    const cockpitLookAt = new THREE.Vector3();
    const reusableTarget = new THREE.Vector3();

    onMounted(() => {
      initThree();
      frameId = requestAnimationFrame(render);
    });

    onBeforeUnmount(() => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      if (window.__aerolab3dProbe) {
        delete window.__aerolab3dProbe;
      }
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    });

    function initThree() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xa9d8ee);
      scene.fog = new THREE.Fog(0xa9d8ee, 90, 760);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setScissorTest(true);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.value.appendChild(renderer.domElement);

      externalCamera = new THREE.PerspectiveCamera(58, 1, 0.1, 1200);
      cockpitCamera = new THREE.PerspectiveCamera(66, 1, 0.08, 900);
      externalCamera.layers.enable(0);
      cockpitCamera.layers.enable(0);
      cockpitCamera.layers.enable(1);
      scene.add(cockpitCamera);

      addLights();
      addWorld();
      plane = createPlane();
      scene.add(plane);
      airflowGroup = createAirflow();
      plane.add(airflowGroup);
      vectorGroup = createForceVectors();
      scene.add(vectorGroup);
      createCockpitOverlay();
      resize();
      window.addEventListener('resize', resize);
    }

    function addLights() {
      const hemi = new THREE.HemisphereLight(0xe9f8ff, 0x4f7a5e, 2.2);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xfff0bf, 2.4);
      sun.position.set(40, 90, 60);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -120;
      sun.shadow.camera.right = 120;
      sun.shadow.camera.top = 120;
      sun.shadow.camera.bottom = -120;
      scene.add(sun);
    }

    function addWorld() {
      addGroundPlane(0x8dc78d, 260, 200, 0, -50);
      addGroundPlane(0x77b177, 300, 180, 0, -170);
      addGroundPlane(0x4e986b, 340, 230, 0, -325);
      addGroundPlane(0x1c83ab, 360, 360, 0, -560);
      addRunway(-76);
      addRunway(ARRIVAL_RUNWAY_Z, true);
      addCity();
      addForest();
      addOcean();
      addClouds();
      addRouteMarkers();
    }

    function addGroundPlane(color, planeWidth, planeDepth, x, z) {
      const geometry = new THREE.PlaneGeometry(planeWidth, planeDepth);
      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, -0.02, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    function addRunway(centerZ = -76, arrival = false) {
      const runwayY = arrival ? 0.12 : 0.03;
      const runway = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 180),
        new THREE.MeshStandardMaterial({ color: 0x485158, roughness: 0.82, metalness: 0.03 })
      );
      runway.rotation.x = -Math.PI / 2;
      runway.position.set(0, runwayY, centerZ);
      runway.receiveShadow = true;
      scene.add(runway);

      const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xf7fbff });
      for (let i = 0; i < 14; i += 1) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 8), stripeMaterial);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, runwayY + 0.03, centerZ + 70 - i * 11);
        scene.add(stripe);
      }

      const sideMaterial = new THREE.MeshBasicMaterial({ color: 0xe9f4f8 });
      [-9.5, 9.5].forEach((x) => {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 174), sideMaterial);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(x, runwayY + 0.035, centerZ);
        scene.add(edge);
      });

      if (arrival) {
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
        for (let i = 0; i < 12; i += 1) {
          const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lightMaterial);
          light.position.set(i % 2 === 0 ? -4.2 : 4.2, 0.18, centerZ + 90 + i * 5);
          scene.add(light);
        }
      }
    }

    function addCity() {
      const group = new THREE.Group();
      const materials = [
        new THREE.MeshStandardMaterial({ color: 0x536a7a, roughness: 0.74 }),
        new THREE.MeshStandardMaterial({ color: 0x6f8792, roughness: 0.72 }),
        new THREE.MeshStandardMaterial({ color: 0x3f5f73, roughness: 0.76 })
      ];
      let index = 0;
      for (let z = -120; z > -260; z -= 18) {
        for (let x = -58; x <= 58; x += 16) {
          if (Math.abs(x) < 13) {
            continue;
          }
          const heightScale = 5 + seeded(index) * 22;
          const widthScale = 6 + seeded(index + 7) * 4;
          const depthScale = 6 + seeded(index + 13) * 6;
          const building = new THREE.Mesh(
            new THREE.BoxGeometry(widthScale, heightScale, depthScale),
            materials[index % materials.length]
          );
          building.position.set(x + seeded(index + 3) * 4, heightScale / 2, z + seeded(index + 9) * 5);
          building.castShadow = true;
          building.receiveShadow = true;
          group.add(building);
          index += 1;
        }
      }
      scene.add(group);
    }

    function addForest() {
      const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8);
      const crownGeometry = new THREE.ConeGeometry(1.5, 4.2, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.9 });
      const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x247552, roughness: 0.86 });
      const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 260);
      const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, 260);
      const matrix = new THREE.Matrix4();
      let index = 0;
      for (let z = -235; z > -430; z -= 12) {
        for (let x = -78; x <= 78; x += 14) {
          const departureCorridor = Math.abs(x) < 10 && z > -295;
          const arrivalCorridor = Math.abs(x) < 28 && z < -285;
          if (departureCorridor || arrivalCorridor) {
            continue;
          }
          const jitterX = seeded(index + 2) * 6 - 3;
          const jitterZ = seeded(index + 5) * 7 - 3.5;
          const scale = 0.82 + seeded(index + 11) * 0.5;
          matrix.compose(
            new THREE.Vector3(x + jitterX, 1.1 * scale, z + jitterZ),
            new THREE.Quaternion(),
            new THREE.Vector3(scale, scale, scale)
          );
          trunks.setMatrixAt(index, matrix);
          matrix.compose(
            new THREE.Vector3(x + jitterX, 3.8 * scale, z + jitterZ),
            new THREE.Quaternion(),
            new THREE.Vector3(scale, scale, scale)
          );
          crowns.setMatrixAt(index, matrix);
          index += 1;
        }
      }
      trunks.count = index;
      crowns.count = index;
      trunks.castShadow = true;
      crowns.castShadow = true;
      scene.add(trunks, crowns);
    }

    function addOcean() {
      const beach = new THREE.Mesh(
        new THREE.PlaneGeometry(250, 26),
        new THREE.MeshLambertMaterial({ color: 0xe4cf8c })
      );
      beach.rotation.x = -Math.PI / 2;
      beach.position.set(0, 0.01, -500);
      beach.receiveShadow = true;
      scene.add(beach);

      const oceanMaterials = [
        new THREE.MeshLambertMaterial({ color: 0x2797c6 }),
        new THREE.MeshLambertMaterial({ color: 0x1c83ab })
      ];
      for (let i = 0; i < OCEAN_TILE_COUNT; i += 1) {
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(OCEAN_TILE_WIDTH, OCEAN_TILE_DEPTH),
          oceanMaterials[i % oceanMaterials.length]
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, -0.03, -560 - i * OCEAN_TILE_DEPTH);
        tile.receiveShadow = true;
        oceanTiles.push(tile);
        scene.add(tile);
      }

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xdffbff, transparent: true, opacity: 0.68 });
      for (let row = 0; row < 24; row += 1) {
        const points = [];
        for (let i = 0; i <= 64; i += 1) {
          const x = -120 + i * 3.75;
          const z = -420 - row * 17;
          const y = 0.18 + Math.sin(i * 0.6 + row) * 0.14;
          points.push(new THREE.Vector3(x, y, z));
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
        oceanLines.push(line);
        scene.add(line);
      }
    }

    function addClouds() {
      const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.74 });
      for (let i = 0; i < 18; i += 1) {
        const cloud = new THREE.Group();
        const x = -88 + seeded(i + 30) * 176;
        const y = 24 + seeded(i + 40) * 34;
        const z = 18 - seeded(i + 50) * 650;
        cloud.position.set(x, y, z);
        for (let j = 0; j < 4; j += 1) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(2.4 + seeded(i * 7 + j) * 2.5, 12, 8), cloudMaterial);
          puff.position.set(j * 2.7, Math.sin(j) * 0.5, seeded(i + j) * 2);
          cloud.add(puff);
        }
        scene.add(cloud);
      }
    }

    function addRouteMarkers() {
      const labels = [
        { z: -90, color: 0xffffff },
        { z: -180, color: 0x8bd4ff },
        { z: -315, color: 0x90e0ad },
        { z: -455, color: 0xffe5a3 }
      ];
      labels.forEach((item) => {
        const marker = new THREE.Mesh(
          new THREE.TorusGeometry(5.5, 0.08, 8, 48),
          new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.42 })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(0, 0.12, item.z);
        scene.add(marker);
      });
    }

    function createPlane() {
      const group = new THREE.Group();
      const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xf5fbff, roughness: 0.34, metalness: 0.12 });
      const blueMaterial = new THREE.MeshStandardMaterial({ color: 0x2d8bb8, roughness: 0.42 });
      const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x43a987, roughness: 0.42 });
      const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5 });
      const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x182b39, roughness: 0.5 });

      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 4.8, 18), fuselageMaterial);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      group.add(fuselage);

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 18), blueMaterial);
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = -2.85;
      nose.castShadow = true;
      group.add(nose);

      const mainWing = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 1.2), blueMaterial);
      mainWing.position.set(0, -0.03, -0.35);
      mainWing.castShadow = true;
      group.add(mainWing);

      flapLeft = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.36), greenMaterial);
      flapLeft.position.set(-1.9, -0.08, 0.42);
      flapLeft.castShadow = true;
      group.add(flapLeft);

      flapRight = flapLeft.clone();
      flapRight.position.x = 1.9;
      group.add(flapRight);

      const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.64), yellowMaterial);
      tailWing.position.set(0, 0.12, 1.85);
      tailWing.castShadow = true;
      group.add(tailWing);

      const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.72), yellowMaterial);
      stabilizer.position.set(0, 0.58, 1.78);
      stabilizer.rotation.x = 0.22;
      stabilizer.castShadow = true;
      group.add(stabilizer);

      propeller = new THREE.Group();
      const propBladeA = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.05), darkMaterial);
      const propBladeB = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.05), darkMaterial);
      propeller.add(propBladeA, propBladeB);
      propeller.position.z = -3.33;
      group.add(propeller);

      engineFailureMarker = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.035, 8, 36),
        new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.82 })
      );
      engineFailureMarker.position.z = -3.34;
      engineFailureMarker.rotation.x = Math.PI / 2;
      engineFailureMarker.visible = false;
      group.add(engineFailureMarker);

      gearGroup = new THREE.Group();
      [-0.75, 0.75].forEach((x) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), darkMaterial);
        strut.position.set(x, -0.58, -0.25);
        strut.castShadow = true;
        gearGroup.add(strut);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), darkMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, -0.96, -0.25);
        wheel.castShadow = true;
        gearGroup.add(wheel);
      });
      group.add(gearGroup);

      group.scale.setScalar(1.35);
      return group;
    }

    function createAirflow() {
      const group = new THREE.Group();
      const wingMaterial = new THREE.LineBasicMaterial({
        color: 0x9ee8ff,
        transparent: true,
        opacity: 0.72
      });
      for (let row = 0; row < 13; row += 1) {
        const y = -1.1 + row * 0.22;
        const x = row % 2 === 0 ? -3.4 : 3.4;
        const side = row % 2 === 0 ? -1 : 1;
        const points = [];
        for (let i = 0; i < 34; i += 1) {
          const z = -7 + i * 0.38;
          const bend = Math.exp(-Math.abs(z + 0.2) * 0.8) * 0.58;
          points.push(new THREE.Vector3(x + side * bend, y + Math.sin(i * 0.55) * 0.04, z));
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wingMaterial);
        line.userData = { baseY: y, side, row };
        airflowLines.push(line);
        group.add(line);
      }

      const centerMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      });
      [-0.8, 0, 0.8].forEach((y, row) => {
        const points = [];
        for (let i = 0; i < 30; i += 1) {
          points.push(new THREE.Vector3(Math.sin(i * 0.4) * 0.18, y, -7 + i * 0.42));
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), centerMaterial);
        line.userData = { baseY: y, side: 0, row: row + 20 };
        airflowLines.push(line);
        group.add(line);
      });

      group.visible = false;
      return group;
    }

    function createForceVectors() {
      const group = new THREE.Group();
      liftArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 4, 0x39a487, 0.7, 0.32);
      weightArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 4, 0x9a677c, 0.7, 0.32);
      thrustArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 4, 0x2d8bb8, 0.7, 0.32);
      dragArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 4, 0xd0764f, 0.7, 0.32);
      group.add(liftArrow, weightArrow, thrustArrow, dragArrow);
      return group;
    }

    function createCockpitOverlay() {
      const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x0d2230, transparent: true, opacity: 0.92 });
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x9fffd4, transparent: true, opacity: 0.38 });
      const dashboard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 0.08), panelMaterial);
      dashboard.position.set(0, -0.72, -1.28);
      dashboard.layers.set(1);

      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), panelMaterial);
      leftPost.position.set(-1.42, 0.05, -1.55);
      leftPost.rotation.z = -0.18;
      leftPost.layers.set(1);

      const rightPost = leftPost.clone();
      rightPost.position.x = 1.42;
      rightPost.rotation.z = 0.18;
      rightPost.layers.set(1);

      const hud = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.36), glowMaterial);
      hud.position.set(0, -0.05, -1.72);
      hud.layers.set(1);

      cockpitCamera.add(dashboard, leftPost, rightPost, hud);
    }

    function render(time) {
      const delta = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
      lastTime = time;
      resize();
      updatePlane(delta);
      updateCameras();
      updateOcean(time * 0.001);
      updateAirflow(time * 0.001);
      renderViewports();
      updateProbe(time);
      frameId = requestAnimationFrame(render);
    }

    function updatePlane(delta) {
      const targetY = Math.max(1.15, props.flight.altitude * ALTITUDE_SCALE + 1.1);
      const rawTargetZ = -props.flight.distance * DISTANCE_SCALE;
      const runwayApproach = isRunwayApproachMode();
      const targetZ = runwayApproach
        ? clamp(rawTargetZ, ARRIVAL_RUNWAY_MIN_Z, ARRIVAL_RUNWAY_MAX_Z)
        : rawTargetZ;
      plane.position.lerp(new THREE.Vector3(0, targetY, targetZ), runwayApproach ? 0.42 : 0.18);
      plane.rotation.x = THREE.MathUtils.degToRad(props.flight.pitch);
      plane.rotation.z = THREE.MathUtils.degToRad((props.controls.windShear ? Math.sin(props.flight.elapsed * 4) * 4 : 0) - props.controls.wind * 0.08);

      const flapAngle = THREE.MathUtils.degToRad(Number(props.controls.flaps) * -12);
      flapLeft.rotation.x = THREE.MathUtils.lerp(flapLeft.rotation.x, flapAngle, 0.14);
      flapRight.rotation.x = flapLeft.rotation.x;
      gearGroup.visible = Boolean(props.controls.gearDown);
      engineFailureMarker.visible = Boolean(props.controls.engineFailure);
      propeller.rotation.z += delta * (props.controls.engineFailure ? 6 : 12 + Number(props.controls.throttle) * 0.52);

      vectorGroup.position.copy(plane.position);
      const liftLength = 3 + clamp(props.flight.lift / props.flight.weight, 0, 1.6) * 6;
      const weightLength = 3 + clamp(props.flight.weight / props.flight.weight, 0, 1.2) * 4;
      const thrustLength = 3 + clamp(props.flight.thrust / 5400, 0, 1) * 5;
      const dragLength = 3 + clamp(props.flight.drag / 5400, 0, 1) * 5;
      liftArrow.setLength(liftLength, 0.7, 0.32);
      weightArrow.setLength(weightLength, 0.7, 0.32);
      thrustArrow.setLength(thrustLength, 0.7, 0.32);
      dragArrow.setLength(dragLength, 0.7, 0.32);
    }

    function updateCameras() {
      const planePosition = plane.position;
      const runwayApproach = isRunwayApproachMode();
      externalCameraPosition.set(
        planePosition.x + (runwayApproach ? 5.2 : 9),
        planePosition.y + (runwayApproach ? 3.5 + clamp(props.flight.speed / 55, 0, 1.2) : 5.4 + clamp(props.flight.speed / 35, 0, 3)),
        planePosition.z + (runwayApproach ? 9.8 : 16)
      );
      externalCamera.position.lerp(externalCameraPosition, runwayApproach ? 0.22 : 0.12);
      reusableTarget.set(
        planePosition.x,
        runwayApproach ? planePosition.y + 0.7 : planePosition.y + 0.9,
        planePosition.z - (runwayApproach ? 6.8 : 7.5)
      );
      externalCamera.lookAt(reusableTarget);

      cockpitCamera.position.copy(planePosition);
      cockpitCamera.position.y += 0.66;
      cockpitCamera.position.z -= 1.3;
      cockpitLookAt.set(
        planePosition.x,
        planePosition.y + 0.45 + props.flight.pitch * 0.035,
        planePosition.z - 20
      );
      cockpitCamera.lookAt(cockpitLookAt);
    }

    function isRunwayApproachMode() {
      return props.sceneInfo?.name === '跑道进近';
    }

    function updateOcean(time) {
      const oceanShift = Math.max(0, Math.floor((-plane.position.z - 720) / OCEAN_TILE_DEPTH));
      oceanTiles.forEach((tile, index) => {
        tile.position.z = -560 - (oceanShift + index) * OCEAN_TILE_DEPTH;
      });

      const waveFrontZ = Math.min(-420, plane.position.z + 160);
      oceanLines.forEach((line, row) => {
        const position = line.geometry.attributes.position;
        for (let i = 0; i < position.count; i += 1) {
          position.setY(i, 0.18 + Math.sin(i * 0.6 + row + time * 1.8) * 0.18);
          position.setZ(i, waveFrontZ - row * 17);
        }
        position.needsUpdate = true;
      });
    }

    function updateAirflow(time) {
      if (!airflowGroup) {
        return;
      }
      airflowGroup.visible = Boolean(props.controls.windTunnel);
      if (!airflowGroup.visible) {
        return;
      }
      const speedFactor = clamp(props.flight.airspeed / 60, 0.25, 1.8);
      airflowLines.forEach((line) => {
        const { baseY, side, row } = line.userData;
        const position = line.geometry.attributes.position;
        for (let i = 0; i < position.count; i += 1) {
          const z = -7 + ((i * 0.38 + time * speedFactor * 5.2 + row * 0.17) % 12.6);
          const bend = Math.exp(-Math.abs(z + 0.2) * 0.8) * (0.42 + Number(props.controls.flaps) * 0.18);
          const liftCurl = Math.sin(time * 4 + i * 0.5 + row) * 0.04;
          position.setZ(i, z);
          position.setX(i, side === 0 ? Math.sin(i * 0.4 + time) * 0.18 : side * (3.1 + bend));
          position.setY(i, baseY + liftCurl + Number(props.controls.angleOfAttack) * 0.015);
        }
        position.needsUpdate = true;
      });
    }

    function renderViewports() {
      renderer.clear();
      const mainCamera = props.viewMode === 'cockpit' ? cockpitCamera : externalCamera;
      const miniCamera = props.viewMode === 'cockpit' ? externalCamera : cockpitCamera;

      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      mainCamera.aspect = width / height;
      mainCamera.updateProjectionMatrix();
      renderer.render(scene, mainCamera);

      const miniWidth = Math.min(250, Math.max(154, width * 0.28));
      const miniHeight = miniWidth * 0.62;
      const miniX = width - miniWidth - 16;
      const miniY = height - miniHeight - 16;
      renderer.setViewport(miniX, miniY, miniWidth, miniHeight);
      renderer.setScissor(miniX, miniY, miniWidth, miniHeight);
      miniCamera.aspect = miniWidth / miniHeight;
      miniCamera.updateProjectionMatrix();
      renderer.render(scene, miniCamera);
    }

    function resize() {
      if (!host.value || !renderer) {
        return;
      }
      const nextWidth = Math.max(1, Math.floor(host.value.clientWidth));
      const nextHeight = Math.max(1, Math.floor(host.value.clientHeight));
      if (nextWidth === width && nextHeight === height) {
        return;
      }
      width = nextWidth;
      height = nextHeight;
      renderer.setSize(width, height, false);
    }

    function updateProbe(time) {
      if (!host.value || time - lastProbeAt < 480) {
        return;
      }
      lastProbeAt = time;
      const gl = renderer.getContext();
      const bufferWidth = gl.drawingBufferWidth;
      const bufferHeight = gl.drawingBufferHeight;
      const samples = [
        [0.5, 0.5],
        [0.25, 0.35],
        [0.72, 0.62],
        [0.88, 0.84],
        [0.12, 0.78]
      ].map(([xRatio, yRatio]) => {
        const pixel = new Uint8Array(4);
        gl.readPixels(
          Math.floor(bufferWidth * xRatio),
          Math.floor(bufferHeight * yRatio),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel
        );
        return Array.from(pixel);
      });
      const unique = new Set(samples.map((sample) => sample.join(','))).size;
      const nonBlank = samples.some((sample) => sample[0] + sample[1] + sample[2] > 30);
      host.value.dataset.probe = JSON.stringify({ width: bufferWidth, height: bufferHeight, unique, nonBlank });
    }

    return {
      host
    };
  },
  template: `
    <div
      ref="host"
      class="flight-scene3d"
      :data-wind-tunnel="controls.windTunnel ? 'on' : 'off'"
      :data-engine-failure="controls.engineFailure ? 'on' : 'off'"
    >
      <button class="three-mini-hit" type="button" @click="$emit('toggle-view')" :title="viewMode === 'external' ? '切换到第一人称主视角' : '切换到第三人称主视角'">
        <span>{{ viewMode === 'external' ? '第一人称' : '第三人称' }}</span>
      </button>
      <div class="three-view-chip">
        <strong>{{ viewMode === 'external' ? '第三人称追尾' : '第一人称驾驶舱' }}</strong>
        <span>3D 同步渲染</span>
      </div>
    </div>
  `
};

function seeded(value) {
  const raw = Math.sin(value * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
