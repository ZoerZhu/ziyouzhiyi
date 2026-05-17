const MASS_KG = 1200;
const GRAVITY = 9.81;
const WING_AREA = 16.2;
const MAX_THRUST = 5400;

export const localSteps = [
  {
    id: 1,
    title: '加速滑跑',
    goal: '把油门推到 70% 以上，观察速度上升。',
    hint: '推力大于阻力时，飞机会沿跑道加速。'
  },
  {
    id: 2,
    title: '建立升力',
    goal: '速度超过 28 m/s 后，把迎角调到 6° 到 9°。',
    hint: '迎角提高会增加升力，但也会带来更多阻力。'
  },
  {
    id: 3,
    title: '离地爬升',
    goal: '保持升力大于重力，让高度稳定增加。',
    hint: '爬升阶段需要足够推力和不过大的迎角。'
  },
  {
    id: 4,
    title: '进入巡航',
    goal: '收起起落架，降低襟翼，调整到较小迎角。',
    hint: '巡航时四种力接近平衡，飞机状态最稳定。'
  },
  {
    id: 5,
    title: '柔和降落',
    goal: '放下起落架和襟翼，降低油门，控制小幅下降。',
    hint: '降落需要保留足够速度，避免失速。'
  }
];

export function createInitialFlight() {
  return {
    elapsed: 0,
    speed: 0,
    airspeed: 0,
    altitude: 0,
    distance: 0,
    verticalSpeed: 0,
    pitch: 0,
    lift: 0,
    drag: 0,
    thrust: 0,
    weight: MASS_KG * GRAVITY,
    stallRisk: 0,
    phase: '地面滑跑',
    feedback: '推高油门，观察推力如何改变速度。'
  };
}

