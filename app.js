const canvas = document.querySelector('#ring');
const g = canvas.getContext('2d');
const surface = document.querySelector('#instrument');
const note = document.querySelector('#note');
const projectTitle = document.querySelector('#projectTitle');
const projectText = document.querySelector('#projectText');
const nodes = Array.from(document.querySelectorAll('.node'));
const modal = document.querySelector('#projectModal');
const closeModalButton = document.querySelector('.close-modal');
const modalTitle = document.querySelector('#modalTitle');
const modalSummary = document.querySelector('#modalSummary');
const modalVisuals = Array.from(document.querySelectorAll('.modal-visual'));

let w = innerWidth;
let h = innerHeight;
let x = 0.5;
let y = 0.5;
let active = false;
let energy = 0;
let phase = 0;
let last = 0;
let audio, volume, osc, second, harmonic, filter;

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const projectData = {
  hatci: { title: 'HATCI Voice', summary: 'In-cabin speech intelligence under road, HVAC, and weather noise.', visual: 'hatci' },
  conformal: { title: 'ConformalMOS', summary: 'Uncertainty-aware speech quality prediction with calibrated confidence.', visual: 'conformal' },
  mvd: { title: 'Resource-Aware ML', summary: 'Minimum viable data and efficient systems that stay robust in deployment.', visual: 'mvd' },
  acoustic: { title: 'Acoustic Sensing', summary: 'Real-world diagnostics from everyday tools, devices, and signals.', visual: 'acoustic' }
};

function updateHud() {
  const driftX = (x - 0.5) * 28;
  const driftY = (y - 0.5) * 18;

  nodes.forEach((node, index) => {
    const offset = index % 2 === 0 ? 1 : -1;
    const tx = driftX * (index * 0.3 + 0.8) + offset * 8;
    const ty = driftY * (index * 0.35 + 0.7) + (active ? 3 : 0);
    node.style.transform = `translate(${tx}px, ${ty}px)`;
  });
}

let activeIndex = 0;

function setActiveNode(index) {
  activeIndex = index;
  const node = nodes[index];
  if (!node) return;
  const title = node.dataset.title;
  const text = node.dataset.text;
  projectTitle.textContent = title;
  projectText.textContent = text;
  nodes.forEach((item, idx) => item.classList.toggle('active', idx === index));
}

function openProject(projectKey) {
  const data = projectData[projectKey];
  if (!data) return;

  modalTitle.textContent = data.title;
  modalSummary.textContent = data.summary;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  modalVisuals.forEach((scene) => {
    const isActive = scene.dataset.scene === data.visual;
    scene.classList.toggle('active', isActive);
  });
}

function closeProject() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

nodes.forEach((node, index) => {
  node.addEventListener('pointerenter', () => setActiveNode(index));
  node.addEventListener('focus', () => setActiveNode(index));
  node.addEventListener('click', () => openProject(node.dataset.project));
});

closeModalButton.addEventListener('click', closeProject);
modal.addEventListener('click', (e) => {
  if (e.target.dataset.close === 'true') closeProject();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeProject();
});

function resize() {
  w = innerWidth;
  h = innerHeight;
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * d;
  canvas.height = h * d;
  g.setTransform(d, 0, 0, d, 0, 0);
  updateOrbit();
}

addEventListener('resize', resize);
resize();

function frequency() {
  return 90 * Math.pow(6, x);
}

function tune() {
  if (!audio) return;
  const t = audio.currentTime;
  const f = frequency();
  osc.frequency.setTargetAtTime(f, t, 0.08);
  second.frequency.setTargetAtTime(f * 2.003, t, 0.08);
  harmonic.gain.setTargetAtTime(0.02 + y * 0.12, t, 0.08);
  filter.frequency.setTargetAtTime(400 + y * 2200, t, 0.08);
  note.textContent = `${Math.round(f)} Hz`;
}

