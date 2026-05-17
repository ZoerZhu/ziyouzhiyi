import { createApp, reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  Activity,
  AlertTriangle,
  Camera,
  CircleGauge,
  Compass,
  GraduationCap,
  Keyboard,
  Map,
  Pause,
  Plane,
  Play,
  RadioTower,
  RotateCcw,
  Route,
  SlidersHorizontal,
  Sparkles,
  Wind
} from 'lucide-vue-next';
import {
  activeStepId,
  applyDemoControls,
  applyProgramControls,
  createInitialFlight,
  flightPrograms,
  localSteps,
  makeHistoryPoint,
  prepareProgram,
  updateFlight
} from './sim/flightModel.js';
import FlightScene3D from './components/FlightScene3D.js';
import './styles/app.css';

const API_BASE = 'http://127.0.0.1:8088';

const keyboardHints = [
  { key: 'W / S', label: '油门增减' },
  { key: '↑ / ↓', label: '迎角调整' },
  { key: 'F', label: '襟翼循环' },
  { key: 'G', label: '起落架' },
  { key: 'B', label: '风切变' },
  { key: 'T', label: '实时风洞气流' },
  { key: 'E', label: '单发失效' },
  { key: 'H', label: '受力面板' },
  { key: 'V', label: '切换视角' },
  { key: '1-8', label: '自动示例' },
  { key: 'Space', label: '暂停/继续' }
];

const instrumentQuestions = [
  {
    title: '哪个仪表最直接告诉你飞机是否在加速？',
    answer: '空速表',
    options: ['空速表', '高度表', '姿态仪'],
    explanation: '空速表显示机翼实际感受到的气流速度。起飞时先看空速是否稳定增加。'
  },
  {
    title: '姿态仪中机头高于地平线通常表示什么？',
    answer: '飞机正在抬头',
    options: ['飞机正在抬头', '起落架已放下', '阻力一定小于推力'],
    explanation: '姿态仪显示俯仰和滚转。机头抬高会改变迎角，从而影响升力和阻力。'
  },
  {
    title: '垂直速度为负值时，飞机正在发生什么？',
    answer: '高度正在下降',
    options: ['高度正在下降', '速度一定增加', '升力一定为零'],
    explanation: '垂直速度描述高度变化率。降落时需要小的负值，而不是快速下坠。'
  },
  {
    title: '襟翼放下后，最典型的变化是什么？',
    answer: '低速升力增加但阻力也增加',
    options: ['低速升力增加但阻力也增加', '重力减少', '发动机推力翻倍'],
    explanation: '襟翼改变机翼弯度，让飞机低速时更容易产生升力，但额外阻力也会变大。'
  }
];