export const flightPrograms = [
  {
    id: 'standard',
    title: '标准起飞',
    subtitle: '滑跑、抬轮、收构型',
    description: '从跑道静止开始，演示轻型飞机的标准起飞和初始爬升动作。',
    duration: 34,
    preset: null,
    startControls: {
      throttle: 34,
      angleOfAttack: 3,
      flaps: 1,
      gearDown: true,
      wind: 3,
      windShear: false,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 6, label: '起飞前稳定方向，襟翼一档，逐步推油门。', throttle: 72, angleOfAttack: 3.5, flaps: 1, gearDown: true },
      { until: 13, label: '继续加速，保持小迎角让速度先建立。', throttle: 88, angleOfAttack: 4.5, flaps: 1, gearDown: true },
      { until: 21, label: '速度达到抬轮区间，轻柔增加迎角。', throttle: 92, angleOfAttack: 8, flaps: 1, gearDown: true },
      { until: 28, label: '确认爬升率为正，收起起落架减小阻力。', throttle: 82, angleOfAttack: 7, flaps: 1, gearDown: false },
      { until: 34, label: '减小迎角并收襟翼，进入稳定爬升。', throttle: 68, angleOfAttack: 5, flaps: 0, gearDown: false }
    ]
  },
  {
    id: 'cruise',
    title: '巡航配平',
    subtitle: '四力接近平衡',
    description: '从空中状态开始，演示巡航时如何让升力、重力、推力和阻力接近平衡。',
    duration: 28,
    preset: {
      speed: 58,
      airspeed: 58,
      altitude: 118,
      distance: 1900,
      verticalSpeed: 0.2,
      pitch: 3,
      phase: '巡航',
      feedback: '巡航的目标不是继续猛烈爬升，而是让四种力尽量平衡。'
    },
    startControls: {
      throttle: 58,
      angleOfAttack: 4,
      flaps: 0,
      gearDown: false,
      wind: 5,
      windShear: false,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 7, label: '保持小迎角，先观察高度和速度是否稳定。', throttle: 56, angleOfAttack: 4, flaps: 0, gearDown: false },
      { until: 15, label: '如果速度偏高，略收油门，让推力接近阻力。', throttle: 50, angleOfAttack: 3.5, flaps: 0, gearDown: false },
      { until: 22, label: '用小幅迎角修正高度，不做大幅拉杆。', throttle: 53, angleOfAttack: 4.2, flaps: 0, gearDown: false },
      { until: 28, label: '维持巡航构型，观察四力条趋于稳定。', throttle: 52, angleOfAttack: 4, flaps: 0, gearDown: false }
    ]
  },
  {
    id: 'level-flight',
    title: '保持高度平飞',
    subtitle: '稳住高度、微调油门',
    description: '从中低空稳定飞行开始，演示如何把垂直速度压到接近 0，持续保持高度。',
    duration: 26,
    preset: {
      speed: 54,
      airspeed: 54,
      altitude: 92,
      distance: 2140,
      verticalSpeed: 0.4,
      pitch: 3,
      phase: '巡航',
      feedback: '平飞的关键不是继续爬升，而是让高度变化率尽量接近 0。'
    },
    startControls: {
      throttle: 54,
      angleOfAttack: 4.2,
      flaps: 0,
      gearDown: false,
      wind: 4,
      windShear: false,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 6, label: '先观察高度和垂直速度，确认飞机没有明显上冲或下坠。', throttle: 54, angleOfAttack: 4.1, flaps: 0, gearDown: false },
      { until: 13, label: '如果还有轻微爬升，略收油门并减小迎角。', throttle: 51, angleOfAttack: 3.8, flaps: 0, gearDown: false },
      { until: 20, label: '当高度略有下降时，再做很小幅度修正，不要大动作拉杆。', throttle: 53, angleOfAttack: 4.1, flaps: 0, gearDown: false },
      { until: 26, label: '维持干净构型，让垂直速度接近 0，保持持续平飞。', throttle: 52, angleOfAttack: 4, flaps: 0, gearDown: false }
    ]
  },
  {
    id: 'landing',
    title: '柔和降落',
    subtitle: '进近、放构型、拉平',
    description: '从近进场高度开始，演示如何用油门和迎角控制下降率。',
    duration: 38,
    preset: {
      speed: 42,
      airspeed: 42,
      altitude: 56,
      distance: 2380,
      verticalSpeed: -1.4,
      pitch: 2,
      phase: '进近',
      feedback: '降落演示会跳转到进近跑道，先建立可控下降率，再在接近地面时柔和拉平。'
    },
    startControls: {
      throttle: 42,
      angleOfAttack: 4,
      flaps: 1,
      gearDown: false,
      wind: 2,
      windShear: false,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 7, label: '建立进近速度，先放下一档襟翼。', throttle: 38, angleOfAttack: 4, flaps: 1, gearDown: false },
      { until: 13, label: '放下起落架，接受额外阻力并补一点油门。', throttle: 42, angleOfAttack: 4.5, flaps: 1, gearDown: true },
      { until: 22, label: '放降落襟翼，控制小幅下降而不是俯冲。', throttle: 32, angleOfAttack: 5, flaps: 2, gearDown: true },
      { until: 31, label: '接近地面前降低下降率，保持浅下滑而不是机头过高。', throttle: 28, angleOfAttack: 5.4, flaps: 2, gearDown: true },
      { until: 35, label: '接地前轻柔拉平，逐步收油门，不要做成垂直下沉。', throttle: 16, angleOfAttack: 5.8, flaps: 2, gearDown: true },
      { until: 38, label: '接地后保持跑道方向，收小迎角并滑跑减速。', throttle: 0, angleOfAttack: 2.5, flaps: 2, gearDown: true }
    ]
  },
  {
    id: 'wind-shear',
    title: '风切变修正',
    subtitle: '稳定姿态优先',
    description: '从低空爬升开始加入风切变，演示正确恢复动作：稳住姿态、增加推力、避免过大迎角。',
    duration: 30,
    preset: {
      speed: 46,
      airspeed: 46,
      altitude: 68,
      distance: 1350,
      verticalSpeed: 1.2,
      pitch: 5,
      phase: '爬升',
      feedback: '风切变会让空速突然波动，恢复时不要粗暴拉大迎角。'
    },
    startControls: {
      throttle: 64,
      angleOfAttack: 6,
      flaps: 1,
      gearDown: false,
      wind: 6,
      windShear: true,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 5, label: '风速开始波动，保持当前姿态不要急拉机头。', throttle: 68, angleOfAttack: 6, flaps: 1, gearDown: false, windShear: true },
      { until: 12, label: '增加推力，先恢复能量，再微调俯仰。', throttle: 88, angleOfAttack: 6.5, flaps: 1, gearDown: false, windShear: true },
      { until: 20, label: '迎角保持在安全范围，避免进入失速区。', throttle: 84, angleOfAttack: 6, flaps: 1, gearDown: false, windShear: true },
      { until: 30, label: '空速稳定后逐步回到正常爬升构型。', throttle: 70, angleOfAttack: 5, flaps: 0, gearDown: false, windShear: false }
    ]
  },
  {
    id: 'engine-failure',
    title: '单发失效',
    subtitle: '低头保速、构型减阻',
    description: '从低空爬升状态开始，模拟一台发动机失效后的应急处置。',
    duration: 34,
    preset: {
      speed: 52,
      airspeed: 52,
      altitude: 96,
      distance: 1180,
      verticalSpeed: 0.8,
      pitch: 5,
      phase: '应急处置',
      feedback: '发动机失效后不要急拉机头，先用姿态保住空速。'
    },
    startControls: {
      throttle: 72,
      angleOfAttack: 6,
      flaps: 1,
      gearDown: false,
      wind: 3,
      windShear: false,
      windTunnel: false,
      engineFailure: true
    },
    steps: [
      { until: 5, label: '识别推力突然下降，保持机翼水平并稳住方向。', throttle: 76, angleOfAttack: 5.5, flaps: 1, gearDown: false, engineFailure: true },
      { until: 12, label: '略微低头，把迎角降到安全范围，优先保住空速。', throttle: 82, angleOfAttack: 3.5, flaps: 0, gearDown: false, engineFailure: true },
      { until: 20, label: '收起多余构型减小阻力，建立最佳滑翔速度。', throttle: 86, angleOfAttack: 3, flaps: 0, gearDown: false, engineFailure: true },
      { until: 28, label: '选择就近跑道或备降区域，保持可控下降率。', throttle: 72, angleOfAttack: 4, flaps: 0, gearDown: false, engineFailure: true },
      { until: 34, label: '接近跑道再放起落架和襟翼，避免过早增加阻力。', throttle: 48, angleOfAttack: 5, flaps: 1, gearDown: true, engineFailure: true }
    ]
  },
  {
    id: 'stall-recovery',
    title: '失速改出',
    subtitle: '减小迎角、恢复空速',
    description: '模拟迎角过大导致失速风险升高时的标准改出动作。',
    duration: 28,
    preset: {
      speed: 31,
      airspeed: 31,
      altitude: 116,
      distance: 1620,
      verticalSpeed: -1.2,
      pitch: 12,
      phase: '失速风险',
      feedback: '迎角过大时气流会分离，第一动作是减小迎角。'
    },
    startControls: {
      throttle: 48,
      angleOfAttack: 15,
      flaps: 1,
      gearDown: false,
      wind: 2,
      windShear: false,
      windTunnel: true,
      engineFailure: false
    },
    steps: [
      { until: 5, label: '立即减小迎角，让机翼重新获得附着气流。', throttle: 62, angleOfAttack: 8, flaps: 1, gearDown: false, windTunnel: true },
      { until: 11, label: '增加推力恢复能量，但不要再次大幅拉杆。', throttle: 92, angleOfAttack: 5, flaps: 1, gearDown: false, windTunnel: true },
      { until: 18, label: '速度恢复后逐步收襟翼，减少阻力。', throttle: 82, angleOfAttack: 4, flaps: 0, gearDown: false, windTunnel: true },
      { until: 28, label: '建立正常爬升姿态，确认失速风险回落。', throttle: 70, angleOfAttack: 5, flaps: 0, gearDown: false, windTunnel: false }
    ]
  },
  {
    id: 'go-around',
    title: '复飞程序',
    subtitle: '不稳定进近中止降落',
    description: '演示进近不稳定时如何放弃降落，转入安全爬升。',
    duration: 30,
    preset: {
      speed: 40,
      airspeed: 40,
      altitude: 42,
      distance: 3010,
      verticalSpeed: -1.8,
      pitch: 1,
      phase: '进近',
      feedback: '如果进近速度或下降率不稳定，应果断复飞。'
    },
    startControls: {
      throttle: 30,
      angleOfAttack: 4,
      flaps: 2,
      gearDown: true,
      wind: 4,
      windShear: true,
      windTunnel: false,
      engineFailure: false
    },
    steps: [
      { until: 5, label: '判断进近不稳定，立即推大油门。', throttle: 92, angleOfAttack: 5, flaps: 2, gearDown: true, windShear: true },
      { until: 11, label: '建立正爬升率，保持跑道方向。', throttle: 94, angleOfAttack: 7, flaps: 1, gearDown: true, windShear: true },
      { until: 18, label: '确认爬升稳定后收起起落架。', throttle: 88, angleOfAttack: 6, flaps: 1, gearDown: false, windShear: false },
      { until: 30, label: '逐步收襟翼，转入标准爬升。', throttle: 76, angleOfAttack: 5, flaps: 0, gearDown: false, windShear: false }
    ]
  }
];

