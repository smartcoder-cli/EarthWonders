import type { Wonder } from "./wonders";

export interface PostcardCaptureOptions {
  wonder: Wonder;
  glCanvas: HTMLCanvasElement;
  solarTimeText: string;
  isWireframe?: boolean;
  isNight?: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  ancient: "🏛️ 古典文明奇迹",
  megastructure: "🚀 现代超级工程",
  skyline: "🏙️ 先锋摩天都市",
  infrastructure: "🌉 跨海超级工程",
};

/**
 * 格式化经纬度为标准大地测量坐标字符串 (如 48°53'34"N · 2°14'09"E)
 */
function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);

  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = Math.round(((absLat - latDeg) * 60 - latMin) * 60);

  const lonDeg = Math.floor(absLon);
  const lonMin = Math.floor((absLon - lonDeg) * 60);
  const lonSec = Math.round(((absLon - lonDeg) * 60 - lonMin) * 60);

  return `${latDeg}°${latMin.toString().padStart(2, "0")}'${latSec.toString().padStart(2, "0")}"${latDir} · ${lonDeg}°${lonMin.toString().padStart(2, "0")}'${lonSec.toString().padStart(2, "0")}"${lonDir}`;
}

/**
 * 合成并渲染一张极简高雅的博物馆画报/拍立得风格旅行明信片
 */
export function generatePostcard(options: PostcardCaptureOptions): HTMLCanvasElement {
  const { wonder, glCanvas, solarTimeText, isWireframe, isNight } = options;

  const cardW = 1280;
  const cardH = 880;
  const padding = 36;
  const photoH = 670;
  const photoW = cardW - padding * 2; // 1208px

  const canvas = document.createElement("canvas");
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext("2d")!;

  // 1. 卡片哑光深色背景与典雅金属质感边框
  const bgGrad = ctx.createLinearGradient(0, 0, 0, cardH);
  bgGrad.addColorStop(0, "#0d1322");
  bgGrad.addColorStop(1, "#070a12");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cardW, cardH);

  // 外边框微光线
  ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, cardW - 20, cardH - 20);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, cardW - 32, cardH - 32);

  // 2. 绘制 3D 渲染画面 (Cover 填充)
  const srcW = glCanvas.width;
  const srcH = glCanvas.height;
  const srcAspect = srcW / srcH;
  const dstAspect = photoW / photoH;

  let sX = 0, sY = 0, sW = srcW, sH = srcH;
  if (srcAspect > dstAspect) {
    sW = srcH * dstAspect;
    sX = (srcW - sW) / 2;
  } else {
    sH = srcW / dstAspect;
    sY = (srcH - sH) / 2;
  }

  // 画面外阴影
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#000000";
  ctx.fillRect(padding, padding, photoW, photoH);
  ctx.restore();

  // 绘制视口画面
  ctx.drawImage(glCanvas, sX, sY, sW, sH, padding, padding, photoW, photoH);

  // 画面边框金线与角落裁切标
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding, photoW, photoH);

  // 四角相框角标 (L型标)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
  ctx.lineWidth = 2;
  const cornerSize = 14;
  // 左上
  ctx.beginPath();
  ctx.moveTo(padding + cornerSize, padding);
  ctx.lineTo(padding, padding);
  ctx.lineTo(padding, padding + cornerSize);
  ctx.stroke();
  // 右上
  ctx.beginPath();
  ctx.moveTo(padding + photoW - cornerSize, padding);
  ctx.lineTo(padding + photoW, padding);
  ctx.lineTo(padding + photoW, padding + cornerSize);
  ctx.stroke();
  // 左下
  ctx.beginPath();
  ctx.moveTo(padding, padding + photoH - cornerSize);
  ctx.lineTo(padding, padding + photoH);
  ctx.lineTo(padding + cornerSize, padding + photoH);
  ctx.stroke();
  // 右下
  ctx.beginPath();
  ctx.moveTo(padding + photoW - cornerSize, padding + photoH);
  ctx.lineTo(padding + photoW, padding + photoH);
  ctx.lineTo(padding + photoW, padding + photoH - cornerSize);
  ctx.stroke();

  // 3. 画面水印标记 (右下微缩水印)
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.textAlign = "right";
  ctx.fillText("TELLUX 3D ENGINE · PROCEDURAL ARCHITECTURE", padding + photoW - 12, padding + photoH - 12);

  // 4. 底部排版区域 (从 y = 730 起)
  const textStartY = 744;

  // 左侧主要信息
  // A. 分类胶囊
  const catText = CATEGORY_NAMES[wonder.category] ?? "🌍 全球奇迹";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(catText.toUpperCase(), padding, textStartY);

  // B. 地标主标题
  ctx.font = "bold 32px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(wonder.nameZh, padding, textStartY + 38);

  // C. 英文全称与年代
  ctx.font = "14px 'SF Pro Display', -apple-system, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${wonder.nameEn.toUpperCase()} · ${wonder.completed}`, padding, textStartY + 64);

  // D. 经纬度与位置地名
  const coordStr = formatCoordinates(wonder.latitude, wonder.longitude);
  ctx.font = "13px 'SF Mono', Consolas, monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`📍 ${coordStr}  |  ${wonder.place}`, padding, textStartY + 88);

  // 右侧徽章与模式印章
  const rightX = cardW - padding;

  // 模式与光照指示标签
  let modeBadge = isWireframe ? "📐 PENTAGON3D 结构线框" : (isNight ? "🌙 静谧夜景" : "☀️ 日光天幕");
  if (solarTimeText && !isWireframe) {
    modeBadge += ` · ${solarTimeText}`;
  }

  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(modeBadge, rightX, textStartY + 6);

  // 品牌大印戳 (环形设计徽记)
  const stampCenterX = rightX - 55;
  const stampCenterY = textStartY + 58;
  const stampR = 34;

  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampCenterX, stampCenterY, stampR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(stampCenterX, stampCenterY, stampR - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
  ctx.textAlign = "center";
  ctx.fillText("EARTH WONDERS", stampCenterX, stampCenterY - 10);
  ctx.font = "8px monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("TELLUX 3D", stampCenterX, stampCenterY + 4);
  ctx.font = "bold 8px sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("OFFICIAL", stampCenterX, stampCenterY + 16);

  // 编号印章 (如 No. 18 / 19)
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.textAlign = "right";
  ctx.fillText(`INDEX #${wonder.index.toString().padStart(2, "0")}`, rightX - 110, textStartY + 58);

  return canvas;
}

