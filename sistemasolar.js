import * as THREE from 'three';
import { controls, timeStep, timeStop, camera, renderer, planetFocus } from './controls.js';

// Alguns Parâmetros 
const scale = 10 // Mudar isso para caso precisar ver os planetas melhor ( realista = 1 )
const sunSize = 110 // Padrão ( 110 )
let time = 200 // Coloquei 200 para já dar uma espalhada. No 0 eles vão estar todos alinhados

// Cena
const scene = new THREE.Scene();

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

renderer.setSize(window.innerWidth , window.innerHeight);
camera.position.set(sunSize * 2, sunSize * 2, sunSize * 2);

camera.lookAt(0, 0, 0);

// Utilitários
const textureLoader = new THREE.TextureLoader();

function getTexture(name) {
    if(!name) return null
    if(name.includes('/')){
        let caminho = name.split('/')
        return textureLoader.load(`textures/${caminho[0]}/${caminho[1]}.png`)
    }
    return textureLoader.load(`textures/${name}.png`)
}

export function focusPlanet(planetFocus) {
    if(planetFocus == 0) return

    const system = planetSystem.list[planetFocus - 1]
    const position = system.systemObject.position.clone()

    const direction = position.clone().normalize();
    direction.y += 0.5

    const cameraPos = position.clone().add(direction.multiplyScalar(system.size * 3 * scale));
    camera.position.copy(cameraPos);

    controls.target.copy(position)
    controls.update()
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Fundo
const skySphere = new THREE.SphereGeometry(40000, 60, 40)

const skyMaterial = new THREE.MeshBasicMaterial({
  map: getTexture("universo2"),
  side: 2,
  color: 0x555555
});

const skyBox = new THREE.Mesh(skySphere, skyMaterial);
scene.add(skyBox)

// Sol
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sunSize), 
    new THREE.MeshBasicMaterial({ map: getTexture("sol") })
)

const sunGlowMaterial = new THREE.SpriteMaterial({
    map: getTexture("sol_glow_gradient"),
    color: 0xffff00, 
    blending: THREE.AdditiveBlending, 
    transparent: true,
});

const sunGlowSprite = new THREE.Sprite(sunGlowMaterial);
sunGlowSprite.scale.set(sunSize * 3.5, sunSize * 3.5, 1);

const glowBig = new THREE.Sprite( new THREE.SpriteMaterial({
    map: getTexture("sol_glow_gradient"),
    color: 0xffff00, 
    transparent: true,
}))

glowBig.scale.set(sunSize * 15, sunSize * 15, 1)
glowBig.material.opacity = 0.1

scene.add(sun)
scene.add(sunGlowSprite)
scene.add(glowBig)

// Luz
const sunLight = new THREE.PointLight(0xffffff, 1, 0, 0);
sunLight.castShadow = true
scene.add(sunLight);

const weakLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(weakLight)

// Sistemas
class planetSystem {
    static list = []

    constructor(size, textures, movementData, moonData, ringData) {
        this.size = size
        this.movementData = movementData
        this.moonData = moonData
        this.moonData = moonData
        this.moonList = []

        let [texture, bumpMap, specularMap, atmosphere, shininess] = textures

        const planetTexture = getTexture(texture);
        const planetTextureBump = getTexture(bumpMap);
        const planetTextureSpecular = getTexture(specularMap);
        
        const terraMaterial = new THREE.MeshPhongMaterial({
            map: planetTexture,
            bumpScale: 0.1,
            bumpMap: planetTextureBump,
            specularMap: planetTextureSpecular,
            specular: new THREE.Color('grey'),
            shininess
        })
        
        const planet = new THREE.Mesh(new THREE.SphereGeometry(), terraMaterial)
        planet.scale.set(size * scale, size * scale, size * scale)
        this.planetObject = planet

        const System = new THREE.Group()
        System.add(planet)

        if(atmosphere) {
            const atmosphereMaterial = new THREE.MeshPhongMaterial(
                { map: getTexture(atmosphere), alphaMap: getTexture(atmosphere), transparent: true }
            )
            const atmosphereObject = new THREE.Mesh(
                new THREE.SphereGeometry(1.05), atmosphereMaterial
            )

            atmosphereObject.scale.set(
                size * scale + 0.01, size * scale + 0.01, size * scale + 0.01
            )

            System.add(atmosphereObject)
            this.atmosphereObject = atmosphereObject
        }

        if(moonData) { 
            for (const moon of moonData) {
                let { moonTexture, moonSize, offset } = moon
            
                const moonMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(), 
                    new THREE.MeshPhongMaterial({ map: getTexture(moonTexture) })
                )

                moonMesh.position.y += offset * scale
                moonMesh.scale.set(moonSize * scale, moonSize * scale, moonSize * scale)

                System.add(moonMesh)
                this.moonList.push(moonMesh)
            }
        }