const explanationLibrary = {
  standard: [
    {
      title: '先加速，不急着抬头',
      principle: '飞机起飞的第一件事是建立空速。速度越高，单位时间流过机翼的空气越多，升力才会明显增加。',
      watch: '观察推力条是否超过阻力条，同时速度读数逐步上升。此时升力还不够，飞机仍应贴在跑道上。'
    },
    {
      title: '让机翼开始产生足够升力',
      principle: '迎角稍微增加后，机翼会把气流向下偏转，空气也会给机翼一个向上的反作用力。',
      watch: '速度接近抬轮区间时，升力条会追近重力条，但过早拉大迎角会增加阻力。'
    },
    {
      title: '抬轮要轻柔',
      principle: '当升力接近或超过重力，飞机可以离地。迎角不是越大越好，过大迎角会让气流分离并进入失速风险。',
      watch: '看飞机离开跑道、垂直速度转为正值，同时失速风险保持较低。'
    },
    {
      title: '收起落架是为了减阻',
      principle: '起落架暴露在气流中会产生额外阻力。确认飞机已经稳定爬升后收起起落架，可以让推力更有效地转化为速度和爬升。',
      watch: '收起起落架后阻力条下降，飞机更容易维持爬升。'
    },
    {
      title: '收襟翼进入正常爬升',
      principle: '襟翼改变机翼形状，可以在低速时增加升力，但也会增加阻力。离地后速度充足，就逐步收回襟翼。',
      watch: '襟翼收回时机翼后缘在 3D 模型中会抬回，阻力下降，姿态更平稳。'
    }
  ],
  cruise: [
    {
      title: '巡航追求四力平衡',
      principle: '巡航不是一直爬升，而是让升力接近重力、推力接近阻力。四种力越接近平衡，飞机越稳定。',
      watch: '观察高度曲线趋于平缓，垂直速度接近 0。'
    },
    {
      title: '用油门控制能量',
      principle: '油门主要改变推力。推力长期大于阻力会加速，长期小于阻力会减速。',
      watch: '当油门略收，推力条接近阻力条，速度变化会变慢。'
    },
    {
      title: '小幅迎角修正高度',
      principle: '迎角影响升力，也影响阻力。巡航时只需要小幅修正，避免因为大幅拉杆造成速度损失。',
      watch: '看高度和速度同时变化：迎角增加一点，高度更容易保持，但阻力也会上升。'
    },
    {
      title: '干净构型更适合巡航',
      principle: '收起襟翼和起落架后，机翼外形更适合高速飞行，阻力更小。',
      watch: '3D 机翼后缘保持收起，力条趋稳，飞机在城市和森林上空连续前进。'
    }
  ],
  'level-flight': [
    {
      title: '先看高度变化率',
      principle: '在 1500 米平飞时，不是只看高度数字，而是先看垂直速度是否接近 0。只有不上冲也不下沉，才算真正稳住高度。',
      watch: '观察垂直速度逐步收敛，同时高度读数稳定在 1500 米附近。'
    },
    {
      title: '轻微收油门抑制上冲',
      principle: '如果飞机还在缓慢爬升，说明推力或迎角略大。此时只需要小幅收油门和减小迎角，不要突然压机头。',
      watch: '看垂直速度从正值慢慢回落，而不是直接变成大幅下降。'
    },
    {
      title: '小修正比大动作更稳',
      principle: '1500 米平飞阶段最怕反复过度修正。高度稍有波动时，用很小幅度的油门和迎角调整，就能把飞机重新带回平衡。',
      watch: '高度曲线轻微起伏，但整体保持在 1500 米这一高度层附近。'
    },
    {
      title: '维持干净构型持续平飞',
      principle: '收起襟翼和起落架后阻力更小，更适合长期平飞。此时重点是让升力接近重力、推力接近阻力。',
      watch: '襟翼和起落架保持收起，垂直速度接近 0，飞机稳定保持在 1500 米附近。'
    }
  ],
  landing: [
    {
      title: '先建立稳定进近',
      principle: '降落不是简单往下掉，而是用油门、迎角和襟翼共同控制下降率。',
      watch: '垂直速度保持小负值，速度不要快速掉到过低。'
    },
    {
      title: '放下起落架会增加阻力',
      principle: '起落架让着陆成为可能，但也会让阻力上升，所以通常需要小幅补油门维持速度。',
      watch: '起落架放下后，3D 模型下方出现轮子，阻力条随之变长。'
    },
    {
      title: '襟翼改变机翼形状',
      principle: '降落襟翼让机翼在较低速度下仍能提供升力，因此飞机可以慢一些接近跑道。',
      watch: '3D 机翼后缘明显下偏，升力增加，但阻力也更大。'
    },
    {
      title: '接地前降低下降率',
      principle: '接近地面时需要略微拉平，让垂直速度变小，减少硬着陆风险。',
      watch: '高度下降变慢，俯仰角略增，但失速风险不应快速上升。'
    },
    {
      title: '柔和接地',
      principle: '最后阶段收油门，让飞机在仍有少量升力时轻柔接触跑道。',
      watch: '速度和高度同时降低，飞机进入接地状态。'
    }
  ],
  'wind-shear': [
    {
      title: '风切变会突然改变空速',
      principle: '风速方向或大小快速变化时，机翼感受到的空速会波动，升力也会跟着波动。',
      watch: '打开风切变后，空速和垂直速度会变得不稳定。'
    },
    {
      title: '先补能量，再修姿态',
      principle: '低空遇到风切变时，优先增加推力恢复能量，而不是单纯拉大迎角。',
      watch: '推力条快速上升，速度恢复后飞机更容易继续爬升。'
    },
    {
      title: '避免过大迎角',
      principle: '迎角过大时，机翼上表面的气流会分离，升力可能突然下降，这就是失速风险。',
      watch: '失速风险保持低位，说明恢复动作更稳。'
    },
    {
      title: '回到正常构型',
      principle: '气流稳定后收回多余构型，降低阻力，回到正常爬升。',
      watch: '风切变关闭，襟翼收回，3D 场景继续无缝向前推进。'
    }
  ],
  'engine-failure': [
    {
      title: '识别推力损失',
      principle: '单发失效时可用推力突然下降，飞机会更难维持爬升。第一目标是控制方向和速度。',
      watch: '3D 机头前方出现红色发动机提示环，推力条明显变短。'
    },
    {
      title: '低头保速',
      principle: '失去部分推力后，如果继续拉高机头，速度会快速下降并可能接近失速。',
      watch: '迎角降低后，失速风险下降，空速逐步恢复。'
    },
    {
      title: '构型减阻',
      principle: '收起襟翼和起落架可以减少阻力，把有限推力留给维持速度和操纵余量。',
      watch: '阻力条缩短，垂直速度变得更可控。'
    },
    {
      title: '选择备降区域',
      principle: '发动机故障后要尽快选择可到达的跑道或迫降区域，保持最佳滑翔速度。',
      watch: '飞机保持缓慢下降，而不是失控下坠。'
    },
    {
      title: '最后阶段再放构型',
      principle: '接近跑道前才放起落架和襟翼，避免太早增加阻力导致到不了跑道。',
      watch: '起落架出现后阻力上升，适合最后进近阶段。'
    }
  ],
  'stall-recovery': [
    {
      title: '减小迎角',
      principle: '失速的核心不是发动机停转，而是迎角过大导致机翼上方气流分离。',
      watch: '打开实时风洞气流后，可以看到气流重新贴近机翼。'
    },
    {
      title: '恢复能量',
      principle: '推力增加能帮助恢复速度，但必须先让机翼重新有效工作。',
      watch: '空速上升，失速风险下降。'
    },
    {
      title: '收回多余襟翼',
      principle: '速度恢复后收襟翼可以降低阻力，让飞机重新进入正常飞行。',
      watch: '3D 机翼后缘回收，阻力条缩短。'
    },
    {
      title: '回到爬升姿态',
      principle: '改出后不能猛拉机头，要逐步建立正常爬升角。',
      watch: '垂直速度转正，姿态平稳。'
    }
  ],
  'go-around': [
    {
      title: '果断复飞',
      principle: '进近不稳定时继续降落风险更高。复飞的第一动作是增加推力。',
      watch: '推力条快速变长，飞机从下降转向爬升。'
    },
    {
      title: '建立正爬升率',
      principle: '只有确认飞机不再下降，才开始逐步收构型。',
      watch: '垂直速度转为正值，高度开始增加。'
    },
    {
      title: '收起起落架',
      principle: '起落架产生很大阻力，正爬升后收起可以提高爬升能力。',
      watch: '轮子消失，阻力条下降。'
    },
    {
      title: '转入标准爬升',
      principle: '复飞不是突然拉高，而是逐步收襟翼、保持速度、继续爬升。',
      watch: '襟翼回收，飞机重新进入稳定爬升。'
    }
  ]
};

