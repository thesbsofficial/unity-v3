// Photo Upload API Endpoint for Quick Builder
// Temporary upload to R2 before case submission

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const photos = formData.getAll('photos');

        // Validate
        if (!photos || photos.length === 0) {
            return Response.json({ error: 'No photos provided' }, { status: 400 });
        }

        if (photos.length > 5) {
            return Response.json({ error: 'Maximum 5 photos allowed' }, { status: 400 });
        }

        // Generate temporary upload session
        const sessionId = crypto.randomUUID();
        const uploadedFiles = [];

        for (const photo of photos) {
            // Validate file size (10MB limit)
            if (photo.size > 10 * 1024 * 1024) {
                return Response.json({
                    error: `File ${photo.name} exceeds 10MB limit`
                }, { status: 400 });
            }

            // Validate file type
            if (!photo.type.startsWith('image/')) {
                return Response.json({
                    error: `File ${photo.name} is not an image`
                }, { status: 400 });
            }

            const timestamp = Date.now();
            const filename = `${timestamp}-${photo.name}`;
            const r2Key = `temp/${sessionId}/${filename}`;

            // Upload to R2 user-uploads bucket
            await env.USER_UPLOADS.put(r2Key, photo.stream(), {
                httpMetadata: {
                    contentType: photo.type
                },
                customMetadata: {
                    originalName: photo.name,
                    uploadedAt: new Date().toISOString()
                }
            });

            uploadedFiles.push({
                filename,
                r2Key,
                size: photo.size,
                mimeType: photo.type
            });
        }

        return Response.json({
            success: true,
            sessionId,
            uploadedFiles,
            message: `${uploadedFiles.length} photo${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully`
        });

    } catch (error) {
        console.error('Photo upload error:', error);
        return Response.json({
            error: 'Upload failed',
            details: error.message
        }, { status: 500 });
    }
}
