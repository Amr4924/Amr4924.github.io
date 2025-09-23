const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const USERNAME = 'Amr4924';

export async function GET({ request }) {
  if (!GITHUB_TOKEN) {
    console.error("Server Error: GITHUB_TOKEN is not configured.");
    return new Response(JSON.stringify({ message: 'Server configuration error: GitHub token is missing.' }), { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const repoName = requestUrl.searchParams.get('repo');
  const filePath = requestUrl.searchParams.get('path');

  if (!repoName) {
    return new Response(JSON.stringify({ message: 'Repo name is required' }), { status: 400 });
  }

  const contentsUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/contents${filePath ? `/${filePath}` : ''}`;
  
  try {
    const response = await fetch(contentsUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Astro-Portfolio-App'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      const status = response.status;
      let message = `GitHub API responded with ${status}: ${errorData.message}`;
      if (status === 401) {
        message = "GitHub API Authorization Failed. Check if the GITHUB_TOKEN is correct and has repo access.";
      } else if (status === 404) {
        message = "Repository or file not found on GitHub.";
      }
      console.error("GitHub API Error:", message);
      throw new Error(message);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Server-side fetch error:", error.message);
    return new Response(JSON.stringify({ message: error.message || 'Failed to fetch from GitHub' }), { status: 500 });
  }
}