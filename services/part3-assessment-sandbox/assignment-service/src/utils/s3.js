const AWS = require('aws-sdk');

const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin_secure';

const s3 = new AWS.S3({
  endpoint: `http://${minioEndpoint}:9000`,
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  s3ForcePathStyle: true, // Needed for MinIO compatibility
  signatureVersion: 'v4',
});

/**
 * Ensure tenant-isolated bucket exists
 */
async function ensureBucketExists(bucketName) {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`[MinIO] Bucket ${bucketName} not found. Creating bucket...`);
      await s3.createBucket({ Bucket: bucketName }).promise();
    } else {
      throw error;
    }
  }
}

/**
 * Upload file to S3
 */
async function uploadFile(tenantId, fileKey, fileBuffer, mimeType) {
  const bucketName = `tenant-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
  
  await ensureBucketExists(bucketName);

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location;
}

module.exports = {
  uploadFile,
  s3,
};
