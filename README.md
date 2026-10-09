# SA3DWY — Portfolio

موقع بورتفوليو شخصي مبني بـ [Astro](https://astro.build) ومتنشر على GitHub Pages.
كل محتوى الموقع (الاسم، المشاريع، المهارات، رحلتي، الشهادات، روابط التواصل…) متخزّن في ملف واحد: **`data.json`**،
وفيه **لوحة تحكم** على `/admin` بتعدّله من غير ما تفتح الكود.

---

## 1) لوحة التحكم (`/admin`)

الرابط: `https://amr4924.github.io/admin/`

### أول مرة (مرة واحدة بس): تعمل توكن
1. افتح <https://github.com/settings/personal-access-tokens/new>
2. **Token name**: أي اسم (مثلًا `portfolio-admin`) — **Expiration**: مثلًا 90 يوم.
3. **Repository access** ← *Only select repositories* ← اختار `Amr4924.github.io` بس.
4. **Permissions ← Repository permissions**:
   - **Contents: Read and write** (لازم)
   - **Actions: Read-only** (اختياري — علشان تشوف حالة النشر فوق في اللوحة)
5. **Generate token** ← انسخه ← الصقه في صفحة `/admin` ← **دخول**.

> التوكن بيتخزن في متصفحك بس (وبيتبعت لـ GitHub بس). مش بيتحط في الكود ولا في الموقع.
> لو ضاع منك أو شكّيت فيه: امسحه من <https://github.com/settings/personal-access-tokens> واعمل واحد جديد.
> التوكن ده مقصور على الريبو ده فقط وما يقدرش يعدّل ملفات الـ workflows.

### بتعدّل إيه من اللوحة
| التبويب | إيه اللي بتتحكم فيه |
|---|---|
| **عام** | الاسم، الـ Handle، المسمى الوظيفي، الصورة الشخصية، النبذة القصيرة، سطر التعليم في الـ CV |
| **الرئيسية** | عنوان الـ Hero، والشارات الصغيرة (Chips) |
| **المشاريع** | إضافة / تعديل / حذف / ترتيب المشاريع، النوع (Flutter أو Web)، صورة المشروع، رابط الـ Demo، صفحة التفاصيل، وإظهاره في الرئيسية |
| **المهارات** | اللغات والـ Frameworks + الأدوات والمنصات (اسم + أيقونة) |
| **رحلتي** | القصة، المراحل (Timeline)، وقسم "فين أنا دلوقتي" |
| **الشهادات** | إضافة / حذف / ترتيب الشهادات بصورها |
| **التواصل** | روابط التواصل (الأساسية والتانية) |

### الحفظ
- بتعدّل براحتك، وبعدين تدوس **حفظ ونشر** (زرار تحت). ده بيعمل **commit واحد** على `main` فيه كل التعديلات مع الصور.
- GitHub Actions بيبني الموقع وينشره، وبياخد دقيقة أو اتنين. حالة النشر ظاهرة فوق (**جاري النشر… / الموقع محدّث**).
- كل حفظ ليه commit بإسم `dashboard: update …` في تاريخ الريبو، يعني تقدر ترجّع أي تعديل من GitHub.
- زرار **نسخة احتياطية** بينزّل `data.json` الحالي على جهازك.
- لو `data.json` اتغيّر من مكان تاني (مثلًا عدّلته بإيدك وعملت push) بعد ما فتحت اللوحة، هترفض تكتب فوقه وتقولك. اعمل خروج ودخول عشان تحمّل آخر نسخة.

### الصور
- بتختار الصورة من جهازك. لو كبيرة (أكتر من حوالي 300KB) بتتصغّر وتتحوّل WebP تلقائيًا في المتصفح قبل الرفع.
- صور المشاريع بتتحط في `public/projects/`، والشهادات في `public/certificates/`، والصورة الشخصية في `public/profile/`.
- لما تحذف شهادة أو تبدّل صورة، الصورة القديمة بتتمسح من الريبو في نفس الـ commit (لو مش مستخدمة في حتة تانية).

---

## 2) إعداد GitHub Pages (مرة واحدة)

الـ workflow في `.github/workflows/deploy.yml` بيبني الموقع **وبينشره**. علشان يشتغل:

**Settings ← Pages ← Build and deployment ← Source ← اختار `GitHub Actions`.**

> لو الـ Source فضل على *Deploy from a branch*، GitHub هيحاول يبني الريبو بـ Jekyll ويفشل (هتلاقي "pages build and deployment" بتفشل في تاب Actions)،
> والموقع المبني بـ Astro مش هيتنشر.

لو عملت push للـ workflow ورفض بسبب `workflow` scope، عدّل الملف من موقع GitHub مباشرة أو استخدم SSH.

---

## 3) شكل `data.json` (لو حبيت تعدّله بإيدك)

```text
name, handle, role, profilePicture
hero            { eyebrow, titleBefore, titleAccent, titleAfter, chips[] }   // {projects} = عدد المشاريع
cv              { education }
aboutMe         { lede, story, timeline[ {stage,title,desc} ], radar{confident[],learning[],exploring[]} }
skills          { languages[ {name,icon} ], tools[ {name,icon} ] }
socialLinks     { primary[ {name,url,icon} ], more[ … ] }                     // الإيميل: "mailto:…" واسمه Email
projects[]      { slug, name, category: "flutter" | "web", tagline, description, status,
                  coverIcon, coverTone: "rose" | "gold", image, tech[], featured, links{demo},
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
