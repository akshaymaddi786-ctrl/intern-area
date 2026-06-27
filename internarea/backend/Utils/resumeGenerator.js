function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildResumeHtml(resume) {
  const qualifications = (resume.qualifications || [])
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.degree)}</strong> — ${escapeHtml(item.institution)} (${escapeHtml(item.year)})${item.cgpa ? `, CGPA: ${escapeHtml(item.cgpa)}` : ""}</li>`
    )
    .join("");

  const experience = (resume.experience || [])
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.jobTitle)}</strong> at ${escapeHtml(item.company)} (${escapeHtml(item.startDate)} – ${escapeHtml(item.endDate)})<br/>${escapeHtml(item.description)}</li>`
    )
    .join("");

  const skills = (resume.skills || []).map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(resume.name)} — Resume</title>
  <style>
    body { font-family: Georgia, serif; color: #111827; max-width: 800px; margin: 40px auto; line-height: 1.6; }
    header { display: flex; gap: 24px; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; }
    img { width: 96px; height: 96px; border-radius: 999px; object-fit: cover; }
    h1 { margin: 0; font-size: 32px; }
    h2 { color: #2563eb; margin-top: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .meta { color: #4b5563; font-size: 14px; }
    .skill { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 999px; margin: 4px 6px 0 0; font-size: 13px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <header>
    ${resume.photo ? `<img src="${escapeHtml(resume.photo)}" alt="${escapeHtml(resume.name)}" />` : ""}
    <div>
      <h1>${escapeHtml(resume.name)}</h1>
      <p class="meta">${escapeHtml(resume.email)} | ${escapeHtml(resume.phone)}</p>
      <p class="meta">${escapeHtml(resume.address)}, ${escapeHtml(resume.city)}, ${escapeHtml(resume.state)} ${escapeHtml(resume.pincode)}</p>
    </div>
  </header>
  ${resume.resumeSummary ? `<section><h2>Summary</h2><p>${escapeHtml(resume.resumeSummary)}</p></section>` : ""}
  ${qualifications ? `<section><h2>Qualifications</h2><ul>${qualifications}</ul></section>` : ""}
  ${experience ? `<section><h2>Experience</h2><ul>${experience}</ul></section>` : ""}
  ${skills ? `<section><h2>Skills</h2><div>${skills}</div></section>` : ""}
</body>
</html>`;
}

module.exports = { buildResumeHtml };
