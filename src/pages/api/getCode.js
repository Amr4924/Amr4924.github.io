// هذا الكود يعمل على السيرفر، لذلك هو آمن
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const USERNAME = 'Amr4924';

export async function GET({ url }) {
  // الحصول على اسم المستودع من الرابط
  const repoName = url.searchParams.get('repo');
  
  if (!repoName) {
    return new Response(JSON.stringify({ message: 'Repo name is required' }), { status: 400 });
  }
  
  const contentsUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/contents`;
  
  try {
    const response = await fetch(contentsUrl, {
      headers: {
        // استخدام التوكن لتوثيق الطلب
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
        console.error("GitHub API Error:", await response.text());
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // إرجاع البيانات إلى المتصفح
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Server-side fetch error:", error);
    return new Response(JSON.stringify({ message: 'Failed to fetch repo contents' }), { status: 500 });
  }
}