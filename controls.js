import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { focusPlanet } from './sistemasolar.js';

const planetNames = [
  "Sol", // índice 0 = visão geral
  "Mercúrio",
  "Vênus",
  "Terra",
  "Marte",
  "Júpiter",
  "Saturno",
  "Urano",
  "Netuno",
  "Plutão"
];

const aspectRatio = window.innerWidth / window.innerHeight
export const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 100000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });

// Controles
export const controls = new OrbitControls(camera, renderer.domElement);
document.body.appendChild(renderer.domElement);

export let timeStop = false
export let timeStep = 0.01

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    timeStop = !timeStop;
  } else if (event.key === '+') {
    timeStep *= 1.2;
    updateSpeedDisplay();
  } else if (event.key === '-') {
    timeStep /= 1.2;
    updateSpeedDisplay();
  }
});

window.addEventListener('keydown', (e) => {
  const index = parseInt(e.key);
  if (!isNaN(index) && index >= 0 && index <= 9) {
    planetFocus = index
    if(planetFocus == 0) {
        controls.enabled = true
        camera.position.set(220, 220, 220)
        controls.target.set(0, 0, 0)
        controls.update()
    } else {
        controls.enabled = false
        focusPlanet(planetFocus)
    }
  }
});

export let planetFocus = 0

// Criação dos botões
const buttonContainer = document.getElementById('planet-buttons');

planetNames.forEach((name, index) => {
  const button = document.createElement('button');
  button.innerText = name;
  button.addEventListener('click', () => {
    planetFocus = index;
    if (planetFocus === 0) {
      controls.enabled = true;
      camera.position.set(220, 220, 220);
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      controls.enabled = false;
      focusPlanet(planetFocus);
    }
  });
  buttonContainer.appendChild(button);
});


const speedDisplay = document.createElement('div');
speedDisplay.id = 'speed-display';
speedDisplay.style.position = 'absolute';
speedDisplay.style.top = '10px';
speedDisplay.style.right = '10px';
speedDisplay.style.padding = '6px 12px';
speedDisplay.style.background = 'rgba(0, 0, 0, 0.5)';
speedDisplay.style.color = 'white';
speedDisplay.style.fontFamily = 'monospace';
speedDisplay.style.fontSize = '14px';
speedDisplay.style.borderRadius = '4px';
speedDisplay.style.zIndex = 20;
document.body.appendChild(speedDisplay);

function updateSpeedDisplay() {
  speedDisplay.textContent = `Velocidade: ${timeStep.toFixed(4)}`;
}
updateSpeedDisplay();