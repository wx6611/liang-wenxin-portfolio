import Link from "next/link";
import HankouEditor from "./HankouEditor";

type Scene = {
  title: string;
  description: string;
  asset: string;
  alt: string;
};

type Poster = {
  title: string;
  asset: string;
};

type Section = {
  number: string;
  title: string;
  type: "text" | "scenes" | "slots" | "posters";
  kicker: string;
  heading?: string;
  body?: string;
  assets?: string[];
  scenes?: Scene[];
  posters?: Poster[];
};

const sections: Section[] = [
  {
    number: "01",
    title: "The Place",
    type: "slots",
    kicker: "THE PLACE",
    heading: "从地方开始",
    body: "江汉路与中山大道一带的历史建筑、商业、里分、文化设施与滨江空间彼此交织，共同构成今天仍然可以被感知的汉口。",
    assets: ["hankou-resource-map.webp"],
  },
  {
    number: "02",
    title: "Frame",
    type: "slots",
    kicker: "FRAME",
    heading: "从资源到体验",
    body: "不再把街区理解为景点与资源的分类，而是把分散的地点重新组织成一次连续发生的城市体验。",
    assets: ["hankou-narrative-map.webp"],
  },
  {
    number: "03",
    title: "Hankou Present",
    type: "text",
    kicker: "HANKOU PRESENT",
    heading: "汉口在场",
    body: "长江来去，汉口在场；人来人往，百年如常。",
  },
  {
    number: "04",
    title: "Four Scenes",
    type: "scenes",
    kicker: "FOUR SCENES",
    scenes: [
      {
        title: "商在场",
        description: "商业、金融与人的流动持续塑造着汉口。",
        asset: "hankou-scene-commerce.webp",
        alt: "汉口夜间商业街与人群",
      },
      {
        title: "街在场",
        description: "建筑、里分与街巷保存时间，也继续容纳今天的生活。",
        asset: "hankou-scene-street.webp",
        alt: "武汉里分街区与红瓦屋顶",
      },
      {
        title: "味在场",
        description: "地方味道发生在街角、店铺与人与人的日常往来中。",
        asset: "hankou-scene-flavor.webp",
        alt: "汉口街边餐饮与日常生活场景",
      },
      {
        title: "戏在场",
        description: "演出、娱乐与公共生活让街区始终保持正在发生的状态。",
        asset: "hankou-scene-performance.webp",
        alt: "汉口夜间现场演出与观众",
      },
    ],
  },
  {
    number: "05",
    title: "Visual Language",
    type: "slots",
    kicker: "VISUAL LANGUAGE",
    heading: "把地方变成可识别的语言",
    body: "从建筑、街巷、饮食与文化器物中提取图形线索，形成可以持续延展的视觉符号系统。",
    assets: [
      "hankou-visual-language-overview.webp",
      "symbol-commerce.svg",
      "symbol-street.svg",
      "symbol-flavor.svg",
      "symbol-performance.svg",
    ],
  },
  {
    number: "06",
    title: "Poster System",
    type: "posters",
    kicker: "POSTER SYSTEM",
    heading: "四个城市现场",
    posters: [
      { title: "商通四海", asset: "hankou-poster-commerce.webp" },
      { title: "街走百年", asset: "hankou-poster-street.webp" },
      { title: "百味生香", asset: "hankou-poster-flavor.webp" },
      { title: "万象登场", asset: "hankou-poster-performance.webp" },
    ],
  },
  {
    number: "07",
    title: "Into the Street",
    type: "slots",
    kicker: "INTO THE STREET",
    heading: "让视觉进入真实街道",
    body: "海报、旗帜与地面图形进入建筑界面和步行空间，让品牌成为人在街区中持续遇见的一部分。",
    assets: [
      "hankou-street-facade.webp",
      "hankou-street-banner.webp",
      "hankou-street-ground.webp",
    ],
  },
  {
    number: "08",
    title: "Into Daily Life",
    type: "slots",
    kicker: "INTO DAILY LIFE",
    heading: "从看到，到带走",
    body: "品牌进一步进入包装、饮品与可以被携带和留下的日常物件。",
    assets: ["hankou-daily-overview.webp"],
  },
  {
    number: "09",
    title: "Digital Experience",
    type: "slots",
    kicker: "DIGITAL EXPERIENCE",
    heading: "把街区继续组织进一次游览",
    body: "数字端通过地点、路线与地方生活内容，把分散的信息继续组织成一次可以实际进入的街区体验。",
    assets: [
      "hankou-app-discover.webp",
      "hankou-app-explore.webp",
      "hankou-app-routes.webp",
      "hankou-app-local-life.webp",
    ],
  },
];

const realAssets = new Set([
  "hankou-resource-map.webp",
  "hankou-narrative-map.webp",
  "hankou-scene-commerce.webp",
  "hankou-scene-street.webp",
  "hankou-scene-flavor.webp",
  "hankou-scene-performance.webp",
  "hankou-visual-language-overview.webp",
]);

