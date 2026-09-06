"use client";

import { useEffect, useRef, useState } from "react";
import { categories, figmaLink, projects } from "./portfolio";

export default function Home() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const selected = projects.find((project) => project.id === selectedId);

  useEffect(() => {
    const moveCursor = (event: MouseEvent) => {
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (galleryOpen && dialog && !dialog.open) dialog.showModal();
    if (!galleryOpen && dialog?.open) dialog.close();
  }, [galleryOpen]);

  const openGallery = (id: string | null = null) => {
    setSelectedId(id);
    setGalleryOpen(true);
    contentRef.current?.scrollTo(0, 0);
  };

  return (
    <main id="top">
      <header className="site-header" aria-label="主导航">
        <a className="nav-link nav-about" href="#about">About</a>
        <a className="brand-mark" href="#top" aria-label="回到首页" />
        <button className="nav-link nav-works" onClick={() => openGallery()}>Works</button>
      </header>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title"><span className="hero-name">梁文馨</span><span>Spatial / Visual</span><span>Designer</span></h1>
        <button className="hero-preview" type="button" aria-label="查看作品集" onClick={() => openGallery()}>
          <img src="/portfolio/taihu-mountain.png" alt="太湖科学城山水主题街区的概念研究图" width="3072" height="1526" />
          <span className="preview-caption">PORTFOLIO · 2018—2026</span>
        </button>
      </section>
      <div className="about-content">
        <section className="chapter chapter-a" id="about" aria-labelledby="chapter-a">
          <h2 className="chapter-letter" id="chapter-a">A</h2>
          <div className="chapter-copy intro-copy"><p>我是梁文馨，设计实践连接区域研究、空间体验与视觉叙事。从产业与科创资源的梳理，到创新街区和办公场景的塑造，再到街区品牌与数字产品，我关注如何把复杂信息转化为清晰的设计，让研究成为可感知、可使用的体验。</p></div>
          <figure className="chapter-media portrait-media">
            <figcaption>（山水主题街区 · 概念研究）</figcaption>
            <button className="media-button" onClick={() => openGallery("taihu-brand")} aria-label="查看太湖科学城山水主题街区"><img src="/portfolio/taihu-mountain.png" alt="太湖科学城概念研究中的山水图像" width="3072" height="1526" loading="lazy" /></button>
          </figure>
        </section>
        <section className="chapter chapter-b" aria-labelledby="chapter-b">
          <h2 className="chapter-letter" id="chapter-b">B</h2>
          <div className="chapter-copy practice-copy">
            <p>作品集收录 2018—2026 年间的研究与设计，涵盖区域研究与数据可视化、空间产品与体验设计、街区品牌设计、学术研究与产品应用四个方向。</p>
            <p>从太湖与光明科学城，到江汉路的“汉口在场”，再到芯片产业链平台与雅思词汇学习工具，我尝试通过信息组织、场景构建和交互设计，将专业知识与地方记忆转化为可持续使用的成果。</p>
          </div>
          <div className="project-cluster" id="projects">
            <figure className="chapter-media habitat-media">
              <figcaption>（汉口在场 · 品牌叙事）</figcaption>
              <button className="media-button" onClick={() => openGallery("hankou")} aria-label="查看汉口在场项目"><img src="/portfolio/hankou-story.png" alt="汉口在场品牌叙事与应用体系" width="3216" height="2180" loading="lazy" /></button>
            </figure>
            <div className="project-index" aria-label="作品目录"><p>SELECTED WORKS / 2018—2026</p><ol>{projects.map((project) => <li key={project.id}><button onClick={() => openGallery(project.id)}>{project.title}</button></li>)}</ol></div>
          </div>
        </section>
        <section className="chapter chapter-c" aria-labelledby="chapter-c">
          <h2 className="chapter-letter" id="chapter-c">C</h2>
          <div className="chapter-copy contact-copy"><p>Contact information</p><address><span>梁文馨</span><a href="mailto:wenshin66@outlook.com">wenshin66@outlook.com</a><a className="original-portfolio" href={figmaLink("150:1018")} target="_blank" rel="noreferrer">作品集原稿 ↗</a></address></div>
        </section>
      </div>
      <div className="custom-cursor" ref={cursorRef} aria-hidden="true"><span /></div>
      <dialog className="portfolio-dialog" ref={dialogRef} onClose={() => setGalleryOpen(false)} aria-labelledby="portfolio-heading">
        <div className="portfolio-toolbar"><button onClick={() => openGallery()} aria-label="返回全部作品">{selected ? "← 全部作品" : "梁文馨 / 作品集"}</button><button onClick={() => setGalleryOpen(false)} aria-label="关闭作品集">Close / 关闭</button></div>
        <div className="portfolio-content" ref={contentRef}>
          {selected ? (
            <article className="project-case" key={selected.id}>
              <p className="case-meta">{categories.find((category) => category.id === selected.category)?.title} / {selected.year}</p><h2 id="portfolio-heading">{selected.title}</h2>
              <div className="case-copy">{selected.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              <a className="source-link" href={figmaLink(selected.node)} target="_blank" rel="noreferrer">在 Figma 查看项目原稿 ↗</a>
              <div className="case-images">{selected.images.map((asset) => <figure key={asset.src}><a href={asset.src} target="_blank" rel="noreferrer" aria-label={`打开原图：${asset.caption}`}><img src={asset.src} alt={asset.caption} width={asset.width} height={asset.height} loading="lazy" /></a><figcaption>{asset.caption} · 点击查看原图</figcaption></figure>)}</div>
              <button className="next-project" onClick={() => openGallery(projects[(projects.indexOf(selected) + 1) % projects.length].id)}>下一个项目：{projects[(projects.indexOf(selected) + 1) % projects.length].title} →</button>
            </article>
          ) : (
            <div className="work-directory"><p className="case-meta">SELECTED WORKS / 2018—2026</p><h2 id="portfolio-heading">研究、空间与叙事。</h2>
              {categories.map((category, index) => <section className="work-category" key={category.id} aria-labelledby={`category-${category.id}`}><div className="category-heading"><span>0{index + 1}</span><div><h3 id={`category-${category.id}`}>{category.title}</h3><p>{category.english}</p></div></div><div>{projects.filter((project) => project.category === category.id).map((project) => <button className="work-row" key={project.id} onClick={() => openGallery(project.id)}><span>{project.title}</span><span className="work-year">{project.year}</span><span aria-hidden="true">↗</span></button>)}</div></section>)}
            </div>
          )}
        </div>
      </dialog>
    </main>
  );
}
