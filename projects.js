const githubUsername = 'Amr4924';
const projectsApiUrl = `https://api.github.com/users/${githubUsername}/repos?sort=updated`;

const mainFileNames = [ 'main.cpp', 'main.py', 'index.js', 'script.js', 'app.js', 'index.html', 'main.dart', 'main.java', 'Program.cs' ];
const priorityExtensions = [ '.cpp', '.py', '.dart', '.js', '.java', '.cs', '.html' ];

const projectsContainer = document.getElementById('projects-container');
const modal = document.getElementById('code-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');
const copyCodeBtn = document.getElementById('copy-code-btn'); // ✨ إضافة متغير الزر الجديد

// --- 1. دالة جلب المشاريع الرئيسية (تم تحسينها) ---
async function fetchProjects() {
    try {
        const response = await fetch(projectsApiUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${response.status} - ${errorData.message || response.statusText}`);
        }
        const projects = await response.json();
        if (projects.length === 0) {
            projectsContainer.innerHTML = '<p class="error-message">لا توجد مشاريع عامة لعرضها في هذا الحساب.</p>';
            return;
        }
        projectsContainer.innerHTML = '';
        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.innerHTML = `
                <h2>${project.name}</h2>
                <p>${project.description || 'لا يوجد وصف لهذا المشروع.'}</p>
                <div class="card-buttons">
                    <a href="#" class="btn btn-secondary view-code-btn" data-repo="${project.name}">عرض الكود</a>
                    <a href="${project.html_url}" target="_blank" class="btn btn-primary">اذهب للمشروع</a>
                </div>
            `;
            projectsContainer.appendChild(projectCard);
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsContainer.innerHTML = `
            <div class="error-message">
                <h3>عفوًا، حدث خطأ في جلب المشاريع</h3>
                <p>السبب الأكثر شيوعًا هو تجاوز الحد الأقصى لطلبات GitHub API بسبب تحديث الصفحة عدة مرات.</p>
                <p><b>الحل:</b> يرجى الانتظار لبعض الوقت (تصل إلى ساعة) ثم حاول تحديث الصفحة مرة أخرى.</p>
                <p><small>رسالة الخطأ التقنية: ${error.message}</small></p>
            </div>
        `;
    }
}

// --- 2. الدالة الذكية لعرض الكود مباشرة ---
async function showProjectCodeDirectly(repoName) {
    modalTitle.textContent = `عرض الكود للمشروع: ${repoName}`;
    modalBody.innerHTML = '<p style="padding: 20px;">جاري البحث عن الملف الرئيسي...</p>';
    modal.style.display = 'flex';
    try {
        const contentsUrl = `https://api.github.com/repos/${githubUsername}/${repoName}/contents`;
        const response = await fetch(contentsUrl);
        const files = await response.json();
        if (!Array.isArray(files)) {
            modalBody.innerHTML = '<p style="padding: 20px;">هذا المشروع فارغ أو محدود الوصول.</p>';
            return;
        }
        let mainFile = null;
        mainFile = files.find(file => mainFileNames.includes(file.name.toLowerCase()));
        if (!mainFile) {
            for (const ext of priorityExtensions) {
                mainFile = files.find(file => file.name.toLowerCase().endsWith(ext));
                if (mainFile) break;
            }
        }
        if (!mainFile) {
            mainFile = files.find(file => file.name.toLowerCase() === 'readme.md');
        }
        if (mainFile) {
            showCodeContent(repoName, mainFile.path);
        } else {
            showFilesInModal(repoName, files);
        }
    } catch (error) {
        modalBody.innerHTML = '<p style="padding: 20px;">حدث خطأ أثناء جلب ملفات المشروع.</p>';
        console.error('Error fetching repo contents:', error);
    }
}

// --- 3. دالة عرض محتوى الكود ---
async function showCodeContent(repoName, filePath) {
    modalBody.innerHTML = '<p style="padding: 20px;">جاري تحميل الكود...</p>';
    try {
        const contentUrl = `https://api.github.com/repos/${githubUsername}/${repoName}/contents/${filePath}`;
        const response = await fetch(contentUrl);
        const data = await response.json();
        if (data.content) {
            const decodedContent = decodeURIComponent(window.atob(data.content).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const fileExtension = filePath.split('.').pop();
            const codeElement = document.createElement('code');
            codeElement.textContent = decodedContent;
            modalBody.innerHTML = `<pre class="line-numbers language-${fileExtension}"></pre>`;
            modalBody.querySelector('pre').appendChild(codeElement);
            Prism.highlightAll();
        }
    } catch (error) {
        modalBody.innerHTML = '<p style="padding: 20px;">لا يمكن عرض محتوى هذا الملف.</p>';
    }
}

// --- 4. دالة عرض قائمة الملفات كخطة بديلة ---
function showFilesInModal(repoName, files) {
    modalTitle.textContent = `اختر ملفًا من مشروع: ${repoName}`;
    modalBody.innerHTML = `
        <p style="padding: 0 20px;">لم يتم العثور على ملف رئيسي، يرجى الاختيار يدويًا:</p>
        <ul class="file-list">
            ${files.map(file => `<li><a href="#" class="file-link" data-repo="${repoName}" data-path="${file.path}">${file.name}</a></li>`).join('')}
        </ul>
    `;
}

// --- 5. ربط الأحداث ---
projectsContainer.addEventListener('click', e => {
    if (e.target.classList.contains('view-code-btn')) {
        e.preventDefault();
        const repoName = e.target.dataset.repo;
        showProjectCodeDirectly(repoName);
    }
});
modalBody.addEventListener('click', e => {
    if (e.target.classList.contains('file-link')) {
        e.preventDefault();
        const repoName = e.target.dataset.repo;
        const filePath = e.target.dataset.path;
        showCodeContent(repoName, filePath);
    }
});
modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
modal.addEventListener('click', e => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// --- 6. إضافة حدث النقر لزر نسخ الكود ---
copyCodeBtn.addEventListener('click', () => {
    const codeElement = modalBody.querySelector('pre code');
    if (codeElement) {
        const codeToCopy = codeElement.textContent;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            copyCodeBtn.querySelector('span').textContent = 'تم النسخ!';
            copyCodeBtn.classList.add('copied');
            setTimeout(() => {
                copyCodeBtn.querySelector('span').textContent = 'نسخ الكود';
                copyCodeBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('فشل في نسخ الكود:', err);
            copyCodeBtn.querySelector('span').textContent = 'حدث خطأ!';
        });
    }
});

// --- 7. تشغيل ---
fetchProjects();