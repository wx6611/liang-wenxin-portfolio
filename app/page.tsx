"use client";

import { useEffect, useRef, useState } from "react";

const projects = [
  "MORROW ARCHIVE",
  "BETWEEN TIDES",
  "FIELD NOTES NO. 7",
  "COMMON GROUND",
  "THE OPEN",
  "PERSONAL PLAYGROUND",
  "STUDIO NOTES",
];

export default function Home() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cursorLabel, setCursorLabel] = useState("");
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveCursor = (event: MouseEvent) => {
      if (!cursorRef.current) return;
      cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <main id="top">
      <header className="site-header" aria-label="Primary navigation">
        <a className="nav-link nav-about" href="#about">
          About
        </a>
        <a className="brand-mark" href="#top" aria-label="Back to top" />
        <a className="nav-link nav-works" href="#projects">
          Works
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          <span>Your Name</span>
          <span>Creative / Visual</span>
          <span>Designer</span>
        </h1>

        <button
          className="hero-preview"
          type="button"
          aria-label="Open portfolio preview"
          onClick={() => setPreviewOpen(true)}
          onMouseEnter={() => setCursorLabel("( PLAY )")}
          onMouseLeave={() => setCursorLabel("")}
        >
          <img src="/reference/about-banner.avif" alt="Portfolio preview" />
        </button>
      </section>

      <div className="about-content">
        <section className="chapter chapter-a" id="about" aria-labelledby="chapter-a">
          <h2 className="chapter-letter" id="chapter-a">
            A
          </h2>

          <div className="chapter-copy intro-copy">
            <p>
              Your Name is an independent designer whose work sits at the
              intersection of visual identity, digital experience, and
              collaborative making. Their practice turns complex ideas into
              clear, memorable systems with a distinct point of view.
            </p>
          </div>

          <figure className="chapter-media portrait-media">
            <figcaption>(A portrait in the studio)</figcaption>
            <img src="/reference/about-portrait.avif" alt="Portrait in the studio" />
          </figure>
        </section>

        <section className="chapter chapter-b" aria-labelledby="chapter-b">
          <h2 className="chapter-letter" id="chapter-b">
            B
          </h2>

          <div className="chapter-copy practice-copy">
            <p>
              Working across brand, image, editorial, and interaction, the
              practice approaches every commission as a conversation between
              research and form. Each outcome is precise, direct, and built to
              remain useful beyond its first release.
            </p>
            <p>
              Alongside client work, independent experiments and cultural
              collaborations shape an ongoing understanding of creative work
              as a collective process rather than a solitary act.
            </p>
          </div>

          <div className="project-cluster" id="projects">
            <figure className="chapter-media habitat-media">
              <figcaption>(In the daily habitat)</figcaption>
              <img src="/reference/about-habitat.avif" alt="Designer in a concrete space" />
            </figure>

            <div className="project-index" aria-label="Project list">
              <p>PROJECT LIST</p>
              <ol>
                {projects.map((project) => (
                  <li key={project}>{project}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="chapter chapter-c" aria-labelledby="chapter-c">
          <h2 className="chapter-letter" id="chapter-c">
            C
          </h2>

          <div className="chapter-copy contact-copy">
            <p>Contact information</p>
            <address>
              <a href="tel:+8613800000000">(+86) 138 0000 0000</a>
              <a href="mailto:hello@yourname.design">hello@yourname.design</a>
              <span>Shanghai, China</span>
            </address>
          </div>
        </section>
      </div>

      <div
        className={`custom-cursor${cursorLabel ? " cursor-wide" : ""}`}
        ref={cursorRef}
        aria-hidden="true"
      >
        {cursorLabel || <span />}
      </div>

      {previewOpen && (
        <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Portfolio preview">
          <button type="button" onClick={() => setPreviewOpen(false)}>
            Close
          </button>
          <img src="/reference/about-banner.avif" alt="Portfolio preview enlarged" />
        </div>
      )}
    </main>
  );
}