const App = {
  components: {
    Activity,
    AlertTriangle,
    Camera,
    CircleGauge,
    Compass,
    GraduationCap,
    Keyboard,
    Map,
    Pause,
    Plane,
    Play,
    RadioTower,
    RotateCcw,
    Route,
    SlidersHorizontal,
    Sparkles,
    Wind,
    FlightScene3D
  },
  setup() {
    const controls = reactive({
      throttle: 46,
      angleOfAttack: 4,
      flaps: 1,
      gearDown: true,
      wind: 4,
      windShear: false,
      windTunnel: true,
      engineFailure: false,
      landingAssist: false
    });

    const flight = reactive(createInitialFlight());
    const teachingSteps = ref(localSteps);
    const running = ref(true);
    const demoMode = ref(false);
    const demoSpeed = ref(1);
    const backendOnline = ref(false);
    const selectedPanel = ref('forces');
    const history = ref([]);
    const scenarioName = ref('基础起飞-巡航-降落实验');
    const syncing = ref(false);
    const viewMode = ref('external');
    const activeKey = ref('');
    const currentProgramId = ref('');
    const programElapsed = ref(0);
    const programCue = ref(null);
    const explanationOpen = ref(false);
    const lastExplanationKey = ref('');
    const forceHudOpen = ref(true);
    const instrumentQuestionIndex = ref(0);
    const instrumentAnswer = ref('');
    const pressedKeys = new Set();
    let animationFrame = 0;
    let lastFrame = 0;
    let keyTimer = 0;

    const currentStepId = computed(() => activeStepId(flight, controls));
    const currentStep = computed(() => teachingSteps.value.find((step) => step.id === currentStepId.value));
    const activeProgram = computed(() => flightPrograms.find((program) => program.id === currentProgramId.value));
    const phaseClass = computed(() => {
      if (flight.phase === '失速风险') return 'danger';
      if (flight.phase === '巡航') return 'stable';
      if (flight.phase === '爬升') return 'climb';
      if (flight.phase === '进近') return 'approach';
      return 'normal';
    });

    const planeStyle = computed(() => {
      const x = Math.min(68, 12 + flight.speed * 0.55);
      const y = Math.max(16, Math.min(76, 73 - flight.altitude * 0.24));
      return {
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${flight.pitch}deg)`
      };
    });

    const forceRatio = computed(() => ({
      lift: percent(flight.lift, flight.weight * 1.35),
      weight: percent(flight.weight, flight.weight * 1.35),
      thrust: percent(flight.thrust, 5400),
      drag: percent(flight.drag, 5400),
      stall: Math.round(flight.stallRisk * 100)
    }));

    const vectors = computed(() => ({
      lift: 38 + forceRatio.value.lift * 0.7,
      weight: 38 + forceRatio.value.weight * 0.45,
      thrust: 42 + forceRatio.value.thrust * 0.58,
      drag: 42 + forceRatio.value.drag * 0.58
    }));

    const chartPoints = computed(() => {
      const points = history.value.slice(-90);
      return {
        altitude: toPolyline(points, 'altitude', 220),
        speed: toPolyline(points, 'speed', 120)
      };
    });

    const completedText = computed(() => `${currentStepId.value - 1}/5`);

    const sceneInfo = computed(() => {
      if (['landing', 'go-around'].includes(currentProgramId.value)) {
        return { name: '跑道进近', detail: '降落/复飞训练', className: 'scene-runway' };
      }
      if (flight.distance < 850) {
        return { name: '机场跑道', detail: '滑跑与离场', className: 'scene-runway' };
      }
      if (flight.distance < 1800) {
        return { name: '城市上空', detail: '楼群后移', className: 'scene-city' };
      }
      if (flight.distance < 3100) {
        return { name: '森林航线', detail: '地貌展开', className: 'scene-forest' };
      }
      return { name: '海岸海洋', detail: '越过海岸线', className: 'scene-ocean' };
    });

    const sceneVars = computed(() => {
      const distance = flight.distance;
      const sceneShift = -((distance * 0.18) % 980);
      const cloudShift = -((distance * 0.035) % 260);
      const pitch = clamp(flight.pitch, -10, 16);
      return {
        '--scene-shift': `${sceneShift}px`,
        '--scene-shift-slow': `${sceneShift * 0.28}px`,
        '--scene-shift-forest': `${sceneShift * 1.2}px`,
        '--scene-shift-ocean': `${sceneShift * 0.62}px`,
        '--fast-shift': `${-((distance * 0.45) % 840)}px`,
        '--cloud-shift': `${cloudShift}px`,
        '--cloud-shift-soft': `${cloudShift * 0.9}px`,
        '--runway-opacity': clamp(1 - distance / 850, 0, 1),
        '--city-opacity': clamp((distance - 620) / 520, 0, 1) * clamp(1 - (distance - 1900) / 520, 0, 1),
        '--forest-opacity': clamp((distance - 1500) / 650, 0, 1) * clamp(1 - (distance - 3300) / 650, 0, 1),
        '--ocean-opacity': clamp((distance - 2800) / 650, 0, 1),
        '--altitude-view': clamp(flight.altitude / 150, 0, 1),
        '--distant-opacity': 0.92 - clamp(flight.altitude / 150, 0, 1) * 0.28,
        '--pitch-angle': `${pitch}deg`,
        '--horizon-tilt': `${pitch * -0.12}deg`,
        '--cockpit-pitch-y': `${pitch * -2}px`,
        '--cockpit-horizon-y': `${pitch * 1.6}px`,
        '--cockpit-ground-translate': `${-((distance * 0.72) % 180)}px`,
        '--cockpit-speed': `${clamp(flight.speed / 90, 0.12, 1)}`
      };
    });

    const programProgress = computed(() => programCue.value?.progress || 0);
    const currentProgramCompleted = computed(() => (
      activeProgram.value && programElapsed.value >= activeProgram.value.duration
    ));
    const autoPlaybackRate = computed(() => Number(demoSpeed.value) || 1);
    const programStepText = computed(() => {
      if (programCue.value?.step) {
        return programCue.value.step.label;
      }
      if (activeProgram.value) {
        return activeProgram.value.description;
      }
      return '选择一个自动示例，平台会按正规操作顺序推进并实时解释每一步。';
    });
    const programExplanation = computed(() => {
      if (!activeProgram.value || !programCue.value?.step) {
        return null;
      }
      return buildProgramExplanation(activeProgram.value, programCue.value, flight, controls, currentProgramCompleted.value);
    });
    const threeCoordinates = computed(() => ({
      x: controls.wind * 0.04,
      y: flight.altitude * 0.25 + 1.1,
      z: -flight.distance * 0.12
    }));
    const currentInstrumentQuestion = computed(() => instrumentQuestions[instrumentQuestionIndex.value]);
    const instrumentResult = computed(() => {
      if (!instrumentAnswer.value) {
        return '';
      }
      return instrumentAnswer.value === currentInstrumentQuestion.value.answer ? 'correct' : 'wrong';
    });

    function loop(timestamp) {
      if (!lastFrame) {
        lastFrame = timestamp;
      }
      const deltaSeconds = Math.min(0.08, (timestamp - lastFrame) / 1000);
      lastFrame = timestamp;

      if (running.value) {
        const usedKeyboard = applyKeyboardHold(deltaSeconds);
        const autoModeActive = !usedKeyboard && (activeProgram.value || demoMode.value);
        const simulationDelta = autoModeActive ? deltaSeconds * autoPlaybackRate.value : deltaSeconds;
        if (usedKeyboard) {
          stopAutoModes();
        }

        if (!usedKeyboard && activeProgram.value) {
          programElapsed.value = Math.min(programElapsed.value + simulationDelta, activeProgram.value.duration);
          programCue.value = applyProgramControls(controls, currentProgramId.value, programElapsed.value, flight);
          const nextExplanationKey = `${currentProgramId.value}-${programCue.value.stepIndex}`;
          if (nextExplanationKey !== lastExplanationKey.value) {
            lastExplanationKey.value = nextExplanationKey;
            explanationOpen.value = true;
          }
        } else if (!usedKeyboard && demoMode.value) {
          applyDemoControls(controls, flight);
        }

        updateFlight(flight, controls, simulationDelta);
        if (history.value.length === 0 || flight.elapsed - history.value[history.value.length - 1].time > 0.22) {
          history.value.push(makeHistoryPoint(flight));
          if (history.value.length > 140) {
            history.value.shift();
          }
        }
      }
      animationFrame = requestAnimationFrame(loop);
    }

    function resetSimulation() {
      Object.assign(flight, createInitialFlight());
      controls.throttle = 46;
      controls.angleOfAttack = 4;
      controls.flaps = 1;
      controls.gearDown = true;
      controls.wind = 4;
      controls.windShear = false;
      controls.windTunnel = true;
      controls.engineFailure = false;
      controls.landingAssist = false;
      history.value = [];
      demoMode.value = false;
      currentProgramId.value = '';
      programElapsed.value = 0;
      programCue.value = null;
      explanationOpen.value = false;
      lastExplanationKey.value = '';
    }

    function toggleRunning() {
      running.value = !running.value;
    }

    function toggleDemo() {
      if (!demoMode.value && flight.elapsed > 3) {
        resetSimulation();
      }
      currentProgramId.value = '';
      demoMode.value = !demoMode.value;
      running.value = true;
    }

    function startProgram(programId) {
      const program = prepareProgram(programId, flight, controls);
      currentProgramId.value = program.id;
      programElapsed.value = 0;
      programCue.value = applyProgramControls(controls, program.id, 0, flight);
      explanationOpen.value = true;
      lastExplanationKey.value = `${program.id}-0`;
      demoMode.value = false;
      running.value = true;
      history.value = [];
    }

    function stopAutoModes() {
      if (currentProgramId.value || demoMode.value) {
        currentProgramId.value = '';
        demoMode.value = false;
        programCue.value = null;
        explanationOpen.value = false;
        lastExplanationKey.value = '';
        controls.landingAssist = false;
      }
    }

    function toggleViewMode() {
      viewMode.value = viewMode.value === 'external' ? 'cockpit' : 'external';
    }

    function applyKeyboardHold(deltaSeconds) {
      let changed = false;
      const throttleStep = 34 * deltaSeconds;
      const angleStep = 8 * deltaSeconds;
      const windStep = 10 * deltaSeconds;

      if (pressedKeys.has('w')) {
        controls.throttle = clamp(controls.throttle + throttleStep, 0, 100);
        changed = true;
      }
      if (pressedKeys.has('s')) {
        controls.throttle = clamp(controls.throttle - throttleStep, 0, 100);
        changed = true;
      }
      if (pressedKeys.has('arrowup')) {
        controls.angleOfAttack = clamp(controls.angleOfAttack + angleStep, -4, 18);
        changed = true;
      }
      if (pressedKeys.has('arrowdown')) {
        controls.angleOfAttack = clamp(controls.angleOfAttack - angleStep, -4, 18);
        changed = true;
      }
      if (pressedKeys.has('a')) {
        controls.wind = clamp(controls.wind - windStep, -15, 22);
        changed = true;
      }
      if (pressedKeys.has('d')) {
        controls.wind = clamp(controls.wind + windStep, -15, 22);
        changed = true;
      }
      return changed;
    }

    function handleKeydown(event) {
      if (isFormTarget(event.target)) {
        return;
      }
      const key = normalizeKey(event.key);
      const handledKeys = ['w', 's', 'a', 'd', 'arrowup', 'arrowdown', ' ', 'f', 'g', 'b', 't', 'e', 'h', 'v', 'r'];
      const isProgramKey = /^\d$/.test(key) && Number(key) >= 1 && Number(key) <= flightPrograms.length;
      if (!handledKeys.includes(key) && !isProgramKey) {
        return;
      }
      event.preventDefault();
      flashKey(key);

      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown'].includes(key)) {
        pressedKeys.add(key);
        return;
      }
      if (event.repeat) {
        return;
      }
      if (key === ' ') {
        toggleRunning();
      } else if (key === 'f') {
        stopAutoModes();
        controls.flaps = (controls.flaps + 1) % 3;
      } else if (key === 'g') {
        stopAutoModes();
        controls.gearDown = !controls.gearDown;
      } else if (key === 'b') {
        stopAutoModes();
        controls.windShear = !controls.windShear;
      } else if (key === 't') {
        stopAutoModes();
        controls.windTunnel = !controls.windTunnel;
      } else if (key === 'e') {
        stopAutoModes();
        controls.engineFailure = !controls.engineFailure;
      } else if (key === 'h') {
        forceHudOpen.value = !forceHudOpen.value;
      } else if (key === 'v') {
        toggleViewMode();
      } else if (key === 'r') {
        resetSimulation();
      } else if (isProgramKey) {
        startProgram(flightPrograms[Number(key) - 1].id);
      }
    }

    function handleKeyup(event) {
      pressedKeys.delete(normalizeKey(event.key));
    }

    function flashKey(key) {
      const labels = {
        ' ': 'Space',
        arrowup: '↑',
        arrowdown: '↓'
      };
      activeKey.value = labels[key] || key.toUpperCase();
      window.clearTimeout(keyTimer);
      keyTimer = window.setTimeout(() => {
        activeKey.value = '';
      }, 520);
    }

    async function loadBackendData() {
      try {
        const [health, steps, scenario] = await Promise.all([
          fetch(`${API_BASE}/api/health`),
          fetch(`${API_BASE}/api/teaching/steps`),
          fetch(`${API_BASE}/api/scenario/default`)
        ]);
        backendOnline.value = health.ok;
        if (steps.ok) {
          teachingSteps.value = await steps.json();
        }
        if (scenario.ok) {
          const data = await scenario.json();
          scenarioName.value = data.name || scenarioName.value;
        }
      } catch {
        backendOnline.value = false;
      }
    }

    async function syncWithBackend() {
      syncing.value = true;
      try {
        const response = await fetch(`${API_BASE}/api/simulation/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...controls,
            speed: flight.speed,
            altitude: flight.altitude,
            distance: flight.distance,
            verticalSpeed: flight.verticalSpeed,
            elapsed: flight.elapsed,
            deltaSeconds: 0.12
          })
        });
        if (!response.ok) {
          throw new Error('backend unavailable');
        }
        Object.assign(flight, await response.json());
        backendOnline.value = true;
      } catch {
        backendOnline.value = false;
      } finally {
        syncing.value = false;
      }
    }

    function chooseInstrumentAnswer(option) {
      instrumentAnswer.value = option;
    }

    function nextInstrumentQuestion() {
      instrumentQuestionIndex.value = (instrumentQuestionIndex.value + 1) % instrumentQuestions.length;
      instrumentAnswer.value = '';
    }

    onMounted(() => {
      loadBackendData();
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keyup', handleKeyup);
      animationFrame = requestAnimationFrame(loop);
    });

    onBeforeUnmount(() => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      window.clearTimeout(keyTimer);
    });

    return {
      activeKey,
      activeProgram,
      backendOnline,
      chartPoints,
      completedText,
      controls,
      currentProgramId,
      currentInstrumentQuestion,
      currentStep,
      currentStepId,
      demoMode,
      demoSpeed,
      flight,
      flightPrograms,
      forceRatio,
      forceHudOpen,
      history,
      keyboardHints,
      currentProgramCompleted,
      explanationOpen,
      instrumentAnswer,
      instrumentResult,
      phaseClass,
      planeStyle,
      programExplanation,
      programProgress,
      programStepText,
      resetSimulation,
      running,
      scenarioName,
      sceneInfo,
      sceneVars,
      selectedPanel,
      startProgram,
      stopAutoModes,
      syncWithBackend,
      syncing,
      teachingSteps,
      toggleDemo,
      toggleRunning,
      toggleViewMode,
      vectors,
      viewMode,
      threeCoordinates,
      chooseInstrumentAnswer,
      nextInstrumentQuestion,
      formatNumber
    };
  },
  template: `
    <main class="app-shell">
      <header class="topbar glass">
        <div class="brand">
          <span class="brand-mark"><Plane :size="22" /></span>
          <div>
            <strong>AeroLab</strong>
            <small>{{ scenarioName }}</small>
          </div>
        </div>

        <div class="status-strip">
          <span class="status-pill" :class="backendOnline ? 'online' : 'offline'">
            <RadioTower :size="15" />
            {{ backendOnline ? 'Java 已连接' : '前端模拟' }}
          </span>
          <span class="status-pill" :class="phaseClass">
            <Activity :size="15" />
            {{ flight.phase }}
          </span>
          <span class="status-pill scene">
            <Map :size="15" />
            {{ sceneInfo.name }}
          </span>
        </div>

        <div class="top-actions">
          <button class="icon-button" type="button" @click="toggleViewMode" :title="viewMode === 'external' ? '切换到第一人称' : '切换到外部视角'">
            <Camera :size="19" />
          </button>
          <button class="icon-button" type="button" @click="toggleRunning" :title="running ? '暂停模拟' : '继续模拟'">
            <Pause v-if="running" :size="19" />
            <Play v-else :size="19" />
          </button>
          <button class="icon-button" type="button" @click="resetSimulation" title="重置模拟">
            <RotateCcw :size="18" />
          </button>
        </div>
      </header>

      <section class="workspace">
        <aside class="guide-panel glass">
          <div class="panel-heading">
            <GraduationCap :size="20" />
            <div>
              <span>教学引导</span>
              <strong>{{ completedText }}</strong>
            </div>
          </div>

          <div class="steps">
            <article
              v-for="step in teachingSteps"
              :key="step.id"
              class="step-card"
              :class="{ active: step.id === currentStepId, done: step.id < currentStepId }"
            >
              <span class="step-index">{{ step.id }}</span>
              <div>
                <strong>{{ step.title }}</strong>
                <p>{{ step.id === currentStepId ? step.goal : step.hint }}</p>
              </div>
            </article>
          </div>

          <div class="feedback-card" :class="phaseClass">
            <AlertTriangle v-if="phaseClass === 'danger'" :size="19" />
            <Sparkles v-else :size="19" />
            <p>{{ flight.feedback }}</p>
          </div>

          <div class="keyboard-panel">
            <div class="mini-heading">
              <Keyboard :size="17" />
              <span>键盘控制</span>
              <strong v-if="activeKey">{{ activeKey }}</strong>
            </div>
            <div class="key-grid">
              <span v-for="hint in keyboardHints" :key="hint.key">
                <kbd>{{ hint.key }}</kbd>{{ hint.label }}
              </span>
            </div>
          </div>
        </aside>

        <section class="simulation-stage glass" :class="[sceneInfo.className, { 'cockpit-main': viewMode === 'cockpit' }]">
          <FlightScene3D
            :flight="flight"
            :controls="controls"
            :view-mode="viewMode"
            :scene-info="sceneInfo"
            @toggle-view="toggleViewMode"
          />

          <div class="scene-badge">
            <Compass :size="15" />
            <span>{{ sceneInfo.name }}</span>
            <strong>{{ sceneInfo.detail }}</strong>
          </div>

          <div class="stage-readout">
            <span>高度 {{ formatNumber(flight.altitude, 0) }} m</span>
            <span>速度 {{ formatNumber(flight.speed, 1) }} m/s</span>
            <span>迎角 {{ formatNumber(controls.angleOfAttack, 1) }}°</span>
          </div>

          <aside class="cockpit-force-panel glass" :class="{ collapsed: !forceHudOpen }">
            <button type="button" @click="forceHudOpen = !forceHudOpen">
              {{ forceHudOpen ? '收起受力坐标' : '打开受力坐标' }}
            </button>
            <div v-if="forceHudOpen">
              <h3>质点坐标 / 受力</h3>
              <div class="coord-grid">
                <span>X</span><strong>{{ formatNumber(threeCoordinates.x, 2) }}</strong>
                <span>Y</span><strong>{{ formatNumber(threeCoordinates.y, 2) }}</strong>
                <span>Z</span><strong>{{ formatNumber(threeCoordinates.z, 2) }}</strong>
              </div>
              <div class="axis-legend">
                <span>X 横向</span>
                <span>Y 竖直</span>
                <span>Z 前向</span>
              </div>
              <div class="force-mini">
                <label><span>升力</span><strong>{{ formatNumber(flight.lift, 0) }} N</strong></label>
                <label><span>重力</span><strong>{{ formatNumber(flight.weight, 0) }} N</strong></label>
                <label><span>推力</span><strong>{{ formatNumber(flight.thrust, 0) }} N</strong></label>
                <label><span>阻力</span><strong>{{ formatNumber(flight.drag, 0) }} N</strong></label>
              </div>
            </div>
          </aside>

          <article v-if="programExplanation && explanationOpen" class="explain-modal glass">
            <div class="explain-head">
              <span>{{ programExplanation.eyebrow }}</span>
              <button type="button" @click="explanationOpen = false">收起</button>
            </div>
            <h3>{{ programExplanation.title }}</h3>
            <p><strong>正在做什么：</strong>{{ programExplanation.action }}</p>
            <p><strong>为什么这样做：</strong>{{ programExplanation.principle }}</p>
            <p><strong>观察重点：</strong>{{ programExplanation.watch }}</p>
            <small>{{ programExplanation.live }}</small>
          </article>
        </section>

        <aside class="data-panel glass">
          <div class="panel-tabs">
            <button type="button" :class="{ active: selectedPanel === 'forces' }" @click="selectedPanel = 'forces'">
              <CircleGauge :size="16" />
              力
            </button>
            <button type="button" :class="{ active: selectedPanel === 'chart' }" @click="selectedPanel = 'chart'">
              <Activity :size="16" />
              曲线
            </button>
            <button type="button" :class="{ active: selectedPanel === 'instruments' }" @click="selectedPanel = 'instruments'">
              <Compass :size="16" />
              仪表
            </button>
          </div>

          <div v-if="selectedPanel === 'forces'" class="force-bars">
            <div class="metric-row">
              <span>升力</span>
              <strong>{{ formatNumber(flight.lift, 0) }} N</strong>
              <div class="bar"><i class="lift-bar" :style="{ width: forceRatio.lift + '%' }"></i></div>
            </div>
            <div class="metric-row">
              <span>重力</span>
              <strong>{{ formatNumber(flight.weight, 0) }} N</strong>
              <div class="bar"><i class="weight-bar" :style="{ width: forceRatio.weight + '%' }"></i></div>
            </div>
            <div class="metric-row">
              <span>推力</span>
              <strong>{{ formatNumber(flight.thrust, 0) }} N</strong>
              <div class="bar"><i class="thrust-bar" :style="{ width: forceRatio.thrust + '%' }"></i></div>
            </div>
            <div class="metric-row">
              <span>阻力</span>
              <strong>{{ formatNumber(flight.drag, 0) }} N</strong>
              <div class="bar"><i class="drag-bar" :style="{ width: forceRatio.drag + '%' }"></i></div>
            </div>
            <div class="stall-meter" :class="{ hot: forceRatio.stall > 55 }">
              <span>失速风险</span>
              <strong>{{ forceRatio.stall }}%</strong>
              <div><i :style="{ width: forceRatio.stall + '%' }"></i></div>
            </div>
          </div>

          <div v-else-if="selectedPanel === 'chart'" class="chart-panel">
            <svg viewBox="0 0 260 150">
              <path class="grid-line" d="M0 38 H260 M0 75 H260 M0 112 H260" />
              <polyline class="altitude-line" :points="chartPoints.altitude" />
              <polyline class="speed-line" :points="chartPoints.speed" />
            </svg>
            <div class="legend">
              <span><i class="altitude-dot"></i>高度</span>
              <span><i class="speed-dot"></i>速度</span>
            </div>
          </div>

          <div v-else class="instrument-training">
            <div class="instrument-stack">
              <div class="instrument-card attitude">
                <span>姿态仪</span>
                <strong>{{ formatNumber(flight.pitch, 1) }}°</strong>
                <i :style="{ transform: 'rotate(' + (controls.windShear ? Math.sin(flight.elapsed * 4) * 5 : 0) + 'deg) translateY(' + (-flight.pitch * 0.45) + 'px)' }"></i>
              </div>
              <div class="instrument-card airspeed">
                <span>空速表</span>
                <strong>{{ formatNumber(flight.airspeed, 0) }}</strong>
                <i :style="{ transform: 'rotate(' + Math.min(230, flight.airspeed * 2.4 - 110) + 'deg)' }"></i>
              </div>
              <div class="instrument-card altimeter">
                <span>高度表</span>
                <strong>{{ formatNumber(flight.altitude, 0) }}</strong>
                <i :style="{ transform: 'rotate(' + ((flight.altitude % 100) * 3.6 - 90) + 'deg)' }"></i>
              </div>
              <div class="instrument-card vsi">
                <span>升降率</span>
                <strong>{{ formatNumber(flight.verticalSpeed, 1) }}</strong>
                <i :style="{ transform: 'rotate(' + Math.max(-90, Math.min(90, flight.verticalSpeed * 9)) + 'deg)' }"></i>
              </div>
            </div>

            <div class="quiz-card">
              <span>仪表认知训练</span>
              <p>{{ currentInstrumentQuestion.title }}</p>
              <button
                v-for="option in currentInstrumentQuestion.options"
                :key="option"
                type="button"
                :class="{ selected: instrumentAnswer === option, correct: instrumentAnswer && option === currentInstrumentQuestion.answer, wrong: instrumentAnswer === option && instrumentResult === 'wrong' }"
                @click="chooseInstrumentAnswer(option)"
              >
                {{ option }}
              </button>
              <small v-if="instrumentAnswer">{{ currentInstrumentQuestion.explanation }}</small>
              <button class="next-quiz" type="button" @click="nextInstrumentQuestion">下一题</button>
            </div>
          </div>

          <div class="numbers-grid">
            <div><span>空速</span><strong>{{ formatNumber(flight.airspeed, 1) }}</strong></div>
            <div><span>垂直速度</span><strong>{{ formatNumber(flight.verticalSpeed, 1) }}</strong></div>
            <div><span>俯仰</span><strong>{{ formatNumber(flight.pitch, 1) }}°</strong></div>
            <div><span>距离</span><strong>{{ formatNumber(flight.distance, 0) }}</strong></div>
          </div>

          <div class="program-panel">
            <div class="mini-heading">
              <Route :size="17" />
              <span>自动飞行示例</span>
            </div>
            <div class="program-list">
              <button
                v-for="(program, index) in flightPrograms"
                :key="program.id"
                type="button"
                :class="{ active: currentProgramId === program.id }"
                @click="startProgram(program.id)"
              >
                <span>{{ index + 1 }}</span>
                <strong>{{ program.title }}</strong>
                <small>{{ program.subtitle }}</small>
              </button>
            </div>
            <div class="program-cue">
              <span>{{ activeProgram ? activeProgram.title : '未选择示例' }}</span>
              <p>{{ programStepText }}</p>
              <div><i :style="{ width: programProgress + '%' }"></i></div>
            </div>
          </div>
        </aside>
      </section>

      <section class="control-deck glass">
        <div class="deck-title">
          <SlidersHorizontal :size="19" />
          <span>飞行控制台</span>
        </div>

        <label class="control">
          <span>油门</span>
          <input type="range" min="0" max="100" step="1" v-model.number="controls.throttle" @input="stopAutoModes" />
          <strong>{{ formatNumber(controls.throttle, 0) }}%</strong>
        </label>

        <label class="control">
          <span>迎角</span>
          <input type="range" min="-4" max="18" step="0.5" v-model.number="controls.angleOfAttack" @input="stopAutoModes" />
          <strong>{{ formatNumber(controls.angleOfAttack, 1) }}°</strong>
        </label>

        <label class="control compact">
          <span>襟翼</span>
          <select v-model.number="controls.flaps" @change="stopAutoModes">
            <option :value="0">收起</option>
            <option :value="1">起飞</option>
            <option :value="2">降落</option>
          </select>
        </label>

        <label class="control">
          <span><Wind :size="15" />风速</span>
          <input type="range" min="-15" max="22" step="1" v-model.number="controls.wind" @input="stopAutoModes" />
          <strong>{{ formatNumber(controls.wind, 0) }} m/s</strong>
        </label>

        <label class="switch-control">
          <input type="checkbox" v-model="controls.gearDown" @change="stopAutoModes" />
          <span>起落架</span>
        </label>

        <label class="switch-control">
          <input type="checkbox" v-model="controls.windShear" @change="stopAutoModes" />
          <span>风切变</span>
        </label>

        <label class="switch-control">
          <input type="checkbox" v-model="controls.windTunnel" @change="stopAutoModes" />
          <span>实时风洞气流</span>
        </label>

        <label class="switch-control danger-switch">
          <input type="checkbox" v-model="controls.engineFailure" @change="stopAutoModes" />
          <span>单发失效</span>
        </label>

        <label class="control compact">
          <span>演示倍率</span>
          <select v-model.number="demoSpeed">
            <option :value="1">1x</option>
            <option :value="2">2x</option>
            <option :value="4">4x</option>
          </select>
        </label>

        <button class="deck-button" type="button" :class="{ active: demoMode }" @click="toggleDemo">
          <Sparkles :size="17" />
          自由演示
        </button>

        <button class="deck-button" type="button" @click="syncWithBackend" :disabled="syncing">
          <RadioTower :size="17" />
          {{ syncing ? '同步中' : 'Java 校验' }}
        </button>
      </section>
    </main>
  `
};

