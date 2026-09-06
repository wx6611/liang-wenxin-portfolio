"use client";
import Link from "next/link";
import { useState } from "react";
import { categories, projects } from "../portfolio";

export default function Directory() {
  const [open, setOpen] = useState<string | null>(null);
  return <section className="directory" id="directory"><p className="eyebrow">DIRECTORY</p>{categories.map((category, index) => {
    const active = open === category.id;
    return <div className={`category ${active ? "is-open" : ""}`} key={category.id} onMouseEnter={() => setOpen(category.id)} onMouseLeave={() => setOpen(null)}>
      <button className="category-header" onClick={() => setOpen(active ? null : category.id)} onFocus={() => setOpen(category.id)} aria-expanded={active}><span>0{index + 1}</span><span><b>{category.title}</b><em>{category.id === "research" ? "Area Studies and Data Visualization" : category.id === "spatial" ? "Spatial Products and Experience Design" : category.id === "branding" ? "Neighborhood Branding" : "Research and Product Application"}</em></span><span aria-hidden="true">{active ? "−" : "＋"}</span></button>
      <div className="project-list">{projects.filter(project => project.category === category.id).map(project => project.id === "hankou" ? <Link key={project.id} href="/work/hankou-present">{project.title}<span>↗</span></Link> : <span key={project.id}>{project.title}</span>)}</div>
    </div>;
  })}</section>;
}