export function updateFlight(flight, controls, deltaSeconds) {
  const dt = clamp(deltaSeconds, 0.02, 0.35);
  flight.elapsed += dt;

  const throttle = clamp(Number(controls.throttle), 0, 100);
  const angleOfAttack = clamp(Number(controls.angleOfAttack), -4, 18);
  const flaps = clamp(Number(controls.flaps), 0, 2);
  const gearDown = Boolean(controls.gearDown);
  const engineFailure = Boolean(controls.engineFailure);
  const wind = clamp(Number(controls.wind), -15, 22);
  const gust = controls.windShear
    ? Math.sin(flight.elapsed * 2.3) * 9 + Math.sin(flight.elapsed * 5.1) * 3
    : 0;

  const airspeed = Math.max(0, flight.speed + wind + gust);
  const airDensity = 1.225 * Math.exp(-Math.max(flight.altitude, 0) / 8500);
  const flapLiftBonus = flaps === 0 ? 0 : flaps === 1 ? 0.22 : 0.42;
  const stallStart = 14 - flaps * 0.65;
  const stallRisk = clamp((angleOfAttack - stallStart) / 5, 0, 1);

  let liftCoefficient = 0.24 + angleOfAttack * 0.095 + flapLiftBonus;
  liftCoefficient *= 1 - stallRisk * 0.56;

  const dragCoefficient =
    0.028 +
    Math.pow(Math.max(angleOfAttack, 0), 2) * 0.0017 +
    flaps * 0.028 +
    (gearDown ? 0.035 : 0) +
    stallRisk * 0.12;

  const lift = 0.5 * airDensity * airspeed * airspeed * WING_AREA * liftCoefficient;
  const drag = 0.5 * airDensity * airspeed * airspeed * WING_AREA * dragCoefficient;
  const thrust = MAX_THRUST * (throttle / 100) * (engineFailure ? 0.48 : 1);
  const weight = MASS_KG * GRAVITY;
  const onGround = flight.altitude <= 0.05;
  const wheelBrake = onGround && throttle < 20
    ? weight * (gearDown ? 0.095 : 0.075) * (1 - throttle / 20)
    : 0;
  const rollingDrag = onGround ? weight * (gearDown ? 0.04 : 0.06) + wheelBrake : 0;
  const acceleration = (thrust - drag - rollingDrag) / MASS_KG;

  flight.speed = clamp(flight.speed + acceleration * dt, 0, 125);

  const canFly = flight.altitude > 0.1 || (lift > weight * 0.96 && flight.speed > 27);
  if (canFly) {
    let verticalAcceleration = ((lift - weight) / MASS_KG) * 0.55;
    verticalAcceleration += Math.sin(degToRad(angleOfAttack - 4)) * 2.2;
    if (throttle < 25) {
      verticalAcceleration -= 0.65;
    }
    if (stallRisk > 0.55) {
      verticalAcceleration -= stallRisk * 4.4;
    }
    flight.verticalSpeed = clamp(flight.verticalSpeed + verticalAcceleration * dt, -10, 12);
  } else {
    flight.verticalSpeed = 0;
  }

  flight.altitude += flight.verticalSpeed * dt;
  if (flight.altitude < 0) {
    flight.altitude = 0;
    flight.verticalSpeed = 0;
  }

  if (controls.landingAssist) {
    applyLandingAssist(flight, dt);
  }

  if (onGround) {
    flight.verticalSpeed = 0;
    if (throttle < 12 && flight.speed < 6) {
      flight.speed = Math.max(0, flight.speed - 12 * dt);
    }
    if (throttle < 8 && flight.speed < 1.2) {
      flight.speed = 0;
    }
  }

  flight.distance += flight.speed * dt;
  flight.airspeed = airspeed;
  flight.pitch = clamp(angleOfAttack * 0.55 + flight.verticalSpeed * 1.7, -9, 18);
  flight.lift = lift;
  flight.drag = drag;
  flight.thrust = thrust;
  flight.weight = weight;
  flight.stallRisk = stallRisk;
  flight.phase = phaseFor(flight, throttle, stallRisk);
  flight.feedback = feedbackFor(flight, controls);

  return flight;
}

