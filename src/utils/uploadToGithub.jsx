import { Octokit } from '@octokit/rest'

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN,
})

const uploadToGitHub = async (base64Image, filename) => {
  // GitHub upload function
  console.log(
    'Starting GitHub upload with token present:',
    !!import.meta.env.VITE_GITHUB_TOKEN
  )

  const content = base64Image.split(',')[1]
  const path = `temp-images/${filename}`

  try {
    console.log('Attempting to check if file exists:', {
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      ref: 'main',
    })

    // Check if file exists
    let sha
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: 'livemusiclocator',
        repo: 'instabear',
        path,
        ref: 'main',
      })
      sha = data.sha
      console.log('File exists, got SHA:', sha)
    } catch (error) {
      console.log(
        'File does not exist yet (this is normal for new files):',
        error.message
      )
    }

    console.log('Preparing upload with params:', {
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      contentLength: content.length,
      hasSha: !!sha,
      branch: 'main',
    })

    // Upload file
    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      message: `Add temporary image ${filename}`,
      content,
      ...(sha && { sha }),
      branch: 'main',
    })

    console.log('Upload successful result:', {
      status: result.status,
      url: result.data?.content?.download_url,
    })

    // Generate and return the GitHub raw URL for direct image access
    const publicUrl = `https://raw.githubusercontent.com/livemusiclocator/instabear/main/${path}`
    console.log('Generated public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('Detailed GitHub upload error:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
      token: import.meta.env.VITE_GITHUB_TOKEN ? 'Present' : 'Missing',
    })
    throw new Error(`GitHub upload failed: ${error.message}`)
  }
}

export { uploadToGitHub }
