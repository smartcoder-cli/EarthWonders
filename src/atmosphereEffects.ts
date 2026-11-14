import * as THREE from "three";
import type { Wonder } from "./wonders";

/**
 * 程序化生成极光渐变纹理 (Emerald Green -> Cyan -> Mystic Purple with smooth alpha)
 */
function makeAuroraTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.clearRect(0, 0, w, h);

  // 垂直高光渐变
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, "rgba(139, 92, 246, 0.0)"); // 顶部淡紫透明消散
  grad.addColorStop(0.35, "rgba(56, 189, 248, 0.75)"); // 霓虹天青
  grad.addColorStop(0.7, "rgba(52, 211, 153, 0.95)"); // 极光翡翠绿
  grad.addColorStop(1.0, "rgba(16, 185, 129, 0.0)"); // 底部淡绿羽化

  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // 水平方向模拟多道极光光幕帷幔 (Curtains of light)
  for (let col = 0; col < 12; col++) {
    const cx = (col / 12) * w + (Math.sin(col * 1.5) * 20);
    const radGrad = g.createRadialGradient(cx, h * 0.6, 5, cx, h * 0.6, 45);
    radGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    radGrad.addColorStop(1, "rgba(52, 211, 153, 0.0)");
    g.fillStyle = radGrad;
    g.fillRect(cx - 45, 0, 90, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

/**
 * 生成柔和海雾贴图
 */
function makeFogTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;

  const rad = g.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  rad.addColorStop(0.0, "rgba(226, 232, 240, 0.55)");
  rad.addColorStop(0.4, "rgba(203, 213, 225, 0.35)");
  rad.addColorStop(0.8, "rgba(148, 163, 184, 0.12)");
  rad.addColorStop(1.0, "rgba(148, 163, 184, 0.0)");

  g.fillStyle = rad;
  g.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

export class AtmosphereManager {
  private currentGroup: THREE.Group | null = null;
  private effectRoot: THREE.Group = new THREE.Group();

  // Svalbard 极光与雪花
  private auroraMeshes: THREE.Mesh[] = [];
  private auroraLight: THREE.PointLight | null = null;
  private snowPoints: THREE.Points | null = null;
  private snowPositions: Float32Array | null = null;
  private snowVelocities: Float32Array | null = null;

  // Golden Gate 海雾层
  private fogGroup: THREE.Group | null = null;
  private fogPuffs: THREE.Mesh[] = [];

  private totalTime = 0;
  private isNightMode = false;

  constructor() {
    this.effectRoot.name = "AtmosphereEffectsRoot";
  }

  public setWonder(wonder: Wonder | null, landmarkGroup?: THREE.Group) {
    this.cleanup();
    this.currentGroup = landmarkGroup ?? null;

    if (!wonder || !landmarkGroup) return;

    if (wonder.id === "svalbard") {
      this.initSvalbardAurora(landmarkGroup);
      this.initSvalbardSnow(landmarkGroup);
    } else if (wonder.id === "goldengate") {
      this.initGoldenGateFog(landmarkGroup);
    }
  }

  public setNightMode(night: boolean) {
    this.isNightMode = night;
    for (const aurora of this.auroraMeshes) {
      const mat = aurora.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = night ? 0.92 : 0.35;
      }
    }
    if (this.auroraLight) {
      this.auroraLight.intensity = night ? 1.8 : 0.5;
    }
  }

  /**
   * 斯瓦尔巴极光天幕：在北极夜空中悬挂两道起伏轻漾的极光波幔
   */
  private initSvalbardAurora(parent: THREE.Group) {
    const auroraTex = makeAuroraTexture();
    const auroraMat = new THREE.MeshBasicMaterial({
      map: auroraTex,
      transparent: true,
      opacity: this.isNightMode ? 0.92 : 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 2 道交叠错落的弧形极光幕，精确跨越在后方柏拉图雪山山脊上方 (y = 26m ~ 65m, z = -55m ~ -95m)
    const configs = [
      { rTop: 68, rBottom: 85, h: 42, y: 34, z: -55, rotY: -0.15 },
      { rTop: 85, rBottom: 105, h: 56, y: 44, z: -75, rotY: 0.18 },
    ];

    for (const cfg of configs) {
      const geo = new THREE.CylinderGeometry(cfg.rTop, cfg.rBottom, cfg.h, 36, 4, true, -Math.PI / 2.8, (Math.PI * 2) / 2.8);
      const mesh = new THREE.Mesh(geo, auroraMat);
      mesh.position.set(0, cfg.y, cfg.z);
      mesh.rotation.y = cfg.rotY;
      mesh.userData.skipLines = true;
      parent.add(mesh);
      this.auroraMeshes.push(mesh);
    }

    const auroraLight = new THREE.PointLight(0x34d399, this.isNightMode ? 1.8 : 0.5, 180, 1.2);
    auroraLight.position.set(0, 38, -50);
    parent.add(auroraLight);
    this.auroraLight = auroraLight;
  }

  /**
   * 斯瓦尔巴漫天飞雪粒子系统 (350 颗轻盈雪花)
   */
  private initSvalbardSnow(parent: THREE.Group) {
    const count = 350;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 分布在种子库谷地范围 x[-70, 70], y[2, 70], z[-80, 80]
      positions[i * 3 + 0] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 70 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.8; // 水平微风
      velocities[i * 3 + 1] = -(Math.random() * 1.5 + 1.2); // 匀速下落
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 1.4,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.userData.skipLines = true;
    parent.add(points);

    this.snowPoints = points;
    this.snowPositions = positions;
    this.snowVelocities = velocities;
  }

  /**
   * 旧金山金门海峡流动低空海雾 (Karl the Fog)
   */
  private initGoldenGateFog(parent: THREE.Group) {
    this.fogGroup = new THREE.Group();
    const fogTex = makeFogTexture();
    const fogMat = new THREE.MeshBasicMaterial({
      map: fogTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    // 在大桥海峡中下部 (y = 12m ~ 48m, x = -80m ~ 80m, z = -580m ~ 580m) 分布 45 团流云
    const puffCount = 42;
    for (let i = 0; i < puffCount; i++) {
      const size = 65 + Math.random() * 50;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), fogMat);
      plane.rotation.x = -Math.PI / 2; // 平卧于海面上
      plane.position.set(
        (Math.random() - 0.5) * 150,
        14 + Math.random() * 32, // 在桥面(67m)之下流动
        (Math.random() - 0.5) * 1100
      );
      plane.userData.speedX = 0.8 + Math.random() * 1.2; // 自西向东飘移
      plane.userData.skipLines = true;
      this.fogGroup.add(plane);
      this.fogPuffs.push(plane);
    }

    parent.add(this.fogGroup);
  }

  /**
   * 逐帧更新气候与大气动画 (在 renderLoop 中调用)
   */
  public update(dt: number) {
    this.totalTime += dt;

    // 1. 极光波动呼吸动画
    if (this.auroraMeshes.length > 0) {
      for (let i = 0; i < this.auroraMeshes.length; i++) {
        const mesh = this.auroraMeshes[i];
        mesh.rotation.y += Math.sin(this.totalTime * 0.4 + i) * 0.0006;
        mesh.position.y += Math.cos(this.totalTime * 0.6 + i) * 0.04;
      }
    }

    // 2. 斯瓦尔巴雪花粒子飘落
    if (this.snowPoints && this.snowPositions && this.snowVelocities) {
      const count = this.snowPositions.length / 3;
      for (let i = 0; i < count; i++) {
        this.snowPositions[i * 3 + 0] += this.snowVelocities[i * 3 + 0] * dt;
        this.snowPositions[i * 3 + 1] += this.snowVelocities[i * 3 + 1] * dt * 4;
        this.snowPositions[i * 3 + 2] += this.snowVelocities[i * 3 + 2] * dt;

        // 触底循环重置到顶部
        if (this.snowPositions[i * 3 + 1] <= 1.0) {
          this.snowPositions[i * 3 + 1] = 68.0;
          this.snowPositions[i * 3 + 0] = (Math.random() - 0.5) * 140;
          this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;
        }
      }
      this.snowPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 3. 金门大桥低空海雾漂移
    if (this.fogPuffs.length > 0) {
      for (const puff of this.fogPuffs) {
        puff.position.x += puff.userData.speedX * dt * 6.0;
        // 漂出海湾后重置到西侧太平洋进风口
        if (puff.position.x > 90) {
          puff.position.x = -90;
        }
      }
    }
  }

  private cleanup() {
    if (this.currentGroup) {
      for (const aurora of this.auroraMeshes) {
        this.currentGroup.remove(aurora);
      }
      if (this.auroraLight) {
        this.currentGroup.remove(this.auroraLight);
      }
      if (this.snowPoints) {
        this.currentGroup.remove(this.snowPoints);
      }
      if (this.fogGroup) {
        this.currentGroup.remove(this.fogGroup);
      }
    }
    this.auroraMeshes = [];
    this.auroraLight = null;
    this.snowPoints = null;
    this.snowPositions = null;
    this.snowVelocities = null;
    this.fogGroup = null;
    this.fogPuffs = [];
  }
}