export function applyDemoControls(controls, flight) {
  const t = flight.elapsed;
  if (t < 8) {
    controls.throttle = approach(controls.throttle, 78, 1.4);
    controls.angleOfAttack = approach(controls.angleOfAttack, 4, 0.16);
    controls.flaps = 1;
    controls.gearDown = true;
  } else if (t < 20) {
    controls.throttle = approach(controls.throttle, 88, 1.0);
    controls.angleOfAttack = approach(controls.angleOfAttack, 8, 0.12);
    controls.flaps = 1;
    controls.gearDown = true;
  } else if (t < 36) {
    controls.throttle = approach(controls.throttle, 58, 0.8);
    controls.angleOfAttack = approach(controls.angleOfAttack, 4, 0.1);
    controls.flaps = flight.altitude > 45 ? 0 : 1;
    controls.gearDown = flight.altitude < 28;
  } else if (t < 52) {
    controls.throttle = approach(controls.throttle, 34, 0.9);
    controls.angleOfAttack = approach(controls.angleOfAttack, 3, 0.1);
    controls.flaps = 1;
    controls.gearDown = flight.altitude < 95;
  } else {
    controls.throttle = approach(controls.throttle, 24, 0.9);
    controls.angleOfAttack = approach(controls.angleOfAttack, 5, 0.08);
    controls.flaps = 2;
    controls.gearDown = true;
  }
}

