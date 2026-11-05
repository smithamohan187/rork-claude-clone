const { Storage } = require('@google-cloud/storage');
const { AppError } = require('../middleware/errorHandler');

const storage = new Storage();
const bucketName =
	process.env.GCS_BUCKET_NAME || 'touchpoints-app-uploads';
const bucket = storage.bucket(bucketName);

async function uploadFileToGCS(file, folder, options = {}) {
	if (!file.buffer || file.buffer.length === 0) {
		throw new AppError('Uploaded file is empty or corrupted.', 400);
	}
	const filename = `${folder}/${Date.now()}-${file.originalname}`;
	const blob = bucket.file(filename);
	const blobStream = blob.createWriteStream({
		resumable: options.resumable ?? false,
		contentType: file.mimetype,
	});

	return new Promise((resolve, reject) => {
		blobStream.on('error', reject);
		blobStream.on('finish', () => {
			const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
			resolve(publicUrl);
		});

		blobStream.end(file.buffer);
	});
}

module.exports = { uploadFileToGCS };
