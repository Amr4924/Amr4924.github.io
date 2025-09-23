document.addEventListener('DOMContentLoaded', () => {
    // هذه الدالة ستعمل فقط إذا وجدت حاوية المهارات في الصفحة
    if (document.getElementById('skills-container')) {
        loadSkills();
    }
    // هذه الدالة ستعمل فقط إذا وجدت حاوية روابط التواصل في الصفحة
    if (document.getElementById('social-links-container')) {
        loadSocialLinks();
    }
});

async function loadData() {
    try {
        const response = await fetch('data.json');
        return await response.json();
    } catch (error) {
        console.error('Could not load data.json:', error);
    }
}

async function loadSkills() {
    const data = await loadData();
    if (!data || !data.skills) return;
    
    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = data.skills.map(skill => `
        <div class="skill-card">
            <img src="${skill.icon}" alt="${skill.name} icon">
            <span>${skill.name}</span>
        </div>
    `).join('');
}

async function loadSocialLinks() {
    const data = await loadData();
    if (!data || !data.socialLinks) return;

    const socialContainer = document.getElementById('social-links-container');
    socialContainer.innerHTML = data.socialLinks.map(link => `
        <a href="${link.url}" target="_blank" class="social-card">
            <img src="${link.icon}" alt="${link.name} icon">
            <span>${link.name}</span>
        </a>
    `).join('');
}