async function start() {
  active = true;
  document.body.classList.add('playing');

  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      volume = audio.createGain();
      volume.gain.value = 0;
      volume.connect(audio.destination);

      filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.connect(volume);

      osc = audio.createOscillator();
      osc.type = 'sine';
      const gain = audio.createGain();
      gain.gain.value = 0.25;
      osc.connect(gain).connect(filter);
      osc.start();

      second = audio.createOscillator();
      second.type = 'triangle';
      harmonic = audio.createGain();
      second.connect(harmonic).connect(filter);
      second.start();
    }

    await audio.resume();
    if (active) {
      tune();
      volume.gain.setTargetAtTime(0.38, audio.currentTime, 0.12);
    }
  } catch {
    document.querySelector('#hint').textContent = 'Sound is unavailable in this browser. You can still play with the ring.';
  }
}

function stop() {
  active = false;
  document.body.classList.remove('playing');
  if (audio) volume.gain.setTargetAtTime(0, audio.currentTime, 0.12);
  note.textContent = '';
}

function point(e) {
  const rect = surface.getBoundingClientRect();
  x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  if (active) tune();
}

surface.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  surface.setPointerCapture(e.pointerId);
  point(e);
  start();
});

surface.addEventListener('pointermove', point);
surface.addEventListener('pointerup', stop);
surface.addEventListener('pointercancel', stop);
surface.addEventListener('lostpointercapture', stop);

surface.addEventListener('keydown', (e) => {
  if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start();
  if (e.key === 'ArrowLeft') x = Math.max(0, x - 0.03);
  if (e.key === 'ArrowRight') x = Math.min(1, x + 0.03);
  if (e.key === 'ArrowUp') y = Math.min(1, y + 0.05);
  if (e.key === 'ArrowDown') y = Math.max(0, y - 0.05);
  if (active) tune();
});

surface.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.key === 'Enter') stop();
});

surface.addEventListener('blur', stop);
addEventListener('blur', stop);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});

function updateOrbit() {
  const orbitRadius = Math.min(w, h) * 0.22;
  const centerX = w / 2;
  const centerY = h / 2;
  const baseAngles = [0.4, 1.3, 2.3, 3.6];

  nodes.forEach((node, index) => {
    const angle = baseAngles[index] + phase * 0.3;
    const px = centerX + Math.cos(angle) * orbitRadius;
    const py = centerY + Math.sin(angle) * orbitRadius * 0.9;
    node.style.left = `${px}px`;
    node.style.top = `${py}px`;
    const activeNode = Number(node.dataset.index) === activeIndex;
    node.classList.toggle('active', activeNode);
  });
}

function frame(time) {
  const dt = Math.min((time - last) / 1000, 0.05);
  last = time;

  energy += (Number(active) - energy) * Math.min(1, dt * 7);
  if (!reduced) phase += dt * (0.5 + energy * 2.2);

  g.clearRect(0, 0, w, h);

  const r = Math.min(w * 0.34, h * 0.28, 220);
  const cx = w / 2;
  const cy = h / 2;
  const breath = 0.96 + Math.sin(phase * 1.2) * 0.06 + energy * 0.13;

  for (let layer = 0; layer < 8; layer += 1) {
    g.beginPath();

    for (let i = 0; i <= 640; i += 1) {
      const a = (i / 640) * Math.PI * 2;
      const env = Math.pow(0.5 + 0.5 * Math.sin(a * 3 - phase), 2);
      const ripple = Math.sin(a * (14 + Math.round(x * 18)) + phase * 3 + layer * 0.38) * (2.2 + energy * (11 + y * 18)) * env;
      const rr = (r * breath) + layer * 2.1 + ripple + Math.sin(a * 2 + phase + layer) * 2.2;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;

      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }

    const alpha = 0.12 + layer * 0.04 + energy * 0.09;
    g.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    g.lineWidth = layer === 0 ? 1.2 : 0.8;
    g.stroke();
  }

  if (active || energy > 0.01) {
    const angle = x * Math.PI * 2 - Math.PI / 2;
    const dotRadius = 2.6 + energy * 1.9;
    const pulseX = cx + Math.cos(angle) * (r * 0.98);
    const pulseY = cy + Math.sin(angle) * (r * 0.98);

    g.beginPath();
    g.arc(pulseX, pulseY, dotRadius, 0, Math.PI * 2);
    g.fillStyle = `rgba(255,255,255,${0.5 + energy * 0.5})`;
    g.fill();
  }

  updateOrbit();
  updateHud();
  requestAnimationFrame(frame);
}

setActiveNode(0);
requestAnimationFrame(frame);
