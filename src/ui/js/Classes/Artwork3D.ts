import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface Artwork3DHandle {
    dispose: () => void;
}

/**
 * WebGL renderer for the CD artwork format: a jewel case (transparent plastic
 * shell, opaque tray, frosted plastic spine on the left, front cover with the
 * artwork) containing a CD disc whose label uses the same artwork. Colors are
 * derived from the active theme's CSS variables at render time. Callers are
 * responsible for disposing the handle (e.g. via `trackCleanup`) to free the
 * WebGL context.
 */
export function createCdJewelCase3D(canvas: HTMLCanvasElement, coverUrl: string, size: number | undefined): Artwork3DHandle {
    try {
        return initialize(canvas, coverUrl, size);
    } catch (error) {
        console.error("Failed to create 3D CD case", error);
        return { dispose: () => {} };
    }
}

function initialize(canvas: HTMLCanvasElement, coverUrl: string, size: number | undefined): Artwork3DHandle {
    const theme = readTheme();
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentRT = pmrem.fromScene(new RoomEnvironment());
    scene.environment = environmentRT.texture;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    // 149 units wide case (140 body + 9 spine) scaled by 0.09 = 13.41 world
    // units: pull the camera back so left/right edges fit with margin.
    camera.position.set(0, 0, 25);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.scale.setScalar(0.09);
    const baseRotation = { y: 0, x: 0 };
    group.rotation.set(baseRotation.x, baseRotation.y, 0);
    scene.add(group);

    buildCase(group, coverUrl, theme);
    addLights(scene, theme);

    const container = canvas.parentElement ?? canvas;
    const setSize = () => {
        const width = container.clientWidth || (size ?? 200);
        const height = container.clientHeight || (size ?? 200);
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(container);

    let frameId = 0;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    };
    animate();

    return {
        dispose: () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
            disposeScene(scene);
            environmentRT.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
        },
    };
}

function buildCase(group: THREE.Group, coverUrl: string, theme: ThemeColors) {
    const CASE_W = 140;
    const CASE_H = 125;
    const CASE_D = 12.5;
    // A real jewel case has a chunky hinge/spine along its left edge; the case
    // body is shifted right so the spine is visible in the straight-on view.
    const SPINE_W = 9;
    const BODY_X = SPINE_W / 2;

    const tray = new THREE.Mesh(
        new THREE.BoxGeometry(CASE_W, CASE_H, 2.4),
        new THREE.MeshStandardMaterial({ color: theme.tray, roughness: 0.55, metalness: 0, envMapIntensity: 0.8 }),
    );
    tray.position.set(BODY_X, 0, -CASE_D / 2 + 1.2);
    group.add(tray);

    const discGeometry = new THREE.CylinderGeometry(60, 60, 2.2, 64);
    discGeometry.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(
        discGeometry,
        new THREE.MeshStandardMaterial({ color: theme.disc, roughness: 0.35, metalness: 0.1, envMapIntensity: 0.9 }),
    );
    disc.position.set(BODY_X, 0, -2.4);
    group.add(disc);

    const labelGeometry = new THREE.CircleGeometry(20, 48);
    const label = new THREE.Mesh(
        labelGeometry,
        new THREE.MeshStandardMaterial({
            map: loadTexture(coverUrl),
            roughness: 0.4,
            metalness: 0,
            envMapIntensity: 0.9,
        }),
    );
    label.position.set(BODY_X, 0, -1.25);
    group.add(label);

    const artMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture(coverUrl),
        roughness: 0.32,
        metalness: 0.04,
        envMapIntensity: 0.6,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: theme.tray,
        roughness: 0.4,
        metalness: 0,
        envMapIntensity: 1,
    });
    const frontCover = new THREE.Mesh(
        // Square art face so the cover is never stretched; the tray margin
        // (the jewel case's molded rim) shows around it.
        new THREE.BoxGeometry(CASE_H - 12, CASE_H - 12, 1.6),
        [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, artMaterial, artMaterial],
    );
    frontCover.position.set(BODY_X, 0, CASE_D / 2 - 2.3);
    group.add(frontCover);

    const shell = new THREE.Mesh(
        new THREE.BoxGeometry(CASE_W, CASE_H, CASE_D + 0.6),
        new THREE.MeshPhysicalMaterial({
            color: theme.shell,
            transparent: true,
            opacity: 0.15,
            roughness: 0.08,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            side: THREE.DoubleSide,
            depthWrite: false,
            envMapIntensity: 1.4,
        }),
    );
    shell.renderOrder = 1;
    shell.position.x = BODY_X;
    group.add(shell);

    // Frosted but still plastic: milky, high-roughness slab with a hard clearcoat.
    const spine = new THREE.Mesh(
        new THREE.BoxGeometry(SPINE_W, CASE_H + 2, CASE_D + 1.2),
        new THREE.MeshPhysicalMaterial({
            color: theme.frosted,
            roughness: 0.55,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.12,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            envMapIntensity: 1.6,
        }),
    );
    spine.position.set(-((CASE_W + SPINE_W) / 2 - SPINE_W / 2), 0, 0);
    group.add(spine);
}

function addLights(scene: THREE.Scene, theme: ThemeColors) {
    const key = new THREE.DirectionalLight(theme.light, 1.6);
    key.position.set(6, 10, 12);
    scene.add(key);

    const back = new THREE.DirectionalLight(theme.accent, 0.5);
    back.position.set(-8, -4, -8);
    scene.add(back);

    scene.add(new THREE.HemisphereLight(theme.sky, theme.ground, 0.8));
}

interface ThemeColors {
    tray: THREE.Color;
    shell: THREE.Color;
    frosted: THREE.Color;
    disc: THREE.Color;
    light: THREE.Color;
    accent: THREE.Color;
    sky: THREE.Color;
    ground: THREE.Color;
}

function readTheme(): ThemeColors {
    const base = cssColor("--base", 0x121212);
    const contrast = cssColor("--contrast", 0xf5f5f5);
    const accent = cssColor("--base-color", 0x317eef);

    return {
        tray: mixColor(contrast, base, 0.28),
        shell: mixColor(contrast, base, 0.1),
        frosted: mixColor(contrast, base, 0.18),
        disc: mixColor(base, contrast, 0.12),
        light: mixColor(contrast, base, 0.06),
        accent,
        sky: mixColor(contrast, accent, 0.55),
        ground: mixColor(base, accent, 0.25),
    };
}

function cssColor(variable: string, fallbackHex: number): THREE.Color {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const parsed = parseHex(raw);
    return parsed ?? new THREE.Color(fallbackHex);
}

function parseHex(value: string): THREE.Color | null {
    const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) {
        return null;
    }
    const hex = match[1].length === 3
        ? match[1].split("").map(c => c + c).join("")
        : match[1];
    return new THREE.Color(parseInt(hex, 16));
}

function mixColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return a.clone().lerp(b, t);
}

function loadTexture(coverUrl: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(coverUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function disposeScene(scene: THREE.Scene) {
    scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) {
            material.forEach(m => disposeMaterial(m));
        } else if (material) {
            disposeMaterial(material);
        }
    });
}

function disposeMaterial(material: THREE.Material) {
    const texturable = material as THREE.MeshStandardMaterial;
    texturable.map?.dispose();
    material.dispose();
}
