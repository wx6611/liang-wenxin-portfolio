const projects = [
  {
    number: "01",
    title: "Morrow Archive",
    type: "Brand System / Digital",
    year: "2026",
    color: "project-orange",
    summary:
      "A living identity and digital archive for an independent cultural institution, built around fragments, marginalia and an editorial grid.",
  },
  {
    number: "02",
    title: "Between Tides",
    type: "Art Direction / Editorial",
    year: "2025",
    color: "project-blue",
    summary:
      "An editorial series translating field recordings and coastal observations into a tactile, image-led publication system.",
  },
  {
    number: "03",
    title: "Field Notes No. 7",
    type: "Exhibition / Spatial",
    year: "2025",
    color: "project-red",
    summary:
      "A compact exhibition identity where wayfinding, printed matter and digital motion behave as one continuous visual language.",
  },
  {
    number: "04",
    title: "Common Ground",
    type: "Campaign / Social",
    year: "2024",
    color: "project-green",
    summary:
      "A community-led campaign that makes complex public-space research approachable through clear stories and a flexible toolkit.",
  },
];

const services = [
  "Creative Direction",
  "Brand Identity",
  "Digital Experience",
  "Editorial Design",
  "Motion & Image",
];

export default function Home() {
  return (
    <main>
      <header className="site-header" aria-label="Primary navigation">
        <a className="nav-link nav-active" href="#about">
          About
        </a>
        <a className="monogram" href="#top" aria-label="Back to top">
          <span>Y</span>
          <span>N</span>
        </a>
        <a className="nav-link" href="#works">
          Works
        </a>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <h1 id="hero-title">
          <span>Your Name</span>
          <span>Creative / Visual</span>
          <span>Designer</span>
        </h1>
        <div className="hero-stamp" aria-hidden="true">
          <span>Selected Work</span>
          <strong>’26</strong>
        </div>
        <div className="hero-meta">
          <p>Independent designer</p>
          <p>Shanghai · Available worldwide</p>
        </div>
      </section>

      <section className="chapter about" id="about" aria-labelledby="about-label">
        <div className="chapter-marker">
          <h2 id="about-label">A</h2>
          <p>(Profile / 个人介绍)</p>
        </div>

        <div className="portrait" aria-label="Abstract placeholder for your portrait">
          <div className="portrait-crop">
            <span className="portrait-initial">Y</span>
            <span className="portrait-dot dot-one" />
            <span className="portrait-dot dot-two" />
            <span className="portrait-dot dot-three" />
          </div>
          <p>Replace with your portrait</p>
        </div>

        <div className="statement">
          <p>
            我是一名专注于<span>视觉系统</span>、数字体验与品牌叙事的设计师。
            我把复杂的信息整理成清晰、有性格、能被人记住的体验。
          </p>
          <p className="statement-en">
            I work where identity, image and interaction meet — turning ideas
            into visual systems that feel precise, human and alive.
          </p>
        </div>
      </section>

      <section className="chapter practice" aria-labelledby="practice-label">
        <div className="chapter-marker">
          <h2 id="practice-label">B</h2>
          <p>(Practice / 工作方式)</p>
        </div>

        <div className="practice-note">
          <p>
            从一句模糊的想法开始，经过研究、编辑与反复试验，最终形成一套完整而灵活的设计语言。
          </p>
          <span>Research → System → Expression</span>
        </div>

        <div className="services" aria-label="Services">
          <p className="eyebrow">Capabilities</p>
          <ol>
            {services.map((service, index) => (
              <li key={service}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {service}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="works" id="works" aria-labelledby="works-title">
        <div className="works-heading">
          <p className="eyebrow">Selected work / 2024—2026</p>
          <h2 id="works-title">Projects</h2>
          <p>点击项目查看简介 / Click to unfold</p>
        </div>

        <div className="project-list">
          {projects.map((project) => (
            <details className={`project ${project.color}`} key={project.title}>
              <summary>
                <span className="project-number">({project.number})</span>
                <span className="project-title">{project.title}</span>
                <span className="project-type">{project.type}</span>
                <span className="project-year">{project.year}</span>
                <span className="project-toggle" aria-hidden="true" />
              </summary>
              <div className="project-detail">
                <div className="project-art" aria-hidden="true">
                  <span className="art-label">{project.number}</span>
                  <span className="art-line" />
                  <span className="art-disc" />
                </div>
                <p>{project.summary}</p>
                <p className="detail-note">Case study available on request.</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <footer className="chapter contact" id="contact" aria-labelledby="contact-label">
        <div className="chapter-marker">
          <h2 id="contact-label">C</h2>
          <p>(Contact / 联系方式)</p>
        </div>

        <div className="contact-copy">
          <p>有合适的项目，或者只是想聊聊？</p>
          <a href="mailto:hello@yourname.design">hello@yourname.design</a>
        </div>

        <div className="contact-links">
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          <a href="#top">Back to top ↑</a>
        </div>

        <div className="footer-line">
          <span>© 2026 Your Name</span>
          <span>Designed with curiosity</span>
          <span>Shanghai, CN</span>
        </div>
      </footer>
    </main>
  );
}
