import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CombatTurn, CombatStats } from '../utils/combatEngine';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  Eye,
  Flame,
  Crown,
  Award,
  Maximize2,
  Camera,
  RotateCw,
  Compass,
  ZoomIn,
  ZoomOut,
  User,
  Skull
} from 'lucide-react';

export interface CharacterModel3DInfo {
  id: string;
  name: string;
  characterClass: 'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight';
  modelUrl: string;
  description?: string;
  thumbnailUrl?: string;
  scale?: number;
  evidenceAffinity?: string;
}

interface ArenaViewportProps {
  heroName: string;
  heroClass: 'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight';
  heroLevel: number;
  heroScale?: number;
  selectedModel3D?: CharacterModel3DInfo | null;
  opponentName: string;
  opponentModelId: string;
  currentTurnData: CombatTurn | null;
  isCombatActive: boolean;
  heroStats: CombatStats;
  opponentStats: CombatStats;
  onTurnComplete?: () => void;
}

export type CameraPreset = 'duel' | 'hero' | 'opponent' | 'top_down' | 'isometric' | 'cinematic';

export const ArenaViewport: React.FC<ArenaViewportProps> = ({
  heroName,
  heroClass,
  heroLevel,
  heroScale = 1.0,
  selectedModel3D,
  opponentName,
  opponentModelId,
  currentTurnData,
  isCombatActive,
  heroStats,
  opponentStats
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // 3D Nodes
  const heroRootRef = useRef<THREE.Group | null>(null);
  const opponentRootRef = useRef<THREE.Group | null>(null);
  const heroModelContainerRef = useRef<THREE.Group | null>(null);
  const projectileRef = useRef<THREE.Mesh | null>(null);
  const arenaRingRef = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);

  // State
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [usingGlbModel, setUsingGlbModel] = useState(false);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset>('duel');
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Floating 3D Text indicators
  const [damageFloatingList, setDamageFloatingList] = useState<
    Array<{ id: string; text: string; isCrit: boolean; isHero: boolean }>
  >([]);

  // -------------------------------------------------------------
  // BUILD PROCEDURAL CHIBI FIGHTER MESH (High-Fidelity Fallback / Default)
  // -------------------------------------------------------------
  const buildProceduralChibiMesh = (
    cClass: string,
    lvl: number,
    isOpponent = false
  ): THREE.Group => {
    const group = new THREE.Group();

    // Palette
    const skinColor = isOpponent ? 0x2a1b3d : 0xffdfba;
    const armorColor = isOpponent
      ? 0x8b0000
      : cClass === 'paladin'
      ? 0xf59e0b
      : cClass === 'archmage'
      ? 0x8b5cf6
      : cClass === 'assassin'
      ? 0x06b6d4
      : 0xef4444;
    const accentColor = isOpponent ? 0xff0055 : 0xfef08a;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5, metalness: 0.1 });
    const armorMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      roughness: 0.3,
      metalness: 0.6,
      emissive: isOpponent ? 0x330011 : 0x221100,
      emissiveIntensity: 0.3
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.2,
      metalness: 0.8,
      emissive: accentColor,
      emissiveIntensity: 0.5
    });

    // 1. Chibi Big Head
    const headGeo = new THREE.SphereGeometry(0.55, 32, 32);
    headGeo.scale(1, 0.95, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 1.35;
    headMesh.castShadow = true;
    group.add(headMesh);

    // 2. Chibi Cute Eyes
    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: isOpponent ? 0xff0055 : 0x1e1b4b });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 1.4, 0.45);
    leftEye.scale.set(0.8, 1.2, 0.4);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.2;
    group.add(leftEye, rightEye);

    // Eye Highlights
    const pupilGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.17, 1.45, 0.48);
    const rightPupil = leftPupil.clone();
    rightPupil.position.x = 0.23;
    group.add(leftPupil, rightPupil);

    // 3. Chibi Helmet / Horns / Hair
    const helmGeo = new THREE.SphereGeometry(0.58, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const helmMesh = new THREE.Mesh(helmGeo, armorMat);
    helmMesh.position.y = 1.38;
    helmMesh.castShadow = true;
    group.add(helmMesh);

    if (cClass === 'paladin' || isOpponent) {
      // Horns / Crest
      const crestGeo = new THREE.ConeGeometry(0.15, 0.45, 16);
      const crestMesh = new THREE.Mesh(crestGeo, accentMat);
      crestMesh.position.set(0, 1.95, 0.1);
      crestMesh.rotation.x = -0.2;
      group.add(crestMesh);
    } else if (cClass === 'archmage') {
      // Wizard Pointy Hat
      const hatGeo = new THREE.ConeGeometry(0.45, 0.9, 24);
      const hatMesh = new THREE.Mesh(hatGeo, armorMat);
      hatMesh.position.set(0, 2.0, 0);
      group.add(hatMesh);
    }

    // 4. Compact Chibi Body with Armor Plate
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.6, 16);
    const bodyMesh = new THREE.Mesh(bodyGeo, armorMat);
    bodyMesh.position.y = 0.75;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Chest Invariant Gem / Emblem
    const gemGeo = new THREE.OctahedronGeometry(0.12);
    const gemMesh = new THREE.Mesh(gemGeo, accentMat);
    gemMesh.position.set(0, 0.8, 0.38);
    group.add(gemMesh);

    // 5. Chibi Cute Hands & Weapon
    const handGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.55, 0.75, 0.15);
    const rightHand = leftHand.clone();
    rightHand.position.x = 0.55;
    group.add(leftHand, rightHand);

    // Weapons
    if (cClass === 'paladin') {
      // Golden Sword
      const swordGeo = new THREE.BoxGeometry(0.08, 0.85, 0.04);
      const sword = new THREE.Mesh(swordGeo, accentMat);
      sword.position.set(0.58, 0.9, 0.25);
      sword.rotation.z = -0.3;
      group.add(sword);

      // Shield
      const shieldGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.06, 6);
      const shield = new THREE.Mesh(shieldGeo, armorMat);
      shield.position.set(-0.55, 0.75, 0.3);
      shield.rotation.x = Math.PI / 2;
      group.add(shield);
    } else if (cClass === 'archmage') {
      // Arcane Staff
      const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 12);
      const staff = new THREE.Mesh(staffGeo, armorMat);
      staff.position.set(0.58, 0.85, 0.2);
      group.add(staff);

      const orbGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const orb = new THREE.Mesh(orbGeo, accentMat);
      orb.position.set(0.58, 1.5, 0.2);
      group.add(orb);
    } else if (cClass === 'assassin') {
      // Dual Daggers
      const dagger1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.03), accentMat);
      dagger1.position.set(0.55, 0.8, 0.2);
      const dagger2 = dagger1.clone();
      dagger2.position.set(-0.55, 0.8, 0.2);
      group.add(dagger1, dagger2);
    } else {
      // Berserker Heavy Axe
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 12), armorMat);
      handle.position.set(0.6, 0.85, 0.2);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.06), accentMat);
      blade.position.set(0.6, 1.25, 0.2);
      group.add(handle, blade);
    }

    // 6. Chibi Feet / Boots
    const footGeo = new THREE.SphereGeometry(0.18, 16, 16);
    footGeo.scale(1, 0.7, 1.4);
    const leftFoot = new THREE.Mesh(footGeo, armorMat);
    leftFoot.position.set(-0.25, 0.2, 0.05);
    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.25;
    group.add(leftFoot, rightFoot);

    // High Level Wings Aura (Lvl 5+)
    if (lvl >= 5) {
      const wingGeo = new THREE.ConeGeometry(0.3, 0.8, 4);
      const wingMat = new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true });
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-0.55, 0.9, -0.2);
      leftWing.rotation.z = Math.PI / 3;
      leftWing.rotation.x = -0.2;
      const rightWing = leftWing.clone();
      rightWing.position.x = 0.55;
      rightWing.rotation.z = -Math.PI / 3;
      group.add(leftWing, rightWing);
    }

    return group;
  };

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE WITH DYNAMIC ORBIT CONTROLS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050713);
    scene.fog = new THREE.FogExp2(0x050713, 0.04);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 8.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Dynamic OrbitControls for Multi-Angle Inspection
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below floor
    controls.minPolarAngle = 0.1;
    controls.minDistance = 2.0;
    controls.maxDistance = 16;
    controls.target.set(0, 1.2, 0);
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.8;
    controlsRef.current = controls;

    // 5. Studio-Grade High-Visibility 3D Lighting Setup for GLB Chibi Fighters
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.1);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyDirLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyDirLight.position.set(6, 12, 8);
    keyDirLight.castShadow = true;
    keyDirLight.shadow.mapSize.width = 2048;
    keyDirLight.shadow.mapSize.height = 2048;
    keyDirLight.shadow.bias = -0.0001;
    scene.add(keyDirLight);

    const fillDirLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
    fillDirLight.position.set(-6, 8, 6);
    scene.add(fillDirLight);

    const rimDirLight = new THREE.DirectionalLight(0xfef08a, 1.6);
    rimDirLight.position.set(0, 10, -8);
    scene.add(rimDirLight);

    const heroLight = new THREE.PointLight(0xfbbf24, 2.8, 8);
    heroLight.position.set(-2.0, 2.2, 1.5);
    scene.add(heroLight);

    const oppLight = new THREE.PointLight(0xf43f5e, 2.8, 8);
    oppLight.position.set(2.0, 2.2, 1.5);
    scene.add(oppLight);

    // 6. Arena Floating Hexagonal Platform with Neon Runes
    const podiumGeo = new THREE.CylinderGeometry(4.2, 4.6, 0.4, 32);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.2;
    podium.receiveShadow = true;
    scene.add(podium);

    const ringGeo = new THREE.TorusGeometry(4.25, 0.06, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
    arenaRingRef.current = ring;

    const lineGeo = new THREE.BoxGeometry(0.08, 0.02, 6.0);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 });
    const centerLine = new THREE.Mesh(lineGeo, lineMat);
    centerLine.position.y = 0.02;
    scene.add(centerLine);

    // 7. Ambient Particle Starfield
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = Math.random() * 8 - 1;
      positions[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particleSystemRef.current = particles;

    // 8. Projectile Energy Ball
    const projGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const projMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const projectile = new THREE.Mesh(projGeo, projMat);
    projectile.visible = false;
    scene.add(projectile);
    projectileRef.current = projectile;

    // 9. Root Groups for Combatants
    const heroGroup = new THREE.Group();
    heroGroup.position.set(-2.0, 0, 0);
    heroGroup.rotation.y = Math.PI / 2;
    scene.add(heroGroup);
    heroRootRef.current = heroGroup;

    const oppGroup = new THREE.Group();
    oppGroup.position.set(2.0, 0, 0);
    oppGroup.rotation.y = -Math.PI / 2;
    scene.add(oppGroup);
    opponentRootRef.current = oppGroup;

    const heroModelContainer = new THREE.Group();
    heroGroup.add(heroModelContainer);
    heroModelContainerRef.current = heroModelContainer;

    const oppMesh = buildProceduralChibiMesh('berserker', heroLevel, true);
    oppGroup.add(oppMesh);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Automatic Combat Render Loop (High-precision performance timer)
    const startTime = performance.now();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      controls.update();

      if (arenaRingRef.current) {
        arenaRingRef.current.rotation.z = elapsed * 0.2;
      }

      if (particleSystemRef.current) {
        particleSystemRef.current.rotation.y = elapsed * 0.05;
      }

      if (heroRootRef.current) {
        heroRootRef.current.position.y = Math.sin(elapsed * 3.0) * 0.06;
      }
      if (opponentRootRef.current) {
        opponentRootRef.current.position.y = Math.sin(elapsed * 3.0 + 1.2) * 0.06;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // LOAD 3D GLB MODEL OR FALLBACK PROCEDURAL MESH
  // -------------------------------------------------------------
  useEffect(() => {
    if (!heroModelContainerRef.current) return;
    const container = heroModelContainerRef.current;

    while (container.children.length > 0) {
      container.remove(container.children[0]);
    }

    if (selectedModel3D?.modelUrl && selectedModel3D.modelUrl.length > 5) {
      setModelLoading(true);
      setModelLoadError(null);

      const loader = new GLTFLoader();
      loader.load(
        selectedModel3D.modelUrl,
        (gltf) => {
          setModelLoading(false);
          setUsingGlbModel(true);
          const loadedModel = gltf.scene;

          const scale = (selectedModel3D.scale || 1.0) * 0.9 * heroScale;
          loadedModel.scale.set(scale, scale, scale);
          loadedModel.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          container.add(loadedModel);
        },
        undefined,
        (err) => {
          console.warn('GLB Load failed, falling back to procedural chibi fighter:', err);
          setModelLoading(false);
          setModelLoadError('Fallback to procedural chibi geometry.');
          setUsingGlbModel(false);

          const fallbackMesh = buildProceduralChibiMesh(heroClass, heroLevel, false);
          fallbackMesh.scale.set(heroScale, heroScale, heroScale);
          container.add(fallbackMesh);
        }
      );
    } else {
      setUsingGlbModel(false);
      setModelLoading(false);
      const mesh = buildProceduralChibiMesh(heroClass, heroLevel, false);
      mesh.scale.set(heroScale, heroScale, heroScale);
      container.add(mesh);
    }
  }, [selectedModel3D, heroClass, heroLevel, heroScale]);

  // -------------------------------------------------------------
  // DYNAMIC CAMERA CONTROLLER & PRESET TRANSITIONS
  // -------------------------------------------------------------
  const switchCameraPreset = (preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    setActiveCameraPreset(preset);

    let targetPos = new THREE.Vector3(0, 3.8, 8.5);
    let targetLookAt = new THREE.Vector3(0, 1.2, 0);

    switch (preset) {
      case 'duel': // Front balanced view
        targetPos.set(0, 3.8, 8.5);
        targetLookAt.set(0, 1.2, 0);
        break;
      case 'hero': // Hero close-up inspection
        targetPos.set(-2.0, 2.2, 3.2);
        targetLookAt.set(-2.0, 1.3, 0);
        break;
      case 'opponent': // Opponent close-up inspection
        targetPos.set(2.0, 2.2, 3.2);
        targetLookAt.set(2.0, 1.3, 0);
        break;
      case 'top_down': // Tactical bird's-eye arena view
        targetPos.set(0, 9.5, 0.1);
        targetLookAt.set(0, 0, 0);
        break;
      case 'isometric': // Strategy 45° angled overview
        targetPos.set(5.5, 5.0, 5.5);
        targetLookAt.set(0, 1.0, 0);
        break;
      case 'cinematic': // Low cinematic clash angle
        targetPos.set(-3.5, 1.8, 4.2);
        targetLookAt.set(0, 1.2, 0);
        break;
    }

    // Smooth camera transition lerp
    let progress = 0;
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();

    const transitionInterval = setInterval(() => {
      progress += 0.08;
      if (progress >= 1) {
        progress = 1;
        clearInterval(transitionInterval);
      }
      camera.position.lerpVectors(startPos, targetPos, progress);
      controls.target.lerpVectors(startLookAt, targetLookAt, progress);
      controls.update();
    }, 16);
  };

  const toggleAutoRotate = () => {
    if (!controlsRef.current) return;
    const next = !isAutoRotating;
    controlsRef.current.autoRotate = next;
    setIsAutoRotating(next);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const factor = direction === 'in' ? 0.8 : 1.25;
    camera.position.multiplyScalar(factor);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    switchCameraPreset('duel');
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
      setIsAutoRotating(false);
    }
  };

  // -------------------------------------------------------------
  // AUTOMATIC COMBAT ACTION VISUALIZER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentTurnData || !heroRootRef.current || !opponentRootRef.current) return;

    const isHeroAttacking = currentTurnData.attacker === 'hero';
    const attackerRoot = isHeroAttacking ? heroRootRef.current : opponentRootRef.current;

    const initialAttackerX = isHeroAttacking ? -2.0 : 2.0;
    const targetX = isHeroAttacking ? -0.7 : 0.7;

    // 1. Attack Lunge Animation in 3D
    let frame = 0;
    const totalFrames = 18;
    const lungeInterval = setInterval(() => {
      frame++;
      if (frame <= 8) {
        attackerRoot.position.x = THREE.MathUtils.lerp(initialAttackerX, targetX, frame / 8);
      } else {
        attackerRoot.position.x = THREE.MathUtils.lerp(targetX, initialAttackerX, (frame - 8) / 10);
      }

      if (frame >= totalFrames) {
        clearInterval(lungeInterval);
        attackerRoot.position.x = initialAttackerX;
      }
    }, 20);

    // 2. Spawn Floating 3D Damage Indicator
    const newDamageId = `dmg_${Date.now()}_${Math.random()}`;
    setDamageFloatingList((prev) => [
      ...prev,
      {
        id: newDamageId,
        text: currentTurnData.isCrit
          ? `💥 CRIT -${currentTurnData.mitigatedDamage}`
          : `-${currentTurnData.mitigatedDamage}`,
        isCrit: currentTurnData.isCrit,
        isHero: isHeroAttacking
      }
    ]);

    setTimeout(() => {
      setDamageFloatingList((prev) => prev.filter((d) => d.id !== newDamageId));
    }, 1400);

    return () => clearInterval(lungeInterval);
  }, [currentTurnData]);

  return (
    <div className="relative w-full h-[450px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden select-none shadow-2xl">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Overlay: 3D Combat HUD */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
        {/* Hero 3D HUD */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 max-w-[210px] w-full space-y-1.5 shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-amber-300 truncate flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              {heroName}
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
              Lv.{heroLevel}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, (currentTurnData ? currentTurnData.heroHpRemaining : heroStats.currentHp) / heroStats.maxHp * 100))}%`
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>HP: {currentTurnData ? currentTurnData.heroHpRemaining : heroStats.currentHp} / {heroStats.maxHp}</span>
            <span className="text-amber-300 font-bold">{heroScale}x Scale</span>
          </div>
        </div>

        {/* Center Versus Badge */}
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-full text-[11px] font-mono font-black text-amber-400 shadow-lg flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>3D AUTO-DUEL</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 bg-slate-950/80 px-2 py-0.5 rounded">
            {isCombatActive ? '⚔️ AUTOMATIC COMBAT' : 'ORBIT INSPECTION ACTIVE'}
          </span>
        </div>

        {/* Opponent 3D HUD */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-rose-500/40 rounded-xl p-3 max-w-[210px] w-full space-y-1.5 shadow-lg text-right pointer-events-auto">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
              Boss
            </span>
            <span className="text-rose-300 truncate">
              {opponentName.split(' ')[0]}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300 ml-auto"
              style={{
                width: `${Math.max(0, Math.min(100, (currentTurnData ? currentTurnData.opponentHpRemaining : opponentStats.currentHp) / opponentStats.maxHp * 100))}%`
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{opponentStats.scale}x</span>
            <span>HP: {currentTurnData ? currentTurnData.opponentHpRemaining : opponentStats.currentHp} / {opponentStats.maxHp}</span>
          </div>
        </div>
      </div>

      {/* Floating 3D Damage Indicator Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-around px-12">
        <div className="flex flex-col items-center">
          {damageFloatingList
            .filter((d) => !d.isHero)
            .map((d) => (
              <div
                key={d.id}
                className={`animate-bounce text-sm sm:text-base font-black font-mono drop-shadow-2xl ${
                  d.isCrit ? 'text-rose-400 scale-125' : 'text-amber-300'
                }`}
              >
                {d.text}
              </div>
            ))}
        </div>

        <div className="flex flex-col items-center">
          {damageFloatingList
            .filter((d) => d.isHero)
            .map((d) => (
              <div
                key={d.id}
                className={`animate-bounce text-sm sm:text-base font-black font-mono drop-shadow-2xl ${
                  d.isCrit ? 'text-rose-400 scale-125' : 'text-amber-300'
                }`}
              >
                {d.text}
              </div>
            ))}
        </div>
      </div>

      {/* Dynamic Camera Presets Controller Bar (Top Right Overlay) */}
      <div className="absolute top-16 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-[11px] font-mono">
          <button
            onClick={() => switchCameraPreset('duel')}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              activeCameraPreset === 'duel'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Front Duel Overview"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden sm:inline">Duel</span>
          </button>

          <button
            onClick={() => switchCameraPreset('hero')}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              activeCameraPreset === 'hero'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Inspect Hero Chibi Fighter"
          >
            <User className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Hero</span>
          </button>

          <button
            onClick={() => switchCameraPreset('opponent')}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              activeCameraPreset === 'opponent'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Inspect Opponent Boss"
          >
            <Skull className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">Boss</span>
          </button>

          <button
            onClick={() => switchCameraPreset('top_down')}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              activeCameraPreset === 'top_down'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Top-Down Tactical Map View"
          >
            <Compass className="w-3 h-3" />
            <span className="hidden sm:inline">Top</span>
          </button>

          <button
            onClick={() => switchCameraPreset('isometric')}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              activeCameraPreset === 'isometric'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Isometric 45° Angle"
          >
            <span className="hidden sm:inline">Iso</span>
          </button>

          <button
            onClick={toggleAutoRotate}
            className={`p-1.5 rounded-lg transition-colors ${
              isAutoRotating
                ? 'bg-cyan-500 text-slate-950 font-bold animate-spin'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isAutoRotating ? 'Stop 360° Orbit Rotation' : 'Start 360° Cinematic Orbit Rotation'}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Orbit Hint Pill */}
        <span className="text-[9px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800/80">
          💡 Drag to Orbit 360° · Scroll to Zoom
        </span>
      </div>

      {/* Bottom Control Bar: GLB Status, Zoom & Reset */}
      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {usingGlbModel ? `3D GLB Model: ${selectedModel3D?.name || 'Active'}` : `Procedural 3D Chibi: ${heroClass.toUpperCase()}`}
            </span>
          </div>
          {modelLoading && (
            <span className="text-[10px] font-mono text-amber-400 animate-pulse bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
              Loading GLB...
            </span>
          )}
        </div>

        {/* Zoom & Camera Quick Actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-0.5">
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom Camera In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom Camera Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-slate-200 text-xs font-mono rounded-xl border border-slate-800 transition-colors shadow-lg"
            title="Reset 3D Orbit Camera to Default"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Reset View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
