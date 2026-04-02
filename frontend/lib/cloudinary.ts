import { auth } from './firebase';

/**
 * Uploads a file to the backend Cloudinary endpoint.
 * Requires Firebase ID token for authentication.
 * 
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
export async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('You must be logged in to upload files.');
  }

  const idToken = await user.getIdToken();
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Determine backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    xhr.open('POST', `${backendUrl}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response.secure_url);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
