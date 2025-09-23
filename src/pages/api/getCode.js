const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const USERNAME = 'Amr4924';

export async function GET({ url }) {
  const repoName = url.searchParams.get('repo');
  const filePath = url.searchParams.get('path'); // פרמטר חדש לקבלת נתיב קובץ

  if (!repoName) {
    return new Response(JSON.stringify({ message: 'Repo name is required' }), { status: 400 });
  }

  // אם סופק נתיב קובץ, נביא את תוכן הקובץ. אחרת, נביא את רשימת הקבצים.
  const contentsUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/contents${filePath ? `/${filePath}` : ''}`;
  
  try {
    const response = await fetch(contentsUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Server-side fetch error:", error);
    return new Response(JSON.stringify({ message: 'Failed to fetch from GitHub' }), { status: 500 });
  }
}