export function prepareProgram(programId, flight, controls) {
  const program = flightPrograms.find((item) => item.id === programId) || flightPrograms[0];
  Object.assign(flight, createInitialFlight(), program.preset || {});
  Object.assign(controls, program.startControls);
  controls.landingAssist = program.id === 'landing';
  return program;
}

export function applyProgramControls(controls, programId, programElapsed) {
  const program = flightPrograms.find((item) => item.id === programId) || flightPrograms[0];
  const foundIndex = program.steps.findIndex((item) => programElapsed <= item.until);
  const stepIndex = foundIndex >= 0 ? foundIndex : program.steps.length - 1;
  const step = program.steps[stepIndex] || program.steps[program.steps.length - 1];

  controls.throttle = approach(Number(controls.throttle), step.throttle, 1.15);
  controls.angleOfAttack = approach(Number(controls.angleOfAttack), step.angleOfAttack, 0.12);
  controls.flaps = step.flaps;
  controls.gearDown = step.gearDown;
  if (typeof step.windShear === 'boolean') {
    controls.windShear = step.windShear;
  }
  if (typeof step.windTunnel === 'boolean') {
    controls.windTunnel = step.windTunnel;
  }
  if (typeof step.engineFailure === 'boolean') {
    controls.engineFailure = step.engineFailure;
  }
  if (typeof step.wind === 'number') {
    controls.wind = approach(Number(controls.wind), step.wind, 0.4);
  }
  controls.landingAssist = program.id === 'landing';

  return {
    program,
    step,
    stepIndex,
    progress: clamp((programElapsed / program.duration) * 100, 0, 100)
  };
}