createApp(App).mount('#app');

function percent(value, max) {
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function toPolyline(points, key, maxValue) {
  if (points.length < 2) {
    return '';
  }
  const width = 260;
  const height = 140;
  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - Math.max(0, Math.min(1, point[key] / maxValue)) * 118 - 11;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

function buildProgramExplanation(program, cue, flight, controls, completed) {
  const entry = explanationLibrary[program.id]?.[cue.stepIndex] || {
    title: cue.step.label,
    principle: program.description,
    watch: '观察速度、高度和四种力的实时变化。'
  };
  const flapText = ['收起', '起飞档', '降落档'][Number(controls.flaps)] || '未知';
  const emergencyText = controls.engineFailure ? '，单发失效已触发' : '';
  const tunnelText = controls.windTunnel ? '，实时风洞气流开启' : '';
  return {
    eyebrow: completed ? '示例完成' : `第 ${cue.stepIndex + 1} 步 / ${program.steps.length}`,
    title: entry.title,
    action: cue.step.label,
    principle: entry.principle,
    watch: entry.watch,
    live: `当前速度 ${formatNumber(flight.speed, 1)} m/s，高度 ${formatNumber(flight.altitude, 0)} m，迎角 ${formatNumber(controls.angleOfAttack, 1)}°，襟翼 ${flapText}${emergencyText}${tunnelText}。`
  };
}

function isFormTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return ['input', 'select', 'textarea'].includes(tagName);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