        if(ringData) {
            let { ringTexture, ringRadius, ringSize } = ringData

            const ring = new THREE.Mesh(
                new THREE.CylinderGeometry(ringRadius * scale, ringSize * scale, 0, 64, 1, true), 
                new THREE.MeshPhongMaterial(
                    { map: getTexture(ringTexture), side: 2, transparent: true }
                )
            )
            System.add(ring)
            this.ringObject = ring
        }
        
        System.receiveShadow = true
        planetSystem.list.push(this)
        this.systemObject = System  
        scene.add(System)
    }

    update(time) {
        let { sunDistance, sunSpeed, rotateSpeed } = this.movementData

        // 50 Vezes menor que a escala real
        this.systemObject.position.x = Math.cos(time * sunSpeed) * sunDistance * sunSize / 50 
        this.systemObject.position.z = Math.sin(time * sunSpeed) * sunDistance * sunSize / 50
        this.planetObject.rotation.y = -time * rotateSpeed

        if(this.moonData) {
            for (let i = 0; i < this.moonData.length; i++) {
                let { moonMovement } = this.moonData[i]
                let [moonSpeed, moonDistance, moonRotation] = moonMovement
                moonDistance += this.size
                this.moonList[i].rotation.y = time * moonRotation || 0
                this.moonList[i].position.x = Math.cos(time * moonSpeed) * moonDistance * scale 
                this.moonList[i].position.z = Math.sin(time * moonSpeed) * moonDistance * scale
            }
        }

        if(this.atmosphereObject) {
            this.atmosphereObject.rotation.y = -time * rotateSpeed * 1.2
        }

        if(this.ringObject) {
            this.ringObject.rotation.y = time * rotateSpeed * 1.1
        }

    }
}

// Mércurio
new planetSystem(
    0.38,
    ["mercurio", "", "", "", 0.1],
    { sunDistance: 83 , sunSpeed: 4.2, rotateSpeed: 0.5 },
)

// Vênus
new planetSystem(
    0.95,
    ["venus", "", "", "venus_atm", 0.1],
    { sunDistance: 155 , sunSpeed: 1.6, rotateSpeed: 0.5 },
)

// Terra
new planetSystem(
    1,
    ["terra", "terra_normal", "terra_specular", "nuvens", 10],
    { sunDistance: 215 , sunSpeed: 1, rotateSpeed: 10 },
    [{ moonTexture: "lua", moonSize: 0.2, offset: 0, moonMovement: [10, 4, 5]}]
)

// Marte
new planetSystem(
    0.53,
    ["marte", "", "", "", 0.1],
    { sunDistance: 327 , sunSpeed: 0.5, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_marte/deimos_texture", moonSize: 0.2, offset: 0, moonMovement: [10, 4]},
    { moonTexture: "luas_marte/phobos_texture", moonSize: 0.5, offset: 1, moonMovement: [2, 10]}
]
)