export function activeStepId(flight, controls) {
  if (flight.altitude > 45 && controls.flaps === 0 && !controls.gearDown) {
    return 4;
  }
  if (flight.altitude > 25 && controls.throttle < 40 && controls.gearDown) {
    return 5;
  }
  if (flight.altitude > 4) {
    return 3;
  }
  if (flight.speed > 24) {
    return 2;
  }
  return 1;
}

export function makeHistoryPoint(flight) {
  return {
    speed: flight.speed,
    altitude: flight.altitude,
    lift: flight.lift,
    time: flight.elapsed
  };
}

function phaseFor(flight, throttle, stallRisk) {
  if (stallRisk > 0.72 && flight.altitude > 5) {
    return '失速风险';
  }
  if (flight.altitude <= 0.2 && flight.speed < 25) {
    return '地面滑跑';
  }
  if (flight.altitude <= 0.5 && flight.speed >= 25) {
    return '抬轮临界';
  }
  if (flight.altitude <= 1.2 && flight.speed < 32 && throttle < 35) {
    return '着陆';
  }
  if (flight.verticalSpeed > 1.2 && flight.altitude < 260) {
    return '爬升';
  }
  if (flight.verticalSpeed < -1.2 && flight.altitude > 2) {
    return '进近';
  }
  if (flight.altitude > 70 && Math.abs(flight.verticalSpeed) < 1.25) {
    return '巡航';
  }
  return '姿态调整';
}

function feedbackFor(flight, controls) {
  if (flight.phase === '失速风险') {
    return '迎角偏大，气流分离会让升力突然下降。请降低迎角并恢复速度。';
  }
  if (controls.engineFailure) {
    return '发动机失效使有效推力明显下降，请减小阻力并保持安全空速。';
  }
  if (flight.lift < flight.weight * 0.82) {
    return '升力仍小于重力，继续加速或适度增大迎角。';
  }
  if (flight.thrust < flight.drag) {
    return '阻力已经超过推力，飞机会逐渐减速。';
  }
  if (controls.angleOfAttack > 12.5) {
    return '迎角越大不一定越安全，阻力和失速风险也会增加。';
  }
  if (!controls.gearDown && flight.altitude < 1) {
    return '起飞前保持起落架放下，离地后再收起以减少阻力。';
  }
  if (flight.lift > flight.weight && controls.throttle > 70) {
    return '升力超过重力，飞机已经具备离地和爬升条件。';
  }
  return '四种力越接近平衡，飞机姿态越稳定。';
}

function applyLandingAssist(flight, dt) {
  const t = flight.elapsed;
  const glideProgress = clamp(t / 31, 0, 1);
  const flareProgress = clamp((t - 31) / 4, 0, 1);
  const targetAltitude = t < 31
    ? 2.2 + 54 * Math.pow(1 - glideProgress, 1.08)
    : 2.2 * (1 - flareProgress);
  const glideDescentRate = -((54 * 1.08) / 31) * Math.pow(Math.max(0.001, 1 - glideProgress), 0.08);
  const flareDescentRate = -2.2 / 4;

  flight.altitude = t >= 35 ? 0 : targetAltitude;
  flight.verticalSpeed = t >= 35 ? 0 : t < 31 ? glideDescentRate : flareDescentRate;

  const targetSpeed = t < 28
    ? 42 - t * 0.45
    : t < 35
      ? 29.4 - (t - 28) * 1.15
      : Math.max(0, 21.35 - (t - 35) * 7.2);
  flight.speed = targetSpeed;
  if (t >= 38 && flight.speed < 1.6) {
    flight.speed = 0;
  }
}

function approach(current, target, step) {
  if (Math.abs(current - target) <= step) {
    return target;
  }
  return current + Math.sign(target - current) * step;
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
