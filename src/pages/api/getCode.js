const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const USERNAME = 'Amr4924';

export async function GET({ url }) {
  // 1. طباعة رسالة عند بدء تشغيل الدالة
  console.log("--- API Route '/api/getCode' triggered ---");

  // 2. التحقق من وجود التوكن وطباعة النتيجة
  console.log(`Is GITHUB_TOKEN present? ${GITHUB_TOKEN ? 'Yes, token found.' : 'No, token NOT found. THIS IS THE PROBLEM.'}`);
  
  const repoName = url.searchParams.get('repo');
  // 3. طباعة اسم المستودع المطلوب
  console.log(`Received request for repo: ${repoName}`);
  
  if (!repoName) {
    return new Response(JSON.stringify({ message: 'Repo name is required' }), { status: 400 });
  }
  
  const contentsUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/contents`;
  // 4. طباعة الرابط الذي سنطلب منه البيانات
  console.log(`Fetching from URL: ${contentsUrl}`);
  
  try {
    const response = await fetch(contentsUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    // 5. طباعة حالة الرد من GitHub
    console.log(`GitHub API response status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        // 6. في حالة الخطأ، طباعة تفاصيل الخطأ من GitHub
        console.error("GitHub API Error details:", errorText);
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // 7. في حالة النجاح، طباعة رسالة نجاح
    console.log("Successfully fetched and returning data to client.");
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // 8. طباعة أي خطأ يحدث داخل الدالة
    console.error("Error inside API route catch block:", error.message);
    return new Response(JSON.stringify({ message: 'Failed to fetch repo contents' }), { status: 500 });
  }
}