/**
 * 弹出明信片预览与下载弹窗
 */
export function showPostcardModal(canvas: HTMLCanvasElement, wonder: Wonder) {
  let modal = document.getElementById("postcard-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "postcard-modal";
    modal.className = "postcard-modal";
    modal.innerHTML = `
      <div class="postcard-backdrop"></div>
      <div class="postcard-dialog" role="dialog" aria-labelledby="postcard-title">
        <header class="postcard-dialog-header">
          <div class="postcard-title-wrap">
            <span class="postcard-icon">📷</span>
            <h3 id="postcard-title" class="postcard-dialog-title">环球建筑明信片 · 专属留念</h3>
          </div>
          <button id="btn-postcard-close" class="postcard-dialog-close" type="button" aria-label="关闭明信片">✕</button>
        </header>
        <div class="postcard-preview-container">
          <img id="postcard-preview-img" class="postcard-preview-img" alt="明信片预览" />
        </div>
        <footer class="postcard-dialog-actions">
          <button id="btn-postcard-download" class="postcard-download-btn" type="button">
            📥 下载高清壁纸海报 (PNG)
          </button>
          <button id="btn-postcard-dismiss" class="postcard-cancel-btn" type="button">
            继续探索
          </button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);

    const closeHandler = () => {
      modal?.classList.remove("visible");
    };
    modal.querySelector(".postcard-backdrop")?.addEventListener("click", closeHandler);
    document.getElementById("btn-postcard-close")?.addEventListener("click", closeHandler);
    document.getElementById("btn-postcard-dismiss")?.addEventListener("click", closeHandler);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal?.classList.contains("visible")) {
        closeHandler();
      }
    });
  }

  const previewImg = document.getElementById("postcard-preview-img") as HTMLImageElement | null;
  const dataUrl = canvas.toDataURL("image/png");
  if (previewImg) {
    previewImg.src = dataUrl;
  }

  const downloadBtn = document.getElementById("btn-postcard-download");
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement("a");
      const cleanName = wonder.nameZh.replace(/\s+/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.download = `地球奇迹_${cleanName}_${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    };
  }

  modal.classList.add("visible");
}