const realAlt: Record<string, string> = {
  "hankou-resource-map.webp": "汉口江汉路至中山大道一带历史建筑与公共文化资源分布图",
  "hankou-narrative-map.webp": "汉口在场品牌叙事与街区体验框架图",
  "hankou-visual-language-overview.webp": "汉口在场街区品牌主视觉概念与视觉符号系统",
};

function ChapterCopy({ section }: { section: Section }) {
  return (
    <div className="section-copy">
      <p className="section-label">
        <span data-edit-key={`section-${section.number}-number`}>{section.number}</span>
        <span data-edit-key={`section-${section.number}-kicker`}>{section.kicker}</span>
      </p>
      {section.heading && (
        <h2 data-edit-key={`section-${section.number}-heading`}>{section.heading}</h2>
      )}
      {section.body && (
        <p className="body" data-edit-key={`section-${section.number}-body`}>
          {section.body}
        </p>
      )}
    </div>
  );
}

function AssetFigure({ asset }: { asset: string }) {
  const isReal = realAssets.has(asset);
  return (
    <figure className={isReal ? "media-figure has-media" : "media-figure is-pending"}>
      {isReal ? (
        <img
          src={`/images/hankou/${asset}`}
          alt={realAlt[asset] || ""}
          width="1600"
          height="1000"
        />
      ) : (
        <div className="placeholder-box">Asset slot</div>
      )}
      <figcaption data-edit-key={`asset-${asset}-caption`}>{asset}</figcaption>
    </figure>
  );
}

function ChapterMedia({ section }: { section: Section }) {
  if (section.type === "text") return null;

  if (section.type === "scenes") {
    return (
      <div className="editorial-scenes">
        {section.scenes?.map((scene, index) => (
          <figure className={`scene scene-${index + 1}`} key={scene.asset}>
            <img src={`/images/hankou/${scene.asset}`} alt={scene.alt} width="1122" height="1402" />
            <figcaption>
              <h3 data-edit-key={`scene-${index + 1}-title`}>{scene.title}</h3>
              <p data-edit-key={`scene-${index + 1}-description`}>{scene.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  if (section.type === "posters") {
    return (
      <div className="chapter-assets poster-grid">
        {section.posters?.map((poster, index) => (
          <figure className="media-figure is-pending" key={poster.asset}>
            <div className="placeholder-box">Asset slot</div>
            <figcaption>
              <span data-edit-key={`poster-${index + 1}-asset`}>{poster.asset}</span>
              <h3 data-edit-key={`poster-${index + 1}-title`}>{poster.title}</h3>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="chapter-assets">
      {section.assets?.map((asset) => <AssetFigure asset={asset} key={asset} />)}
    </div>
  );
}

export default function Hankou() {
  return (
    <HankouEditor>
      <main className="hankou hankou-article">
        <header className="project-header">
          <Link href="/">← Home</Link>
          <span data-edit-key="header-title">HANKOU PRESENT</span>
          <span data-edit-key="header-year">WUHAN · 2026</span>
        </header>

        <article>
          <section className="project-intro">
            <p className="project-code" data-edit-key="hero-code">
              W / 003
            </p>
            <h1>
              <span className="project-title-en" data-edit-key="hero-title-en">
                HANKOU PRESENT
              </span>
              <span className="project-title-cn" data-edit-key="hero-title-cn">
                汉口在场
              </span>
            </h1>
            <p className="eyebrow" data-edit-key="hero-meta">
              NEIGHBORHOOD BRANDING · CULTURAL RESEARCH · VISUAL SYSTEM · EXPERIENCE DESIGN ·
              WUHAN · 2026
            </p>
            <p className="summary" data-edit-key="hero-summary">
              江汉路与中山大道一带汇集了近代金融建筑、商业地标、历史里分、地方饮食、文化设施与滨江公共空间。这个项目从街区已有的文化与生活资源出发，重新组织人认识和经历汉口的方式，并将这一叙事继续转化为视觉识别、街区场景、周边产品与数字体验。
            </p>
          </section>

          <figure className="project-hero-media">
            <img
              src="/portfolio/hankou-story.png"
              alt="汉口在场品牌策略与体验系统图"
              width="3216"
              height="2180"
            />
          </figure>

          <nav className="chapter-index" aria-label="项目章节">
            {sections.map((section) => (
              <a href={`#section-${section.number}`} key={section.number}>
                <span>{section.number}</span>
                <span data-edit-key={`index-${section.number}`}>{section.title}</span>
              </a>
            ))}
          </nav>

          {sections.map((section) => (
            <section
              className={`hankou-section section-${section.number}`}
              id={`section-${section.number}`}
              key={section.number}
            >
              <ChapterCopy section={section} />
              <ChapterMedia section={section} />
            </section>
          ))}
        </article>

        <footer>
          <Link href="/">← Back to Home</Link>
          <a href="mailto:wenshin66@outlook.com">wenshin66@outlook.com</a>
        </footer>
      </main>
    </HankouEditor>
  );
}
