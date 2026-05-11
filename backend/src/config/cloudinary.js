import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder path
 * @param {string} resourceType - "image" | "raw" | "auto"
 * @returns {Promise<{fileUrl, publicId, thumbnailUrl}>}
 */
export const uploadToCloudinary = (buffer, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        allowed_formats: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl: result.resource_type === "image"
            ? cloudinary.url(result.public_id, { width: 200, height: 200, crop: "fill", format: "jpg" })
            : "",
          fileSize: result.bytes,
          mimeType: result.format,
        });
      }
    );

    // Convert buffer to readable stream and pipe into Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary using its public ID.
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - "image" | "raw"
 */
export const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
