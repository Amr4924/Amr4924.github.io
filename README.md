# SA3DWY — Portfolio

موقع بورتفوليو شخصي مبني بـ [Astro](https://astro.build) (متنشر على Vercel / GitHub Pages).
كل محتوى الموقع (الاسم، المشاريع، المهارات، رحلتي، الشهادات، روابط التواصل…) متخزّن في ملف واحد: **`data.json`**،
وفيه **لوحة تحكم** على `/admin` بتعدّله من غير ما تفتح الكود.

---

## 1) لوحة التحكم (`/admin`)

الرابط: `<دومين موقعك>/admin/` — مثلًا `https://xxxx.vercel.app/admin/`

### أول مرة (مرة واحدة بس): تعمل توكن
1. افتح <https://github.com/settings/personal-access-tokens/new>
2. **Token name**: أي اسم (مثلًا `portfolio-admin`) — **Expiration**: مثلًا 90 يوم.
3. **Repository access** ← *Only select repositories* ← اختار `Amr4924.github.io` بس.
4. **Permissions ← Repository permissions**:
   - **Contents: Read and write** (لازم)
   - **Actions: Read-only** (اختياري — بس لو بتنشر بـ GitHub Actions)
5. **Generate token** ← انسخه ← الصقه في صفحة `/admin` ← **دخول**.

> التوكن بيتخزن في متصفحك بس (وبيتبعت لـ GitHub بس). مش بيتحط في الكود ولا في الموقع.
> لو ضاع منك أو شكّيت فيه: امسحه من <https://github.com/settings/personal-access-tokens> واعمل واحد جديد.
> التوكن ده مقصور على الريبو ده فقط وما يقدرش يعدّل ملفات الـ workflows.

### بتعدّل إيه من اللوحة
| التبويب | إيه اللي بتتحكم فيه |
|---|---|
| **عام** | الاسم، الـ Handle، المسمى الوظيفي، الصورة الشخصية، النبذة القصيرة، سطر التعليم في الـ CV |
| **الرئيسية** | عنوان الـ Hero، والشارات الصغيرة (Chips) |
| **المشاريع** | إضافة / تعديل / حذف / ترتيب المشاريع، النوع (Flutter أو Web)، **صور المشروع (أكتر من صورة)**، رابط الـ Demo، صفحة التفاصيل، وإظهاره في الرئيسية |
| **المهارات** | اللغات والـ Frameworks + الأدوات والمنصات (اسم + أيقونة) |
| **رحلتي** | القصة، المراحل (Timeline)، وقسم "فين أنا دلوقتي" |
| **الشهادات** | إضافة / حذف / ترتيب الشهادات بصورها |
| **التواصل** | روابط التواصل (الأساسية والتانية) |

### الحفظ
- بتعدّل براحتك، وبعدين تدوس **حفظ ونشر** (زرار تحت). ده بيعمل **commit واحد** على `main` فيه كل التعديلات مع الصور.
- النشر بياخد دقيقة أو اتنين (Vercel أو GitHub Actions حسب استضافتك). مؤشر حالة النشر فوق بيراقب **GitHub Actions بس** — على Vercel هيبان «غير متاحة» وده طبيعي، تابع النشر من Vercel.
- كل حفظ ليه commit بإسم `dashboard: update …` في تاريخ الريبو، يعني تقدر ترجّع أي تعديل من GitHub.
- زرار **نسخة احتياطية** بينزّل `data.json` الحالي على جهازك.
- لو `data.json` اتغيّر من مكان تاني (مثلًا عدّلته بإيدك وعملت push) بعد ما فتحت اللوحة، هترفض تكتب فوقه وتقولك. اعمل خروج ودخول عشان تحمّل آخر نسخة.

### الصور
- **صور المشروع:** تقدر تختار كذا صورة مرة واحدة. أول صورة هي **الغلاف** اللي بتظهر على كارت المشروع، والباقي بيتظبط ترتيبه بأزرار ↑ ↓. في صفحة التفاصيل بتظهر كلها في سلايدر: 3 جنب بعض على الكمبيوتر (مع أسهم لو أكتر من 3) وبالسحب بالإصبع على الموبايل. لو مفيش صور بيظهر الشكل الافتراضي.
- بتختار الصورة من جهازك. لو كبيرة (أكتر من حوالي 300KB) بتتصغّر وتتحوّل WebP تلقائيًا في المتصفح قبل الرفع.
- صور المشاريع بتتحط في `public/projects/`، والشهادات في `public/certificates/`، والصورة الشخصية في `public/profile/`.
- لما تحذف شهادة أو تبدّل صورة، الصورة القديمة بتتمسح من الريبو في نفس الـ commit (لو مش مستخدمة في حتة تانية).

---

## 2) الاستضافة

### Vercel (لو ده موقعك الأساسي)
- Vercel بيبني الموقع وينشره **تلقائيًا مع كل push على `main`** — ومن ضمنها commits لوحة التحكم. مفيش حاجة تضبطها.
- تأكد إنه مربوط بالريبو: Vercel ← المشروع ← **Settings ← Git** لازم يبان فيه `Amr4924/Amr4924.github.io`.
  لو كنت رافعه بالـ CLI (`vercel --prod`) من غير ربط، اعمل **Connect Git Repository** وإلا الـ push مش هينشر.
- Vercel بيكتشف Astro لوحده (Build: `astro build`، Output: `dist`).

### GitHub Pages (اختياري — لو عايز `amr4924.github.io` كمان)
1. **Settings ← Pages ← Source ← GitHub Actions.**
2. حط الملف ده في `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

> لو الـ Source فضل على *Deploy from a branch* هتلاقي "pages build and deployment" بتفشل في تاب Actions (Jekyll بيحاول يبني الريبو).
> يا إما تفعّل Actions زي فوق، يا إما تقفل Pages: **Settings ← Pages ← Unpublish site**.

## 3) شكل `data.json` (لو حبيت تعدّله بإيدك)

```text
name, handle, role, profilePicture
hero            { eyebrow, titleBefore, titleAccent, titleAfter, chips[] }   // {projects} = عدد المشاريع
cv              { education }
aboutMe         { lede, story, timeline[ {stage,title,desc} ], radar{confident[],learning[],exploring[]} }
skills          { languages[ {name,icon} ], tools[ {name,icon} ] }
socialLinks     { primary[ {name,url,icon} ], more[ … ] }                     // الإيميل: "mailto:…" واسمه Email
projects[]      { slug, name, category: "flutter" | "web", tagline, description, status,
                  coverIcon, coverTone: "rose" | "gold",
                  images[]  // كل صور المشروع بالترتيب، و image = أول واحدة (غلاف الكارت)
                  tech[], featured, links{demo},
                  caseStudy{ problem, approach, features[], result } }
certificates[]  { title, issuer, category, imageUrl }
```

- الأيقونات من [Iconify](https://icon-sets.iconify.design/): `https://api.iconify.design/simple-icons/<name>.svg?color=%23f3ece1`
- ترتيب المصفوفات هو ترتيب الظهور في الموقع.
- مشاريع الـ `featured: true` هي اللي بتظهر في الصفحة الرئيسية (لو مفيش، بيظهر أول 3).

---

## 4) تشغيل محلي

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # الناتج في dist/
```

الصفحات: `/` · `/about` · `/projects` · `/project/<slug>` · `/certificates` · `/cv` · `/contact` · `/admin`