// Júpiter
new planetSystem(
    11.21,
    ["jupiter", "", "", "", 0.1],
    { sunDistance: 1120 , sunSpeed: 0.084, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_jupiter/europa_texture", moonSize: 0.2, offset: 0, moonMovement: [10, 4]},
    { moonTexture: "luas_jupiter/calisto_texture", moonSize: 0.8, offset: -5, moonMovement: [8, 10]},
    { moonTexture: "luas_jupiter/ganymede_texture", moonSize: 0.6, offset: 3, moonMovement: [4, 4]},
    { moonTexture: "luas_jupiter/io_texture", moonSize: 0.5, offset: 1, moonMovement: [10, 3]}]
)

// Saturno
new planetSystem(
    9.45,
    ["saturno", "", "", "", 0.1],
    { sunDistance: 2060 , sunSpeed: 0.034, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_saturno/titan_texture", moonSize: 0.2, offset: 3, moonMovement: [10, 4]},
    { moonTexture: "luas_saturno/enceladus_texture", moonSize: 0.8, offset: -4, moonMovement: [8, 10]},
    { moonTexture: "luas_saturno/mimas_texture", moonSize: 0.6, offset: 6, moonMovement: [10, 6]},
    { moonTexture: "luas_saturno/dione_texture", moonSize: 0.4, offset: 3, moonMovement: [10, 8]}],
    { ringTexture: "saturno_anel", ringSize: 20, ringRadius: 10.5 }
)

// Urano
new planetSystem(
    4.01,
    ["urano", "", "", "", 0.1],
    { sunDistance: 4100 , sunSpeed: 0.012, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_urano/titania_texture", moonSize: 0.4, offset: 0, moonMovement: [2, 4]},
    { moonTexture: "luas_urano/miranda_texture", moonSize: 0.2, offset: 2, moonMovement: [4, 4]}]
)

// Netuno
new planetSystem(
    3.88,
    ["netuno", "", "", "", 0.1],
    { sunDistance: 6450 , sunSpeed: 0.006, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_netuno/triton_texture", moonSize: 0.09, offset: -1, moonMovement: [4, 4]}]
)

// Plutão ( Menção Honrosa )
new planetSystem(
    0.19,
    ["plutao", "", "", "", 0.1],
    { sunDistance: 8500 , sunSpeed: 0.004, rotateSpeed: 0.5 },
    [{ moonTexture: "luas_plutao/caronte_texture", moonSize: 0.095, offset: 0, moonMovement: [10, 3]}]
)

// Cinturão de Asteróides
const asteroidCount = 5000;
const innerRadius = 451;
const outerRadius = 710;
const asteroidTexture = getTexture("asteroide")

const asteroidGroup = new THREE.Group();

for (let i = 0; i < asteroidCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const height = (Math.random() - 0.5) * 40;

    const x = Math.cos(angle) * radius * sunSize / 50;
    const y = height;
    const z = Math.sin(angle) * radius * sunSize / 50;

    const size = 0.01 + Math.random() * 0.2;

    const asteroid = new THREE.Mesh(
        new THREE.SphereGeometry(1, Math.round(rand(8, 4)), Math.round(rand(8, 4))), 
        new THREE.MeshPhongMaterial({ map: asteroidTexture })
    );

    asteroid.position.set(x, y, z);
    asteroid.scale.set(
        size * scale * rand(0.3, 1),
        size * scale * rand(0.3, 1),
        size * scale * rand(0.3, 1)
    );

    asteroidGroup.add(asteroid);
}

scene.add(asteroidGroup);

// Movimento
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    
    controls.enabled = timeStop || planetFocus == 0
    if(timeStop) return

    time += timeStep;
    sun.rotation.y = time * 0.25
    
    planetSystem.list.forEach((system) => system.update(time))
    focusPlanet(planetFocus)

    asteroidGroup.rotation.y = time * 0.1

    sunGlowMaterial.opacity = 0.8 + Math.cos(time) * 0.2
    sunGlowMaterial.color.g = 0.2 + Math.abs(Math.cos(time)) * 0.3
}

animate()