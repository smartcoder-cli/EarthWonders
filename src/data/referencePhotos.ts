export interface ReferencePhoto {
  image: string;
  fallbackImage?: string;
  page: string;
  credit: string;
  alt: string;
}

export function resolvePhotoUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = import.meta.env.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}

export const REFERENCE_PHOTOS: Record<string, ReferencePhoto> = {
  giza: {
    image: "/photos/giza.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Great_Pyramid_of_Giza.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Great_Pyramid_of_Giza.jpg",
    credit: "照片：kallerna / Wikimedia Commons · CC BY-SA 3.0",
    alt: "吉萨胡夫大金字塔实景照片",
  },
  wall: {
    image: "/photos/wall.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/50/Badaling_China_Great-Wall-of-China-01.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Badaling_China_Great-Wall-of-China-01.jpg",
    credit: "照片：CEphoto, Uwe Aranas / Wikimedia Commons · CC BY-SA 3.0",
    alt: "八达岭长城实景照片",
  },
  petra: {
    image: "/photos/petra.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Al_Khaznah_-_PETRA_%2834417013340%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Al_Khaznah_-_PETRA_(34417013340).jpg",
    credit: "照片：ali keke / Wikimedia Commons · Public domain",
    alt: "佩特拉玫瑰色砂岩峡谷与卡兹尼神殿全景实景照片",
  },
  colosseum: {
    image: "/photos/colosseum.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Colosseum_in_Rome,_Italy_-_April_2007.jpg",
    credit: "照片：Diliff / Wikimedia Commons · CC BY-SA 2.5",
    alt: "罗马斗兽场全景外观实景照片",
  },
  chichen: {
    image: "/photos/chichen.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/4/4d/El_Castillo_Stitch_2008_Edit_2.jpg",
    page: "https://commons.wikimedia.org/wiki/File:El_Castillo_Stitch_2008_Edit_2.jpg",
    credit: "照片：Fcb981 / Wikimedia Commons · CC BY-SA 3.0",
    alt: "奇琴伊察库库尔坎金字塔实景照片",
  },
  machu: {
    image: "/photos/machu.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/2/21/Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_%287%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_(7).jpg",
    credit: "照片：Pierre Andre Leclercq / Wikimedia Commons · CC BY-SA 4.0",
    alt: "马丘比丘与瓦伊纳比丘全景实景照片",
  },
  taj: {
    image: "/photos/taj.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Taj_Mahal_%28Edited%29.jpeg",
    page: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_(Edited).jpeg",
    credit: "照片：Yann / Jim Carter / Wikimedia Commons · CC BY-SA 4.0",
    alt: "泰姬陵正面中轴水系与宣礼塔实景照片",
  },
  christ: {
    image: "/photos/christ.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Christ_the_Redeemer-%28Corcovado%29_front_view.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg",
    credit: "照片：Artyominc / Wikimedia Commons · CC BY-SA 3.0",
    alt: "里约热内卢科尔科瓦多山基督像正面实景照片",
  },
  pentagon: {
    image: "/photos/pentagon.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/b/bf/The_Pentagon%2C_Headquarters_of_the_US_Department_of_Defense.jpg",
    page: "https://commons.wikimedia.org/wiki/File:The_Pentagon,_Headquarters_of_the_US_Department_of_Defense.jpg",
    credit: "照片：Touch Of Light / Wikimedia Commons · CC BY-SA 4.0",
    alt: "美国五角大楼鸟瞰实景照片",
  },
  fast: {
    image: "/photos/fast.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/d/d1/202508_FAST_%28Five-hundred-meter_Aperture_Spherical_radio_Telescope%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:202508_FAST_(Five-hundred-meter_Aperture_Spherical_radio_Telescope).jpg",
    credit: "照片：SCJiang / Wikimedia Commons · CC BY-SA 4.0",
    alt: "中国天眼 FAST 500米口径球面射电望远镜实景照片",
  },
  burj: {
    image: "/photos/burj.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Dubai%2C_United_Arab_Emirates_%28Unsplash_suv4vuJsH6g%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Dubai,_United_Arab_Emirates_(Unsplash_suv4vuJsH6g).jpg",
    credit: "照片：Caleb Whiting / Wikimedia Commons · CC0",
    alt: "迪拜哈利法塔与迪拜市中心及人工湖全景实景照片",
  },
  apple: {
    image: "/photos/apple.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Aerial_view_of_Apple_Park_dllu.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Apple_Park_dllu.jpg",
    credit: "照片：Daniel Lu (dllu) / Wikimedia Commons · CC BY-SA 4.0",
    alt: "苹果总部 Apple Park 飞船环形园区鸟瞰实景照片",
  },
  sydney: {
    image: "/photos/sydney.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Sydney_Opera_House_2026.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_2026.jpg",
    credit: "照片：BAVhah / Wikimedia Commons · CC BY-SA 4.0",
    alt: "悉尼歌剧院便利朗角贝壳风帆全景实景照片",
  },
  globalcenter: {
    image: "/photos/globalcenter.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/7/78/New_Century_Global_Centre_-_panoramio.jpg",
    page: "https://commons.wikimedia.org/wiki/File:New_Century_Global_Centre_-_panoramio.jpg",
    credit: "照片：Raki_Man / Wikimedia Commons · CC BY 3.0",
    alt: "成都新世纪环球中心海鸥波浪曲面实景照片",
  },
  hzmb: {
    image: "/photos/hzmb.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg/1280px-Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg",
    credit: "照片：Wpcpey / Wikimedia Commons · CC BY-SA 4.0",
    alt: "港珠澳大桥东人工岛与沉管隧道入口俯瞰实景照片",
  },
  goldengate: {
    image: "/photos/goldengate.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Golden_Gate_Bridge_as_seen_from_Marshall%E2%80%99s_Beach%2C_March_2018.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_as_seen_from_Marshall%E2%80%99s_Beach,_March_2018.jpg",
    credit: "照片：Frank Schulenburg / Wikimedia Commons · CC BY-SA 4.0",
    alt: "旧金山金门大桥国际橘双塔与悬索实景照片",
  },
  svalbard: {
    image: "/photos/svalbard.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Svalbard_seed_vault.jpg/1920px-Svalbard_seed_vault.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Svalbard_seed_vault.jpg",
    credit: "照片：Einar Jørgen Haraldseid / Wikimedia Commons · CC BY-SA 2.0",
    alt: "斯瓦尔巴全球种子库极地斜向混凝土棱柱与《永久回响》艺术装置全景实景照片 (Svalbard Seed Vault)",
  },
  liberty: {
    image: "/photos/liberty.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Liberty_Island_photo_Don_Ramey_Logan.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Liberty_Island_photo_Don_Ramey_Logan.jpg",
    credit: "照片：Don Ramey Logan / Wikimedia Commons · CC BY 4.0",
    alt: "纽约自由岛与伍德堡星形要塞及自由女神像航拍全景实景照片",
  },
  defense: {
    image: "/photos/defense.jpg",
    fallbackImage: "https://thumb.wikimedia.org/wikipedia/fr/thumb/1/10/Grande_Arche_Janvier_2023.jpeg/1280px-Grande_Arche_Janvier_2023.jpeg",
    page: "https://fr.wikipedia.org/wiki/Fichier:Grande_Arche_Janvier_2023.jpeg",
    credit: "照片：Arthur Weidmann / Wikimedia · CC BY-SA 3.0",
    alt: "巴黎拉德芳斯新凯旋门全景实景照片 (Grande Arche de la Défense)",
  },
  eiffel: {
    image: "/photos/eiffel.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Eiffel_tower_from_trocadero.jpg/1280px-Eiffel_tower_from_trocadero.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Eiffel_tower_from_trocadero.jpg",
    credit: "照片：NonOmnisMoriar / Wikimedia Commons · CC BY-SA 3.0",
    alt: "巴黎特罗卡德罗广场眺望埃菲尔铁塔全景实景照片",
  },
  parthenon: {
    image: "/photos/parthenon.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/1280px-The_Parthenon_in_Athens.jpg",
    page: "https://commons.wikimedia.org/wiki/File:The_Parthenon_in_Athens.jpg",
    credit: "照片：Steve Swayne / Wikimedia Commons · CC BY 2.0",
    alt: "雅典卫城帕特农神庙多立克柱廊实景照片",
  },
  futuremuseum: {
    image: "/photos/futuremuseum.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/en/8/8c/Museum_of_the_future%2C_Dubai.jpeg",
    page: "https://en.wikipedia.org/wiki/File:Museum_of_the_future,_Dubai.jpeg",
    credit: "照片：Lyonerov / Wikipedia · CC BY-SA 4.0",
    alt: "迪拜未来博物馆椭圆环体、阿拉伯书法立面与绿丘台地全景实景照片",
  },
  sagrada: {
    image: "/photos/sagrada.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Gaudis_Sagrada_Familia%2C_reflection.jpg/1280px-Gaudis_Sagrada_Familia%2C_reflection.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Gaudis_Sagrada_Familia,_reflection.jpg",
    credit: "照片：Jesus Solana / Wikimedia Commons · CC BY 2.0",
    alt: "巴塞罗那圣家宗座圣殿诞生立面与中央塔群水池倒影全景实景照片 (Gaudí's Sagrada Família, Reflection)",
  },
  himeji: {
    image: "/photos/himeji.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Ch%C3%A2teau_de_Himeji02.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Ch%C3%A2teau_de_Himeji02.jpg",
    credit: "照片：Bernard Gagnon / Wikimedia Commons · CC BY-SA 3.0",
    alt: "姬路城大天守、西小天守与扇之勾配石垣全景实景照片 (Château de Himeji)",
  },
};

export function getReferencePhoto(id: string): ReferencePhoto | undefined {
  return REFERENCE_PHOTOS[id];
}
