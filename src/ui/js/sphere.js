import * as THREE from "./three.js/build/three.module.js";
import { EffectComposer } from "./three.js/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./three.js/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./three.js/examples/jsm/postprocessing/UnrealBloomPass.js";

class ThreeScene {
    constructor() {
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.composer = null;
        this.mouse = { x: 0, y: 0 };
        this.params = {
            exposure: 1,
            bloomStrength: 2,
            bloomThreshold: 0,
            bloomRadius: 0,
        };
        this.init();
    }

    init() {
        this.initializeScene();
        this.addListeners();
    }

    initializeScene() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10);
        this.camera.position.z = 1.5;

        this.scene = new THREE.Scene();
        this.scene.rotation.x = -0.1;

        const geometry = this.createGeometry();
        const material = new THREE.PointsMaterial({ color: 0x888888, size: 0.003, vertexColors: true });
        const points = new THREE.Points(geometry, material);

        this.scene.add(points);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(() => this.render());
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;

        document.body.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.zIndex = "-1";
        this.renderer.domElement.style.position = "fixed";

        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = this.params.bloomThreshold;
        bloomPass.strength = this.params.bloomStrength;
        bloomPass.radius = this.params.bloomRadius;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
    }

    createGeometry() {

        const geometry = new THREE.BufferGeometry();
        const n = 100000;

        const positions = [];
        const colors = [];
        const color = new THREE.Color();
        const phi = Math.PI * (3. - Math.sqrt(5.));  // golden angle in radians

        for (let i = 0; i < n; i++) {

            // positions
            const y = 1 - (i / (n - 1)) * 2;
            let radiusI = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.sin(theta) * radiusI;
            const z = Math.cos(theta) * radiusI;

            positions.push(x, y, z);

            // colors
            radiusI = Math.sqrt(radiusI);
            const R = Math.max(y, z) + 1;
            const G = Math.max(x, z) - .3;
            const B = Math.max(y, x) - .6;
            const dim = 1;

            color.setRGB(R * dim, G * dim, B * dim);

            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();

        return geometry;
    }

    render() {
        this.scene.rotation.y += 0.001;
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.composer.render();
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(evt) {
        evt.preventDefault();
        let deltaX = evt.clientX - this.mouse.x,
            deltaY = evt.clientY - this.mouse.y;

        this.mouse.x = evt.clientX;
        this.mouse.y = evt.clientY;

        this.rotateScene(deltaX, deltaY);
    }

    rotateScene(deltaX, deltaY) {
        this.scene.rotation.y += deltaX / 20000;
        this.scene.rotation.x += deltaY / 10000;
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    addListeners() {
        document.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        document.addEventListener("contextmenu", this.onContextMenu.bind(this), false);
        window.addEventListener("resize", this.resize.bind(this));
    }

}

new ThreeScene();